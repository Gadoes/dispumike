/**
 * TypeScript types for the MCP host plumbing layer.
 * Spec: Section 5, Chunk 1.
 */

/** Configuration for a single MCP server entry. */
export interface McpServerConfig {
  /** Unique name used as the server identifier (e.g. "filesystem", "courtlistener"). */
  name: string;
  /** The executable command to spawn (e.g. "node"). */
  command: string;
  /** Arguments passed to the command (e.g. ["/path/to/server.js", "/allowed/dir"]). */
  args: string[];
  /** Optional additional environment variables for the child process. */
  env?: Record<string, string>;
}

/** Normalized tool definition returned from listTools(). */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/** Possible lifecycle states for a managed MCP server. */
export type McpServerStatus =
  | "cold" // never spawned or after idle disposal
  | "spawning" // currently being spawned
  | "warm" // running and ready
  | "reconnecting" // crashed, attempting reconnect
  | "permanently_failed"; // 3 consecutive spawn failures; skip all requests

/** Per-server managed state kept by McpClientManager. */
export interface McpServerState {
  config: McpServerConfig;
  status: McpServerStatus;
  /** Number of consecutive failed spawn/reconnect attempts. */
  failureCount: number;
  /** Active client instance when status === 'warm'. */
  client: import("@modelcontextprotocol/sdk/client/index.js").Client | null;
  /** Active transport instance when status === 'warm'. */
  transport: import("@modelcontextprotocol/sdk/client/stdio.js").StdioClientTransport | null;
  /** Timer that fires after idle TTL to dispose the process. */
  idleTimer: ReturnType<typeof setTimeout> | null;
  /** Pending request count for queue tracking. */
  queueDepth: number;
}

/** Successful tool call result. */
export interface McpToolResult {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

/** Throttled error returned when queue is full. */
export interface McpThrottledError {
  error: "throttled";
  source: string;
}

/** Source unavailable error returned when server is permanently failed. */
export interface McpUnavailableError {
  error: "source_unavailable";
  source: string;
  reason: string;
}

export type McpCallResult = McpToolResult | McpThrottledError | McpUnavailableError;

/** Health check response. */
export interface McpHealthResult {
  ok: boolean;
  status: McpServerStatus;
  error?: string;
}
