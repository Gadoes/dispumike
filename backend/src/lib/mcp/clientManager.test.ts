/**
 * Tests for McpClientManager (Chunk 1).
 * Uses Vitest fake timers for idle TTL and reconnect timing.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { McpServerConfig } from "./types.js";

// ---------------------------------------------------------------------------
// Mock the MCP SDK so tests never spawn real processes
// ---------------------------------------------------------------------------

const mockListTools = vi.fn();
const mockCallTool = vi.fn();
const mockClose = vi.fn();
const mockConnect = vi.fn();

// We'll capture the transport callbacks so tests can trigger close/error
let capturedOnClose: (() => void) | undefined;
let capturedOnError: ((err: Error) => void) | undefined;

vi.mock("@modelcontextprotocol/sdk/client/index.js", () => {
  class MockClient {
    connect = mockConnect;
    listTools = mockListTools;
    callTool = mockCallTool;
    close = mockClose;
  }
  return { Client: MockClient };
});

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => {
  class MockStdioClientTransport {
    get onclose() { return capturedOnClose; }
    set onclose(fn: (() => void) | undefined) { capturedOnClose = fn; }
    get onerror() { return capturedOnError; }
    set onerror(fn: ((err: Error) => void) | undefined) { capturedOnError = fn; }
  }
  return { StdioClientTransport: MockStdioClientTransport };
});

// Import AFTER mocks are set up
import { McpClientManager } from "./clientManager.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FILESYSTEM_CONFIG: McpServerConfig = {
  name: "testserver",
  command: "node",
  args: ["/fake/server.js"],
};

function makeManager(configs: McpServerConfig[] = [FILESYSTEM_CONFIG]) {
  // Reset the singleton before each manager creation
  return McpClientManager.init(configs);
}

const TOOL_DEFINITIONS = {
  tools: [
    {
      name: "list_directory",
      description: "List files",
      inputSchema: { type: "object", properties: {} },
    },
  ],
};

const TOOL_RESULT = {
  content: [{ type: "text", text: "[FILE] foo.ts" }],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("McpClientManager", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    capturedOnClose = undefined;
    capturedOnError = undefined;
    mockConnect.mockResolvedValue(undefined);
    mockListTools.mockResolvedValue(TOOL_DEFINITIONS);
    mockCallTool.mockResolvedValue(TOOL_RESULT);
    mockClose.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    // resetAllMocks clears both call history AND queued mockImplementationOnce entries,
    // preventing stale hanging promises from leaking into the next test.
    vi.resetAllMocks();
    vi.useRealTimers();
    // Clean up singleton after restoring real timers
    try {
      const mgr = McpClientManager.getInstance();
      await mgr.dispose();
    } catch {
      // already disposed or not initialized
    }
  });

  // -------------------------------------------------------------------------
  it("cold-start: first callTool() triggers spawn; listTools() returns tools", async () => {
    const mgr = await makeManager();

    // Verify not yet spawned
    expect(mockConnect).not.toHaveBeenCalled();

    // First listTools — should trigger spawn
    const tools = await mgr.listTools("testserver");

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe("list_directory");

    // First callTool — should NOT re-spawn (already warm)
    const result = await mgr.callTool("testserver", "list_directory", { path: "/" });
    expect(mockConnect).toHaveBeenCalledTimes(1); // still just 1
    expect(result).toMatchObject({ content: [{ type: "text", text: "[FILE] foo.ts" }] });
  });

  // -------------------------------------------------------------------------
  it("warm reuse: second call within idle TTL does not re-spawn", async () => {
    const mgr = await makeManager();

    await mgr.callTool("testserver", "list_directory", { path: "/" });
    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Advance time but stay within idle TTL (14 min < 15 min)
    vi.advanceTimersByTime(14 * 60 * 1000);

    await mgr.callTool("testserver", "list_directory", { path: "/" });
    expect(mockConnect).toHaveBeenCalledTimes(1); // no re-spawn
  });

  // -------------------------------------------------------------------------
  it("idle disposal: after TTL expires, process is disposed", async () => {
    const mgr = await makeManager();

    await mgr.callTool("testserver", "list_directory", { path: "/" });
    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Advance past the idle TTL
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000 + 100);

    // close() should have been called by the idle timer
    expect(mockClose).toHaveBeenCalled();

    // Next call re-spawns
    await mgr.callTool("testserver", "list_directory", { path: "/" });
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  it("reconnect fires after unexpected child process exit", async () => {
    const mgr = await makeManager();

    // Warm up the server
    await mgr.listTools("testserver");
    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Simulate unexpected close — triggers via transport.onclose
    capturedOnClose?.();

    // Server should be cold now; next call spawns fresh
    await mgr.callTool("testserver", "list_directory", { path: "/" });
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  it("permanently_failed after 3 reconnect failures; subsequent calls return source_unavailable", async () => {
    const mgr = await makeManager();

    // Make connect always fail
    mockConnect.mockRejectedValue(new Error("spawn failed"));

    // The spawnServer tries up to 3 times with backoff
    const promise = mgr.callTool("testserver", "list_directory", { path: "/" });

    // Advance timers to exhaust reconnect backoff delays (500ms + 1000ms)
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toMatchObject({
      error: "source_unavailable",
      source: "testserver",
      reason: "permanently_failed",
    });
  });

  // -------------------------------------------------------------------------
  it("queue-full returns throttle error without spawning more processes", async () => {
    const mgr = await makeManager();

    // Directly set queueDepth to MAX to simulate a full queue
    // (queue-depth check happens before ensureWarm, so no spawn occurs)
    const state = (mgr as unknown as { servers: Map<string, { queueDepth: number }> })
      .servers.get("testserver")!;
    state.queueDepth = 10;

    const result = await mgr.callTool("testserver", "list_directory", { path: "/" });
    expect(result).toMatchObject({ error: "throttled", source: "testserver" });

    // Restore for cleanup
    state.queueDepth = 0;
    expect(mockConnect).not.toHaveBeenCalled(); // no spawn attempted
  });

  // -------------------------------------------------------------------------
  it("dispose() kills all running processes", async () => {
    const mgr = await makeManager([
      FILESYSTEM_CONFIG,
      { name: "server2", command: "node", args: ["/fake/server2.js"] },
    ]);

    // Warm up both servers
    await mgr.listTools("testserver");
    await mgr.listTools("server2");
    expect(mockConnect).toHaveBeenCalledTimes(2);

    await mgr.dispose();

    // close() should have been called for both servers
    expect(mockClose).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  it("healthCheck: returns ok when server is warm", async () => {
    const mgr = await makeManager();
    const result = await mgr.healthCheck("testserver");
    expect(result.ok).toBe(true);
    expect(result.status).toBe("warm");
  });

  // -------------------------------------------------------------------------
  it("healthCheck: returns error for permanently_failed server", async () => {
    const mgr = await makeManager();

    // Force permanently_failed state
    mockConnect.mockRejectedValue(new Error("dead"));
    const callPromise = mgr.callTool("testserver", "list_directory", {});
    await vi.runAllTimersAsync();
    await callPromise;

    const result = await mgr.healthCheck("testserver");
    expect(result.ok).toBe(false);
    expect(result.status).toBe("permanently_failed");
  });

  // -------------------------------------------------------------------------
  it("throws for unknown server name", async () => {
    const mgr = await makeManager();
    await expect(mgr.listTools("nonexistent")).rejects.toThrow('Unknown MCP server: "nonexistent"');
  });
});
