/**
 * In-process mock MCP server for Vitest tests.
 * Spec: Section 5, Chunk 2.
 *
 * Uses @modelcontextprotocol/sdk's InMemoryTransport + Server to create a
 * real MCP server that runs in-process without spawning child processes.
 * Tests configure scripted responses via `respondWith()`.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { McpClientManager } from "../lib/mcp/clientManager.js";
import type { McpServerConfig } from "../lib/mcp/types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MockToolResponse {
  content: Array<{ type: string; text?: string; [key: string]: unknown }>;
  isError?: boolean;
}

/**
 * A started mock MCP server + a McpClientManager wired to it.
 * Call `cleanup()` when done to close the in-memory transports.
 */
export interface MockMcpServerHandle {
  /** Configure the next response for a given tool name. */
  respondWith(toolName: string, response: MockToolResponse): void;
  /** The McpClientManager pre-wired to the mock server (server name: "mock"). */
  manager: McpClientManager;
  /** Shut down the in-memory server and dispose the manager. */
  cleanup(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Pre-defined tool catalogue (search_cases + retrieve_case)
// ---------------------------------------------------------------------------

const MOCK_TOOLS = [
  {
    name: "search_cases",
    description: "Search legal cases by keyword",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "retrieve_case",
    description: "Retrieve a specific legal case by ID",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "Case ID" },
      },
      required: ["id"],
    },
  },
];

// ---------------------------------------------------------------------------
// createMockMcpServer
// ---------------------------------------------------------------------------

/**
 * Creates a started mock MCP server + McpClientManager in a single call.
 *
 * Usage:
 * ```ts
 * const mock = await createMockMcpServer();
 * mock.respondWith("search_cases", { content: [{ type: "text", text: "result" }] });
 * const result = await mock.manager.callTool("mock", "search_cases", { query: "test" });
 * await mock.cleanup();
 * ```
 */
export async function createMockMcpServer(): Promise<MockMcpServerHandle> {
  // Map of tool name → scripted response (can be overridden per call)
  const responses = new Map<string, MockToolResponse>();

  // Default responses
  responses.set("search_cases", {
    content: [{ type: "text", text: "[]" }],
  });
  responses.set("retrieve_case", {
    content: [{ type: "text", text: "{}" }],
  });

  // Create an MCP Server instance
  const server = new Server(
    { name: "mock-mcp-server", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  // Register list-tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: MOCK_TOOLS,
  }));

  // Register call-tool handler — dispatches to scripted response
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const response = responses.get(toolName);
    if (!response) {
      return {
        content: [{ type: "text" as const, text: `Unknown tool: ${toolName}` }],
        isError: true as const,
      };
    }
    return {
      content: response.content.map((c) => ({ ...c, type: c.type as "text" | "image" | "audio" | "resource" })),
      ...(response.isError !== undefined ? { isError: response.isError } : {}),
    };
  });

  // Create linked in-memory transport pair
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();

  // Connect the server to the server-side transport
  await server.connect(serverTransport);

  // Connect the client to the client-side transport
  const client = new Client(
    { name: "mock-client", version: "1.0.0" },
    { capabilities: {} }
  );
  await client.connect(clientTransport);

  // Wire up the McpClientManager with a "virtual" config.
  // We override the internal client directly since we have an in-process connection.
  const config: McpServerConfig = {
    name: "mock",
    command: "node", // unused — we inject the client directly
    args: [],
  };

  const manager = await McpClientManager.init([config]);

  // Directly inject the warm client into the manager's internal state
  // (bypasses the spawn path for the mock)
  const managerState = (
    manager as unknown as {
      servers: Map<string, {
        status: string;
        client: Client;
        transport: unknown;
        idleTimer: ReturnType<typeof setTimeout> | null;
        failureCount: number;
        queueDepth: number;
      }>;
    }
  ).servers.get("mock")!;

  managerState.status = "warm";
  managerState.client = client;
  managerState.transport = clientTransport;
  managerState.failureCount = 0;

  return {
    respondWith(toolName: string, response: MockToolResponse) {
      responses.set(toolName, response);
    },

    manager,

    async cleanup() {
      await manager.dispose();
      await server.close();
    },
  };
}
