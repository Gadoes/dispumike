/**
 * CourtListener integration tests — Chunk 10.
 * Spec: Section 4.1, Chunk 10.
 *
 * Uses the InMemoryTransport mock server (from mockMcpServer.ts) to simulate
 * CourtListener MCP responses without spawning a real child process.
 *
 * Fixture data: src/__fixtures__/courtlistener/
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { createMockMcpServer } from "../../__mocks__/mockMcpServer.js";
import { parseMcpResultToCitations } from "./citationParser.js";
import {
    buildCourtListenerConfig,
    isValidCourtListenerKey,
    COURTLISTENER_SYSTEM_PROMPT,
} from "./servers/courtlistener.js";
import searchFixture from "../../__fixtures__/courtlistener/search-results.json";
import emptyFixture from "../../__fixtures__/courtlistener/empty-results.json";

const USER_ID = "user-test-cl";

afterEach(async () => {
    try {
        const { McpClientManager } = await import("./clientManager.js");
        const instance = McpClientManager.getInstance();
        if (instance) await instance.dispose();
    } catch {
        // No instance to clean up — that's fine
    }
});

// ---------------------------------------------------------------------------
// Config tests
// ---------------------------------------------------------------------------

describe("buildCourtListenerConfig", () => {
    it("includes API key in env when provided", () => {
        const config = buildCourtListenerConfig("my-api-key");
        expect(config.env?.COURTLISTENER_API_KEY).toBe("my-api-key");
    });

    it("omits COURTLISTENER_API_KEY from env when null", () => {
        const config = buildCourtListenerConfig(null);
        expect(config.env?.COURTLISTENER_API_KEY).toBeUndefined();
    });

    it("server name is 'courtlistener'", () => {
        const config = buildCourtListenerConfig("key");
        expect(config.name).toBe("courtlistener");
    });
});

describe("isValidCourtListenerKey", () => {
    it("returns true for non-empty string", () => {
        expect(isValidCourtListenerKey("valid-key")).toBe(true);
    });

    it("returns false for null", () => {
        expect(isValidCourtListenerKey(null)).toBe(false);
    });

    it("returns false for empty string", () => {
        expect(isValidCourtListenerKey("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
        expect(isValidCourtListenerKey("   ")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Citation parser tests using fixture data
// ---------------------------------------------------------------------------

describe("CourtListener citation parsing (fixture data)", () => {
    it("parses 3 citations from fixture search results", () => {
        const fixtureBlob = JSON.stringify(searchFixture);
        const citations = parseMcpResultToCitations("courtlistener", fixtureBlob, USER_ID);
        expect(citations).toHaveLength(3);
    });

    it("maps source_type correctly", () => {
        const citations = parseMcpResultToCitations(
            "courtlistener",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].source_type).toBe("courtlistener");
    });

    it("maps case_name to title", () => {
        const citations = parseMcpResultToCitations(
            "courtlistener",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].title).toBe("Smith v. Jones Energy Corp.");
    });

    it("maps url field correctly (courtlistener.com URL)", () => {
        const citations = parseMcpResultToCitations(
            "courtlistener",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].url).toBe(
            "https://www.courtlistener.com/opinion/12345/smith-v-jones-energy-corp/",
        );
    });

    it("maps snippet to excerpt", () => {
        const citations = parseMcpResultToCitations(
            "courtlistener",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].excerpt).toContain("ISDS");
    });

    it("maps id to source_id", () => {
        const citations = parseMcpResultToCitations(
            "courtlistener",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].source_id).toBe("12345");
    });

    it("liveness_status defaults to 'unchecked'", () => {
        const citations = parseMcpResultToCitations(
            "courtlistener",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].liveness_status).toBe("unchecked");
    });

    it("returns empty array for empty results fixture", () => {
        const citations = parseMcpResultToCitations(
            "courtlistener",
            JSON.stringify(emptyFixture),
            USER_ID,
        );
        expect(citations).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Mock MCP server integration tests
// ---------------------------------------------------------------------------

describe("CourtListener MCP server — mock integration", () => {
    it("callTool returns search results via mock server", async () => {
        const mock = await createMockMcpServer();
        // Respond with fixture data serialized as JSON text
        mock.respondWith("search_cases", {
            content: [{ type: "text", text: JSON.stringify(searchFixture) }],
        });

        const result = await mock.manager.callTool(
            "mock",
            "search_cases",
            { query: "ISDS energy disputes" },
        );

        expect("content" in result).toBe(true);
        if ("content" in result) {
            const text = result.content[0]?.text ?? "";
            const parsed = JSON.parse(text) as { results: unknown[] };
            expect(parsed.results).toHaveLength(3);
        }
        await mock.cleanup();
    });

    it("citation parser processes mock MCP tool result into citations", async () => {
        const mock = await createMockMcpServer();
        mock.respondWith("search_cases", {
            content: [{ type: "text", text: JSON.stringify(searchFixture) }],
        });

        const result = await mock.manager.callTool(
            "mock",
            "search_cases",
            { query: "energy arbitration" },
        );

        if ("content" in result) {
            const text = result.content[0]?.text ?? "";
            const citations = parseMcpResultToCitations("courtlistener", text, USER_ID);
            expect(citations).toHaveLength(3);
            expect(citations[0].url).toContain("courtlistener.com");
        }
        await mock.cleanup();
    });

    it("missing API key scenario: returns source_unavailable when server permanently fails", async () => {
        const mock = await createMockMcpServer();
        const manager = mock.manager;
        // Force the manager's mock server into permanently_failed state
        const state = (manager as unknown as {
            servers: Map<string, { status: string; failureCount: number }>;
        }).servers.get("mock");
        if (state) {
            state.status = "permanently_failed";
            state.failureCount = 3;
        }

        const result = await manager.callTool("mock", "search_cases", {});

        expect("error" in result).toBe(true);
        if ("error" in result) {
            expect(result.error).toBe("source_unavailable");
        }
        await mock.cleanup();
    });

    it("system prompt contains CourtListener citation format guidance", () => {
        expect(COURTLISTENER_SYSTEM_PROMPT).toContain("CourtListener");
        expect(COURTLISTENER_SYSTEM_PROMPT).toContain("Free Law Project");
    });
});
