import { createServerSupabase } from "./supabase";
import {
    resolveModel,
    DEFAULT_TITLE_MODEL,
    DEFAULT_TABULAR_MODEL,
    type UserApiKeys,
} from "./llm";
import { decryptApiKey } from "./mcp/encryption";

export type UserModelSettings = {
    title_model: string;
    tabular_model: string;
    api_keys: UserApiKeys;
};

// Title generation is a lightweight task — always routed to the cheapest model
// of whichever provider the user has keys for: Gemini Flash Lite if Gemini is
// available, otherwise Claude Haiku. With no user keys set, defaults to Gemini
// (the dev-mode env fallback).
function resolveTitleModel(apiKeys: UserApiKeys): string {
    if (apiKeys.gemini?.trim()) return DEFAULT_TITLE_MODEL;
    if (apiKeys.claude?.trim()) return "claude-haiku-4-5";
    return DEFAULT_TITLE_MODEL;
}

export async function getUserModelSettings(
    userId: string,
    db?: ReturnType<typeof createServerSupabase>,
): Promise<UserModelSettings> {
    const client = db ?? createServerSupabase();
    const { data } = await client
        .from("user_profiles")
        .select("tabular_model, claude_api_key, gemini_api_key")
        .eq("user_id", userId)
        .single();

    const api_keys: UserApiKeys = {
        claude: data?.claude_api_key ?? null,
        gemini: data?.gemini_api_key ?? null,
    };

    return {
        title_model: resolveTitleModel(api_keys),
        tabular_model: resolveModel(data?.tabular_model, DEFAULT_TABULAR_MODEL),
        api_keys,
    };
}

export async function getUserApiKeys(
    userId: string,
    db?: ReturnType<typeof createServerSupabase>,
): Promise<UserApiKeys> {
    const client = db ?? createServerSupabase();
    const { data } = await client
        .from("user_profiles")
        .select("claude_api_key, gemini_api_key, courtlistener_api_key, govinfo_api_key")
        .eq("user_id", userId)
        .single();
    return {
        claude: data?.claude_api_key ?? null,
        gemini: data?.gemini_api_key ?? null,
        courtlistener: data?.courtlistener_api_key ?? process.env.COURTLISTENER_API_KEY ?? null,
        govinfo: data?.govinfo_api_key ?? process.env.GOVINFO_API_KEY ?? null,
    };
}

/**
 * Returns the decrypted API key for a given MCP server for a user.
 * Falls back to env var if no user-specific key is stored.
 * Returns null if neither is available.
 */
export async function getMcpApiKey(
    userId: string,
    serverName: string,
    serverAuthEnvVar: string | null,
    db?: ReturnType<typeof createServerSupabase>,
): Promise<string | null> {
    const client = db ?? createServerSupabase();

    // Look up the mcp_connections row for this user + server
    const { data: conn } = await client
        .from("mcp_connections")
        .select("api_key, key_version")
        .eq("user_id", userId)
        .eq("enabled", true)
        .filter(
            "server_id",
            "in",
            `(select id from mcp_servers where name = '${serverName}')`,
        )
        .maybeSingle();

    if (conn?.api_key) {
        try {
            return await decryptApiKey(conn.api_key, conn.key_version ?? 1);
        } catch (e) {
            console.error(`[getMcpApiKey] decrypt failed for ${serverName}`, e);
            // Fall through to env fallback
        }
    }

    // Env var fallback
    if (serverAuthEnvVar) {
        return process.env[serverAuthEnvVar] ?? null;
    }
    return null;
}
