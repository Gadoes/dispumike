/**
 * McpClientManager — singleton that manages stdio child-process MCP servers.
 *
 * Spec: Section 5, Chunk 1 (Lazy-spawn, idle TTL, queue, reconnect, dispose).
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
  McpServerConfig,
  McpServerState,
  McpServerStatus,
  McpToolDefinition,
  McpToolResult,
  McpThrottledError,
  McpUnavailableError,
  McpCallResult,
  McpHealthResult,
} from "./types.js";

/** Max queued requests per server before rejecting with "throttled". */
const MAX_QUEUE_DEPTH = 10;

/** Idle TTL in milliseconds (15 minutes). */
const IDLE_TTL_MS = 15 * 60 * 1000;

/** Max consecutive reconnect attempts before marking permanently_failed. */
const MAX_RECONNECT_ATTEMPTS = 3;

/** Reconnect backoff base in milliseconds. */
const RECONNECT_BASE_MS = 500;

export class McpClientManager {
  private static instance: McpClientManager | null = null;

  private servers: Map<string, McpServerState> = new Map();

  private constructor(configs: McpServerConfig[]) {
    for (const config of configs) {
      this.servers.set(config.name, {
        config,
        status: "cold",
        failureCount: 0,
        client: null,
        transport: null,
        idleTimer: null,
        queueDepth: 0,
      });
    }
  }

  /**
   * Initialize (or replace) the singleton with a set of server configs.
   * Calling this again disposes the old singleton first.
   */
  static async init(configs: McpServerConfig[]): Promise<McpClientManager> {
    if (McpClientManager.instance) {
      await McpClientManager.instance.dispose();
    }
    McpClientManager.instance = new McpClientManager(configs);
    return McpClientManager.instance;
  }

