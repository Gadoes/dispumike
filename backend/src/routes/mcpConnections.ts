/**
 * REST API for MCP source connections.
 * Spec: Section 5, Chunk 6.
 *
 * GET    /user/mcp-connections         — list all servers + user's connection status
 * POST   /user/mcp-connections         — create/update a connection (encrypts key)
 * DELETE /user/mcp-connections/:serverId — remove a connection
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { createServerSupabase } from "../lib/supabase";
import { encryptApiKey, decryptApiKey } from "../lib/mcp/encryption";

export const mcpConnectionsRouter = Router();

// ---------------------------------------------------------------------------
// GET /user/mcp-connections
// Returns all known servers with the user's connection status merged in.
// ---------------------------------------------------------------------------

mcpConnectionsRouter.get("/", requireAuth, async (_req, res) => {
    const userId = res.locals.userId as string;
    const db = createServerSupabase();

    // Fetch all servers ordered by region + sort_order
    const { data: servers, error: serversError } = await db
        .from("mcp_servers")
        .select("*")
        .order("region", { ascending: true })
        .order("sort_order", { ascending: true });

    if (serversError) {
        return void res.status(500).json({ detail: serversError.message });
    }

    // Fetch this user's connections
    const { data: connections, error: connectionsError } = await db
        .from("mcp_connections")
        .select("id, server_id, enabled, key_version, created_at, updated_at")
        .eq("user_id", userId);

    if (connectionsError) {
        return void res.status(500).json({ detail: connectionsError.message });
    }

    const connectionByServerId = new Map(
        (connections ?? []).map((c) => [c.server_id, c]),
    );

    // Merge: for each server, attach connection status (never expose api_key)
    const result = (servers ?? []).map((server) => {
        const conn = connectionByServerId.get(server.id);
        return {
            ...server,
            connection: conn
                ? {
                      id: conn.id,
                      enabled: conn.enabled,
                      has_key: true, // key is set but never returned
                      key_version: conn.key_version,
                      created_at: conn.created_at,
                      updated_at: conn.updated_at,
                  }
                : null,
        };
    });

    res.json({ servers: result });
});

// ---------------------------------------------------------------------------
// POST /user/mcp-connections
// Body: { server_id: string, enabled?: boolean, api_key?: string }
// Creates or updates. Encrypts api_key before writing.
// ---------------------------------------------------------------------------

mcpConnectionsRouter.post("/", requireAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    const { server_id, enabled = true, api_key } = req.body as {
        server_id?: string;
        enabled?: boolean;
        api_key?: string;
    };

    if (!server_id || typeof server_id !== "string") {
        return void res.status(400).json({ detail: "server_id is required" });
    }

    const db = createServerSupabase();

    // Verify the server exists
    const { data: server, error: serverError } = await db
        .from("mcp_servers")
        .select("id, auth_type")
        .eq("id", server_id)
        .single();

    if (serverError || !server) {
        return void res.status(404).json({ detail: "MCP server not found" });
    }

    // Build the upsert payload
    let encryptedKey: string | null = null;
    let keyVersion: number = 1;

    if (api_key && typeof api_key === "string" && api_key.trim()) {
        try {
            const result = await encryptApiKey(api_key.trim());
            encryptedKey = result.ciphertext;
            keyVersion = result.version;
        } catch (e) {
            console.error("[mcpConnections] encryption failed", e);
            return void res
                .status(500)
                .json({ detail: "Key encryption failed — check server configuration." });
        }
    }

    const now = new Date().toISOString();
    const upsertPayload: Record<string, unknown> = {
        user_id: userId,
        server_id,
        enabled,
        updated_at: now,
    };

    if (encryptedKey !== null) {
        upsertPayload.api_key = encryptedKey;
        upsertPayload.key_version = keyVersion;
    }

    const { data, error } = await db
        .from("mcp_connections")
        .upsert(upsertPayload, { onConflict: "user_id,server_id" })
        .select("id, server_id, enabled, key_version, created_at, updated_at")
        .single();

    if (error) {
        return void res.status(500).json({ detail: error.message });
    }

    res.json({
        ok: true,
        connection: {
            ...data,
            has_key: encryptedKey !== null,
        },
    });
});

// ---------------------------------------------------------------------------
// DELETE /user/mcp-connections/:serverId
// Removes the connection row for this user + server.
// ---------------------------------------------------------------------------

mcpConnectionsRouter.delete("/:serverId", requireAuth, async (req, res) => {
    const userId = res.locals.userId as string;
    const { serverId } = req.params;

    const db = createServerSupabase();

    const { error } = await db
        .from("mcp_connections")
        .delete()
        .eq("user_id", userId)
        .eq("server_id", serverId);

    if (error) {
        return void res.status(500).json({ detail: error.message });
    }

    res.status(204).send();
});

// ---------------------------------------------------------------------------
// Re-export decryptApiKey for use in other modules (e.g. MCP spawn)
// ---------------------------------------------------------------------------
export { decryptApiKey };
