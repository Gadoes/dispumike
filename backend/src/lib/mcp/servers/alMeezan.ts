/**
 * Al-Meezan MCP server configuration.
 * Spec: Section 4.3, Chunk 12.
 *
 * Source: Ansvar Systems Al-Meezan MCP server (SQLite + FTS5, 71,155 provisions).
 *
 * TODO: replace mock with real package once published (Open Question 2 in spec).
 * The exact npm package name for @ansvar-systems/al-meezan-mcp is unknown at
 * implementation time. This module provides the config scaffold; when the
 * package is published, update the command/args below to point at it.
 *
 * Auth: None — local SQLite, no external API calls.
 * Region glyph: 🇶🇦
 */

import type { McpServerConfig } from "../types.js";

/**
 * Build an Al-Meezan MCP server config.
 * No API key required — the server uses a local SQLite database.
 *
 * When the npm package is not installed, McpClientManager will catch the
 * spawn error and emit source_unavailable instead of crashing.
 */
export function buildAlMeezanConfig(): McpServerConfig {
    return {
        name: "al-meezan",
        // TODO: replace with actual package entry point once @ansvar-systems/al-meezan-mcp is published
        command: "npx",
        args: ["-y", "@ansvar-systems/al-meezan-mcp"],
        env: {},
    };
}

/**
 * Al-Meezan tool names expected from the MCP server.
 * Used for system prompt generation.
 */
export const AL_MEEZAN_TOOLS = [
    "search_provisions",
    "retrieve_provision",
] as const;

export type AlMeezanTool = (typeof AL_MEEZAN_TOOLS)[number];

/**
 * System prompt addition for Al-Meezan citations.
 * Instructs the model on citation format and Arabic handling.
 */
export const AL_MEEZAN_SYSTEM_PROMPT =
    "When citing Al-Meezan results, include the law number, year, and article. " +
    "Arabic text may be returned — cite verbatim with proper attribution. " +
    "Attribution required: Data from Al-Meezan / Qatar Judicial Council.";