  /** Get the existing singleton (throws if not initialized). */
  static getInstance(): McpClientManager {
    if (!McpClientManager.instance) {
      throw new Error(
        "McpClientManager not initialized — call McpClientManager.init() first"
      );
    }
    return McpClientManager.instance;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /** List tools for a named server. Spawns the server if cold. */
  async listTools(serverName: string): Promise<McpToolDefinition[]> {
    const state = this.requireState(serverName);
    if (state.status === "permanently_failed") {
      return []; // treat as unavailable
    }
    await this.ensureWarm(serverName);
    this.resetIdleTimer(serverName);
    const result = await state.client!.listTools();
    return result.tools.map((t) => ({
      name: t.name,
      description: t.description ?? "",
      inputSchema: (t.inputSchema as Record<string, unknown>) ?? {},
    }));
  }

  /** Call a tool on a named server. Spawns the server if cold. */
  async callTool(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<McpCallResult> {
    const state = this.requireState(serverName);

    if (state.status === "permanently_failed") {
      return this.unavailableError(serverName, "permanently_failed");
    }

    if (state.queueDepth >= MAX_QUEUE_DEPTH) {
      return this.throttledError(serverName);
    }

    state.queueDepth += 1;
    try {
      await this.ensureWarm(serverName);
    } catch (err) {
      state.queueDepth -= 1;
      // Re-read status — may have changed to permanently_failed inside ensureWarm
      const currentStatus = (state as McpServerState).status;
      if (currentStatus === "permanently_failed") {
        return this.unavailableError(serverName, "permanently_failed");
      }
      return this.unavailableError(serverName, err instanceof Error ? err.message : String(err));
    }
    try {
      this.resetIdleTimer(serverName);
      const raw = await state.client!.callTool({ name: toolName, arguments: args });
      return raw as McpToolResult;
    } finally {
      state.queueDepth -= 1;
    }
  }

  /** Ping the server to check health. Spawns it if cold. */
  async healthCheck(serverName: string): Promise<McpHealthResult> {
    const state = this.requireState(serverName);
    if (state.status === "permanently_failed") {
      return { ok: false, status: "permanently_failed", error: "Server permanently failed" };
    }
    try {
      await this.ensureWarm(serverName);
      this.resetIdleTimer(serverName);
      // Ping by listing tools — lightweight and validates connectivity
      await state.client!.listTools();
      return { ok: true, status: (state as McpServerState).status };
    } catch {
      const currentStatus = (state as McpServerState).status;
      return {
        ok: false,
        status: currentStatus,
        error: currentStatus === "permanently_failed"
          ? "Server permanently failed"
          : "Health check failed",
      };
    }
  }

  /**
   * Kill all running child processes. Call on SIGTERM/SIGINT.
   * After dispose(), the singleton is cleared; callers must re-init.
   */
  async dispose(): Promise<void> {
    const names = Array.from(this.servers.keys());
    await Promise.allSettled(names.map((n) => this.killServer(n)));
    McpClientManager.instance = null;
  }

  // ---------------------------------------------------------------------------
  // Internal lifecycle helpers
  // ---------------------------------------------------------------------------

  private requireState(serverName: string): McpServerState {
    const state = this.servers.get(serverName);
    if (!state) {
      throw new Error(`Unknown MCP server: "${serverName}"`);
    }
    return state;
  }

  /**
   * Ensure the server is warm (running and connected).
   * If cold or stopped, spawns and connects. Waits if currently spawning.
   */
  private async ensureWarm(serverName: string): Promise<void> {
    const state = this.requireState(serverName);
    if (state.status === "warm") return;
    if (state.status === "permanently_failed") {
      throw new Error(`Server "${serverName}" is permanently failed`);
    }
    await this.spawnServer(serverName);
  }

  /**
   * Spawn and connect a new MCP child process for the given server.
   * Handles reconnect logic with exponential backoff.
   */
  private async spawnServer(serverName: string): Promise<void> {
    const state = this.requireState(serverName);
    state.status = "spawning";

    const { command, args, env } = state.config;

    const transport = new StdioClientTransport({
      command,
      args,
      env: env ? { ...process.env, ...env } as Record<string, string> : undefined,
      stderr: "pipe",
    });

    const client = new Client(
      { name: "mcp-client-manager", version: "1.0.0" },
      { capabilities: {} }
    );

    try {
      await client.connect(transport);

      state.client = client;
      state.transport = transport;
      state.status = "warm";
      state.failureCount = 0;

      // Listen for unexpected close/error to trigger reconnect
      transport.onclose = () => this.handleUnexpectedClose(serverName);
      transport.onerror = (err) => {
        console.error(`[McpClientManager] Transport error on "${serverName}":`, err);
        this.handleUnexpectedClose(serverName);
      };

      this.resetIdleTimer(serverName);
    } catch (err) {
      state.client = null;
      state.transport = null;
      state.failureCount += 1;

      if (state.failureCount >= MAX_RECONNECT_ATTEMPTS) {
        state.status = "permanently_failed";
        console.error(
          `[McpClientManager] Server "${serverName}" permanently failed after ${MAX_RECONNECT_ATTEMPTS} attempts`
        );
        throw new Error(
          `Server "${serverName}" permanently failed: ${err instanceof Error ? err.message : err}`
        );
      }

      // Exponential backoff before retrying
      const delay = RECONNECT_BASE_MS * Math.pow(2, state.failureCount - 1);
      state.status = "reconnecting";
      console.warn(
        `[McpClientManager] Spawn failed for "${serverName}" (attempt ${state.failureCount}); retrying in ${delay}ms`
      );
      await new Promise<void>((resolve) => setTimeout(resolve, delay));
      await this.spawnServer(serverName);
    }
  }

  /**
   * Called when the child process closes unexpectedly while warm.
   * Marks server as cold so the next request triggers a fresh spawn.
   */
  private handleUnexpectedClose(serverName: string): void {
    const state = this.servers.get(serverName);
    if (!state || state.status !== "warm") return;

    console.warn(`[McpClientManager] Server "${serverName}" closed unexpectedly`);
    state.client = null;
    state.transport = null;
    state.status = "cold";
    this.clearIdleTimer(serverName);
    // Increment failure count so reconnect logic tracks this
    state.failureCount += 1;
    if (state.failureCount >= MAX_RECONNECT_ATTEMPTS) {
      state.status = "permanently_failed";
      console.error(`[McpClientManager] Server "${serverName}" marked permanently_failed`);
    }
  }

  /** Reset the idle TTL timer for a server. */
  private resetIdleTimer(serverName: string): void {
    const state = this.servers.get(serverName);
    if (!state) return;
    this.clearIdleTimer(serverName);
    state.idleTimer = setTimeout(() => {
      this.killServer(serverName).catch(() => {});
    }, IDLE_TTL_MS);
  }

  /** Clear the idle timer without killing the server. */
  private clearIdleTimer(serverName: string): void {
    const state = this.servers.get(serverName);
    if (!state || !state.idleTimer) return;
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }

  /** Kill and dispose a running server; mark it cold. */
  private async killServer(serverName: string): Promise<void> {
    const state = this.servers.get(serverName);
    if (!state) return;
    this.clearIdleTimer(serverName);
    if (state.client) {
      try {
        await state.client.close();
      } catch {
        // ignore close errors during disposal
      }
    }
    state.client = null;
    state.transport = null;
    // Only reset status if not permanently failed
    if (state.status !== "permanently_failed") {
      state.status = "cold";
    }
  }

  // ---------------------------------------------------------------------------
  // Error helpers
  // ---------------------------------------------------------------------------

  private throttledError(serverName: string): McpThrottledError {
    return { error: "throttled", source: serverName };
  }

  private unavailableError(serverName: string, reason: string): McpUnavailableError {
    return { error: "source_unavailable", source: serverName, reason };
  }
}
