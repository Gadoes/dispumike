/**
 * Tests for the mock MCP server (Chunk 2).
 */

import { describe, it, expect, afterEach } from "vitest";
import { createMockMcpServer, type MockMcpServerHandle } from "./mockMcpServer.js";

describe("MockMcpServer (Chunk 2)", () => {
  let mock: MockMcpServerHandle | undefined;

  afterEach(async () => {
    if (mock) {
      await mock.cleanup();
      mock = undefined;
    }
  });

  // -------------------------------------------------------------------------
  it("returns scripted tool result via respondWith()", async () => {
    mock = await createMockMcpServer();

    const expected = {
      content: [
        {
          type: "text",
          text: JSON.stringify([
            { id: "1", case_name: "Test v. Example", url: "https://example.com" },
          ]),
        },
      ],
    };

    mock.respondWith("search_cases", expected);

    const result = await mock.manager.callTool("mock", "search_cases", {
      query: "arbitration",
    });

    expect(result).toMatchObject(expected);
  });

  // -------------------------------------------------------------------------
  it("responds correctly to listTools()", async () => {
    mock = await createMockMcpServer();

    const tools = await mock.manager.listTools("mock");

    expect(tools).toHaveLength(2);
    const names = tools.map((t) => t.name);
    expect(names).toContain("search_cases");
    expect(names).toContain("retrieve_case");

    const searchTool = tools.find((t) => t.name === "search_cases")!;
    expect(searchTool.description).toBeTruthy();
    expect(searchTool.inputSchema).toBeDefined();
  });

  // -------------------------------------------------------------------------
  it("respondWith() can be overridden multiple times", async () => {
    mock = await createMockMcpServer();

    mock.respondWith("search_cases", {
      content: [{ type: "text", text: "first" }],
    });
    const first = await mock.manager.callTool("mock", "search_cases", { query: "a" });
    expect(first).toMatchObject({ content: [{ type: "text", text: "first" }] });

    mock.respondWith("search_cases", {
      content: [{ type: "text", text: "second" }],
    });
    const second = await mock.manager.callTool("mock", "search_cases", { query: "a" });
    expect(second).toMatchObject({ content: [{ type: "text", text: "second" }] });
  });

  // -------------------------------------------------------------------------
  it("returns default empty response for unconfigured tool calls", async () => {
    mock = await createMockMcpServer();

    // Default response for search_cases is an empty array JSON
    const result = await mock.manager.callTool("mock", "search_cases", {
      query: "anything",
    });
    expect(result).toMatchObject({
      content: [{ type: "text", text: "[]" }],
    });
  });

  // -------------------------------------------------------------------------
  it("returns error response for unknown tool names", async () => {
    mock = await createMockMcpServer();

    const result = await mock.manager.callTool("mock", "nonexistent_tool", {});
    expect(result).toMatchObject({
      content: [{ type: "text", text: expect.stringContaining("Unknown tool") }],
      isError: true,
    });
  });
});
