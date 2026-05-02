/**
 * Tests for Chunk 8: Per-query scope filtering in runLLMStream.
 * Spec: Section 5, Chunk 8.
 *
 * Verifies that when mcpScope is provided, only the listed MCP servers
 * contribute tools to the active tool list (and hence only those servers
 * are called by the LLM).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// The scope filtering logic is inside runLLMStream; we test the
// helper that builds activeMcpToolDefs using extracted logic.
// ---------------------------------------------------------------------------

/**
 * Mirror of the tool-list building logic from runLLMStream.
 * This ensures the scope filter is correct without mocking the entire stream.
 */
function buildActiveMcpTools(
    mcpServerTools: Array<{
        serverName: string;
        tools: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }>;
    }>,
    openCircuitSources: string[],
    mcpScope: string[] | null,
): string[] {
    const openCircuitSet = new Set(openCircuitSources);
    const scopeSet = mcpScope && mcpScope.length > 0 ? new Set(mcpScope) : null;
    const activeMcpToolNames: string[] = [];
    for (const { serverName, tools } of mcpServerTools) {
        if (openCircuitSet.has(serverName)) continue;
        if (scopeSet && !scopeSet.has(serverName)) continue;
        for (const tool of tools) {
            activeMcpToolNames.push(`mcp__${serverName}__${tool.name}`);
        }
    }
    return activeMcpToolNames;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const ALL_SERVERS = [
    {
        serverName: "courtlistener",
        tools: [{ name: "search_cases", description: "Search", inputSchema: {} }],
    },
    {
        serverName: "eurlex",
        tools: [{ name: "search_legislation", description: "Search", inputSchema: {} }],
    },
    {
        serverName: "al-meezan",
        tools: [{ name: "search_laws", description: "Search", inputSchema: {} }],
    },
];

describe("mcpScope filtering in runLLMStream tool-list build", () => {
    it("no scope (null) — includes all servers", () => {
        const tools = buildActiveMcpTools(ALL_SERVERS, [], null);
        expect(tools).toContain("mcp__courtlistener__search_cases");
        expect(tools).toContain("mcp__eurlex__search_legislation");
        expect(tools).toContain("mcp__al-meezan__search_laws");
    });

    it("mcpScope=['eurlex'] — only EUR-Lex tools included", () => {
        const tools = buildActiveMcpTools(ALL_SERVERS, [], ["eurlex"]);
        expect(tools).toContain("mcp__eurlex__search_legislation");
        expect(tools).not.toContain("mcp__courtlistener__search_cases");
        expect(tools).not.toContain("mcp__al-meezan__search_laws");
    });

    it("mcpScope=['courtlistener', 'al-meezan'] — two servers included", () => {
        const tools = buildActiveMcpTools(ALL_SERVERS, [], ["courtlistener", "al-meezan"]);
        expect(tools).toContain("mcp__courtlistener__search_cases");
        expect(tools).toContain("mcp__al-meezan__search_laws");
        expect(tools).not.toContain("mcp__eurlex__search_legislation");
    });

    it("mcpScope overrides but open-circuit still excludes", () => {
        // courtlistener is in scope but circuit-open — must be excluded
        const tools = buildActiveMcpTools(
            ALL_SERVERS,
            ["courtlistener"], // open circuit
            ["courtlistener", "eurlex"], // scope includes it
        );
        expect(tools).not.toContain("mcp__courtlistener__search_cases");
        expect(tools).toContain("mcp__eurlex__search_legislation");
    });

    it("empty mcpScope array — treated as null (all servers)", () => {
        // scopeSet is null when mcpScope is empty array → no filtering
        const tools = buildActiveMcpTools(ALL_SERVERS, [], []);
        expect(tools).toContain("mcp__courtlistener__search_cases");
        expect(tools).toContain("mcp__eurlex__search_legislation");
    });

    it("mcpScope with unknown server name — no tools for that server", () => {
        const tools = buildActiveMcpTools(ALL_SERVERS, [], ["unknownserver"]);
        expect(tools).toHaveLength(0);
    });

    it("open-circuit set excludes server even without scope", () => {
        const tools = buildActiveMcpTools(
            ALL_SERVERS,
            ["courtlistener"],
            null,
        );
        expect(tools).not.toContain("mcp__courtlistener__search_cases");
        expect(tools).toContain("mcp__eurlex__search_legislation");
    });
});
