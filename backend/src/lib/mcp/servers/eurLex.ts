/**
 * EUR-Lex MCP server configuration.
 * Spec: Section 4.4, Chunk 13.
 *
 * Package: eur-lex-mcp (scimorph)
 *
 * No API key required — EUR-Lex is publicly accessible.
 * Region glyph: 🇪🇺
 *
 * TODO: replace mock with real package once confirmed available on npm.
 * When the package is not installed, McpClientManager will catch the spawn
 * error and emit source_unavailable instead of crashing.
 */

import type { McpServerConfig } from "../types.js";

/**
 * Build a EUR-Lex MCP server config.
 * No API key required — EUR-Lex is publicly accessible.
 */
export function buildEurLexConfig(): McpServerConfig {
    return {
        name: "eurlex",
        command: "npx",
        args: ["-y", "eur-lex-mcp"],
        env: {},
    };
}

/**
 * EUR-Lex tool names expected from the MCP server.
 * Used for system prompt generation.
 */
export const EURLEX_TOOLS = [
    "search_eurlex",
    "retrieve_eurlex",
] as const;

export type EurLexTool = (typeof EURLEX_TOOLS)[number];

/**
 * System prompt addition for EUR-Lex citations.
 * Instructs the model on CELEX number citation format.
 */
export const EURLEX_SYSTEM_PROMPT =
    "When citing EUR-Lex results, include the CELEX number, document title, and date. " +
    "Link to eur-lex.europa.eu. " +
    "Attribution required: Data from EUR-Lex / Publications Office of the European Union.";
