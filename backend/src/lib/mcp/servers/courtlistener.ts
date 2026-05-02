/**
 * CourtListener MCP server configuration.
 * Spec: Section 4.1, Chunk 10.
 *
 * Package: courtlistener-mcp (DefendTheDisabled/courtlistener-mcp)
 * Install: npm install courtlistener-mcp
 *
 * NOTE: As of implementation, the exact npm package name has not been confirmed.
 * This module provides the configuration for spawning the server once the
 * package is available. The McpClientManager uses this config to spawn the
 * child process with the user's API key injected via env var.
 *
 * When the package is not installed, McpClientManager will catch the spawn
 * error and emit source_unavailable instead of crashing.
 */

import type { McpServerConfig } from "../types.js";

/**
 * Build a CourtListener MCP server config.
 * The COURTLISTENER_API_KEY is injected at spawn time.
 *
 * @param apiKey — User's CourtListener API key (from user_profiles or env).
 *                 If null/empty, the server will reject requests and we emit
 *                 source_unavailable with a helpful message.
 */
export function buildCourtListenerConfig(apiKey: string | null): McpServerConfig {
    return {
        name: "courtlistener",
        command: "npx",
        args: ["-y", "courtlistener-mcp"],
        env: {
            ...(apiKey ? { COURTLISTENER_API_KEY: apiKey } : {}),
        },
    };
}

/**
 * Validate a CourtListener API key looks plausible (non-empty string).
 * Returns false if missing, prompting source_unavailable emission.
 */
export function isValidCourtListenerKey(key: string | null | undefined): boolean {
    return typeof key === "string" && key.trim().length > 0;
}

/**
 * CourtListener tool names expected from the MCP server.
 * Used for validation and system prompt generation.
 */
export const COURTLISTENER_TOOLS = [
    "search_cases",
    "retrieve_case",
    "search_by_citation",
    "list_courts",
] as const;

export type CourtListenerTool = (typeof COURTLISTENER_TOOLS)[number];

/**
 * System prompt addition for CourtListener citations.
 * Instructs the model on the correct citation format.
 */
export const COURTLISTENER_SYSTEM_PROMPT =
    "When citing CourtListener results, use the format: " +
    "[Case Name, Court, Year] with a link to courtlistener.com. " +
    "Attribution required: Data from CourtListener / Free Law Project.";
