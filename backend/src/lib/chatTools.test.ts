import { describe, it, expect } from "vitest";
import { buildMcpPromptSection } from "./chatTools.js";

describe("buildMcpPromptSection", () => {
    const eurLexTools = [
        {
            serverName: "eurlex",
            displayName: "EUR-Lex",
            tools: [{ name: "search_eurlex" }, { name: "retrieve_eurlex" }],
        },
    ];

    const eurLexDefs = [
        { function: { name: "mcp__eurlex__search_eurlex" } },
        { function: { name: "mcp__eurlex__retrieve_eurlex" } },
    ];

    it("includes MCP citation format instruction when MCP sources are active", () => {
        const section = buildMcpPromptSection(eurLexDefs, eurLexTools);

        expect(section).toContain("ACTIVE LEGAL DATABASE SOURCES");
        expect(section).toContain("EUR-Lex");
        expect(section).toContain("IMPORTANT — MCP source citation format");
        expect(section).toContain("MUST NOT appear in your <CITATIONS> block");
        expect(section).toContain("cite inline using markdown links");
    });

    it("returns empty string when no MCP sources are active", () => {
        expect(buildMcpPromptSection([], eurLexTools)).toBe("");
        expect(buildMcpPromptSection(eurLexDefs, [])).toBe("");
        expect(buildMcpPromptSection([], [])).toBe("");
    });

    it("includes all active server names in the description", () => {
        const multiTools = [
            ...eurLexTools,
            {
                serverName: "courtlistener",
                displayName: "CourtListener",
                tools: [{ name: "search_courtlistener" }],
            },
        ];
        const multiDefs = [
            ...eurLexDefs,
            { function: { name: "mcp__courtlistener__search_courtlistener" } },
        ];

        const section = buildMcpPromptSection(multiDefs, multiTools);

        expect(section).toContain("EUR-Lex");
        expect(section).toContain("CourtListener");
    });
});
