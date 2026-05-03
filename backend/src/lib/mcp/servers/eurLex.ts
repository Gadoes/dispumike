/**
 * EUR-Lex MCP server configuration (legacy).
 *
 * @deprecated EUR-Lex is now handled in-process via portableToolProvider
 * using direct SPARQL queries to publications.europa.eu. The buildEurLexConfig
 * function below is kept for backward compatibility with existing tests.
 * See: src/lib/mcp/portable/eurlex/client.ts for the live implementation.
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
