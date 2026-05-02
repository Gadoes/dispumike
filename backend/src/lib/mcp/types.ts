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

// ---------------------------------------------------------------------------
// Citation types — Chunk 4
// ---------------------------------------------------------------------------

/**
 * Liveness status for a citation URL.
 * 'verified' and 'unverified' are reserved for the hallucination council
 * (Feature 2 of roadmap) and must NOT be used here.
 */
export type CitationLivenessStatus = "unchecked" | "live" | "unreachable";

/** Valid source types for MCP citations. */
export type CitationSourceType =
  | "courtlistener"
  | "eurlex"
  | "al-meezan"
  | "govinfo"
  | "italaw"
  | "icsid";

/**
 * A citation from an MCP tool result.
 * Matches the `citations` Supabase table schema (Section 3).
 */
export interface Citation {
  /** DB row UUID — present after storage. */
  id?: string;
  /** User who performed the query. */
  user_id: string;
  /** chat_messages row this citation is linked to. */
  chat_message_id?: string | null;
  /** Source identifier (e.g. 'courtlistener'). */
  source_type: CitationSourceType;
  /** Canonical ID in the source (e.g. CL opinion ID, CELEX number). */
  source_id?: string | null;
  /** URL to the source document. */
  url: string;
  /** Display title of the cited document. */
  title?: string | null;
  /** Verbatim excerpt ≤500 chars. */
  excerpt?: string | null;
  /** Liveness check status. Default: 'unchecked'. */
  liveness_status: CitationLivenessStatus;
  /** When the citation was retrieved. */
  retrieved_at?: string;
}

/**
 * Raw MCP tool result for a single result entry (shape varies by source type).
 * Parsers map this to a Citation.
 */
export type RawMcpResult = Record<string, unknown>;
