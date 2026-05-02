/**
 * GovInfo MCP server configuration.
 * Spec: Section 4.2, Chunk 11.
 *
 * Package: govinfo-mcp (GPO — U.S. Government Publishing Office)
 *
 * NOTE: The official GPO MCP package is still in public preview as of
 * implementation. This module stubs the configuration so that when the
 * package is published, wiring it in is a one-line change.
 *
 * GovInfo provides access to authenticated users at no cost with a free
 * API key from api.data.gov. Unauthenticated requests are rate-limited
 * but still return results; the server should degrade gracefully.
 *
 * When the package is not installed, McpClientManager will catch the spawn
 * error and emit source_unavailable instead of crashing.
 */

import type { McpServerConfig } from "../types.js";

/**
 * Build a GovInfo MCP server config.
 * The GOVINFO_API_KEY is injected at spawn time.
 *
 * @param apiKey — User's api.data.gov API key (from user_profiles or env).
 *                 GovInfo allows unauthenticated access at reduced rate limits,
 *                 so null is acceptable (server will use demo key or no key).
 */
export function buildGovInfoConfig(apiKey: string | null): McpServerConfig {
    return {
        name: "govinfo",
        command: "npx",
        args: ["-y", "govinfo-mcp"],
        env: {
            ...(apiKey ? { GOVINFO_API_KEY: apiKey } : {}),
        },
    };
}

/**
 * Validate a GovInfo API key looks plausible (non-empty string).
 * Unauthenticated access is permitted; this just gates enhanced rate limits.
 */
export function isValidGovInfoKey(key: string | null | undefined): boolean {
    return typeof key === "string" && key.trim().length > 0;
}

/**
 * GovInfo tool names expected from the MCP server.
 * Used for validation and system prompt generation.
 */
export const GOVINFO_TOOLS = [
    "search_packages",
    "retrieve_package",
    "search_collections",
    "get_document",
] as const;

export type GovInfoTool = (typeof GOVINFO_TOOLS)[number];

/**
 * System prompt addition for GovInfo citations.
 * Instructs the model on the correct citation format.
 */
export const GOVINFO_SYSTEM_PROMPT =
    "When citing GovInfo results, use the format: " +
    "[Document Title, Collection, Date] with a link to govinfo.gov. " +
    "Attribution required: Data from GovInfo / U.S. Government Publishing Office. " +
    "US government documents are public domain unless otherwise noted.";
