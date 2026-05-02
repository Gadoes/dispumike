/**
 * EUR-Lex integration tests — Chunk 13.
 * Spec: Section 4.4.
 */

import { describe, it, expect, afterEach } from "vitest";
import { parseMcpResultToCitations } from "./citationParser.js";
import { buildEurLexConfig, EURLEX_SYSTEM_PROMPT } from "./servers/eurLex.js";
import { createMockMcpServer } from "../../__mocks__/mockMcpServer.js";
import searchFixture from "../../__fixtures__/eurlex/search-response.json";

const USER_ID = "user-test-el";

afterEach(async () => {
    try {
        const { McpClientManager } = await import("./clientManager.js");
        const instance = McpClientManager.getInstance();
        if (instance) await instance.dispose();
    } catch {
        // No instance to clean up
    }
});

// ---------------------------------------------------------------------------
// Server config
// ---------------------------------------------------------------------------

describe("buildEurLexConfig", () => {
    it("server name is 'eurlex'", () => {
        const config = buildEurLexConfig();
        expect(config.name).toBe("eurlex");
    });

    it("requires no API key (empty env)", () => {
        const config = buildEurLexConfig();
        expect(config.env).toEqual({});
    });

    it("uses eur-lex-mcp package via npx", () => {
        const config = buildEurLexConfig();
        expect(config.command).toBe("npx");
        expect(config.args).toContain("eur-lex-mcp");
    });

    it("system prompt contains attribution", () => {
        expect(EURLEX_SYSTEM_PROMPT).toContain("EUR-Lex");
        expect(EURLEX_SYSTEM_PROMPT).toContain("Publications Office");
    });
});

// ---------------------------------------------------------------------------
// Citation parsing
// ---------------------------------------------------------------------------

describe("EUR-Lex citation parsing (fixture data)", () => {
    it("parses 3 citations from fixture", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations).toHaveLength(3);
    });

    it("source_id is a valid CELEX number", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].source_id).toBe("32016R0679");
    });

    it("maps source_type to 'eurlex'", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations.every(c => c.source_type === "eurlex")).toBe(true);
    });

    it("maps title correctly", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].title).toBe("General Data Protection Regulation");
    });

    it("maps url to eur-lex.europa.eu", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].url).toContain("eur-lex.europa.eu");
    });

    it("maps excerpt", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].excerpt).toBe("processing of personal data");
    });

    it("liveness_status defaults to 'unchecked'", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].liveness_status).toBe("unchecked");
    });

    it("returns empty array for empty results", () => {
        const citations = parseMcpResultToCitations(
            "eurlex",
            JSON.stringify({ results: [] }),
            USER_ID,
        );
        expect(citations).toHaveLength(0);
    });

    it("handles malformed JSON gracefully", () => {
        const citations = parseMcpResultToCitations("eurlex", "not json", USER_ID);
        expect(citations).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// 503 error → source_unavailable
// ---------------------------------------------------------------------------

describe("EUR-Lex MCP server — mock integration", () => {
    it("server permanently failed → source_unavailable", async () => {
        const mock = await createMockMcpServer();
        const manager = mock.manager;
        const state = (manager as unknown as {
            servers: Map<string, { status: string; failureCount: number }>;
        }).servers.get("mock");
        if (state) {
            state.status = "permanently_failed";
            state.failureCount = 3;
        }

        const result = await manager.callTool("mock", "search_eurlex", {});

        expect("error" in result).toBe(true);
        if ("error" in result) {
            expect(result.error).toBe("source_unavailable");
        }
        await mock.cleanup();
    });

    it("citation parser processes mock MCP tool result into eurlex citations", async () => {
        const mock = await createMockMcpServer();
        mock.respondWith("search_eurlex", {
            content: [{ type: "text", text: JSON.stringify(searchFixture) }],
        });

        const result = await mock.manager.callTool("mock", "search_eurlex", { query: "GDPR" });

        if ("content" in result) {
            const text = result.content[0]?.text ?? "";
            const citations = parseMcpResultToCitations("eurlex", text, USER_ID);
            expect(citations).toHaveLength(3);
            expect(citations[0].source_id).toBe("32016R0679");
        }
        await mock.cleanup();
    });
});
