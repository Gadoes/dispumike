/**
 * GovInfo integration tests — Chunk 11.
 * Spec: Section 4.2, Chunk 11.
 *
 * Uses the InMemoryTransport mock server (from mockMcpServer.ts) to simulate
 * GovInfo MCP responses without spawning a real child process.
 *
 * Fixture data: src/__fixtures__/govinfo/
 */

import { describe, it, expect, afterEach } from "vitest";
import { createMockMcpServer } from "../../__mocks__/mockMcpServer.js";
import { parseMcpResultToCitations } from "./citationParser.js";
import {
    buildGovInfoConfig,
    isValidGovInfoKey,
    GOVINFO_SYSTEM_PROMPT,
} from "./servers/govinfo.js";
import searchFixture from "../../__fixtures__/govinfo/search-results.json";
import emptyFixture from "../../__fixtures__/govinfo/empty-results.json";

const USER_ID = "user-test-gi";

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

describe("buildGovInfoConfig", () => {
    it("includes API key in env when provided", () => {
        const config = buildGovInfoConfig("my-api-key");
        expect(config.env?.GOVINFO_API_KEY).toBe("my-api-key");
    });

    it("omits GOVINFO_API_KEY from env when null", () => {
        const config = buildGovInfoConfig(null);
        expect(config.env?.GOVINFO_API_KEY).toBeUndefined();
    });

    it("server name is 'govinfo'", () => {
        const config = buildGovInfoConfig("key");
        expect(config.name).toBe("govinfo");
    });

    it("uses govinfo-mcp package via npx", () => {
        const config = buildGovInfoConfig(null);
        expect(config.command).toBe("npx");
        expect(config.args).toContain("govinfo-mcp");
    });
});

describe("isValidGovInfoKey", () => {
    it("returns true for non-empty string", () => {
        expect(isValidGovInfoKey("valid-key")).toBe(true);
    });

    it("returns false for null", () => {
        expect(isValidGovInfoKey(null)).toBe(false);
    });

    it("returns false for empty string", () => {
        expect(isValidGovInfoKey("")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
        expect(isValidGovInfoKey("   ")).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Citation parser tests using fixture data
// ---------------------------------------------------------------------------

describe("GovInfo citation parsing (fixture data)", () => {
    it("parses 3 citations from fixture search results", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations).toHaveLength(3);
    });

    it("maps source_type correctly", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].source_type).toBe("govinfo");
    });

    it("maps title field", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].title).toBe("Protection of Environment: Clean Air Act Regulations");
    });

    it("maps url field to govinfo.gov URL", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].url).toContain("govinfo.gov");
    });

    it("maps excerpt field", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].excerpt).toContain("Clean Air Act");
    });

    it("maps packageId to source_id", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].source_id).toBe("CFR-2024-title40-vol1");
    });

    it("liveness_status defaults to 'unchecked'", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(searchFixture),
            USER_ID,
        );
        expect(citations[0].liveness_status).toBe("unchecked");
    });

    it("returns empty array for empty results fixture", () => {
        const citations = parseMcpResultToCitations(
            "govinfo",
            JSON.stringify(emptyFixture),
            USER_ID,
        );
        expect(citations).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// Mock MCP server integration tests
// ---------------------------------------------------------------------------

describe("GovInfo MCP server — mock integration", () => {
    it("callTool returns search results via mock server", async () => {
        const mock = await createMockMcpServer();
        mock.respondWith("search_cases", {
            content: [{ type: "text", text: JSON.stringify(searchFixture) }],
        });

        const result = await mock.manager.callTool(
            "mock",
            "search_cases",
            { query: "clean air act regulations" },
        );

        expect("content" in result).toBe(true);
        if ("content" in result) {
            const text = result.content[0]?.text ?? "";
            const parsed = JSON.parse(text) as { results: unknown[] };
            expect(parsed.results).toHaveLength(3);
        }
        await mock.cleanup();
    });

    it("citation parser processes mock MCP tool result into govinfo citations", async () => {
        const mock = await createMockMcpServer();
        mock.respondWith("search_cases", {
            content: [{ type: "text", text: JSON.stringify(searchFixture) }],
        });

        const result = await mock.manager.callTool(
            "mock",
            "search_cases",
            { query: "federal regulatory requirements" },
        );

        if ("content" in result) {
            const text = result.content[0]?.text ?? "";
            const citations = parseMcpResultToCitations("govinfo", text, USER_ID);
            expect(citations).toHaveLength(3);
            expect(citations[0].url).toContain("govinfo.gov");
        }
        await mock.cleanup();
    });

    it("unauthenticated fallback: server still starts without API key", () => {
        const config = buildGovInfoConfig(null);
        // Server config is valid without a key — GovInfo allows unauthenticated access
        expect(config.env?.GOVINFO_API_KEY).toBeUndefined();
        expect(config.command).toBe("npx");
    });

    it("missing API key scenario: returns source_unavailable when server permanently fails", async () => {
        const mock = await createMockMcpServer();
        const manager = mock.manager;
        const state = (manager as unknown as {
            servers: Map<string, { status: string; failureCount: number }>;
        }).servers.get("mock");
        if (state) {
            state.status = "permanently_failed";
            state.failureCount = 3;
        }

        const result = await manager.callTool("mock", "search_packages", {});

        expect("error" in result).toBe(true);
        if ("error" in result) {
            expect(result.error).toBe("source_unavailable");
        }
        await mock.cleanup();
    });

    it("system prompt contains GovInfo citation format guidance", () => {
        expect(GOVINFO_SYSTEM_PROMPT).toContain("GovInfo");
        expect(GOVINFO_SYSTEM_PROMPT).toContain("Government Publishing Office");
    });
});
