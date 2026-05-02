/**
 * Admin routes — Chunk 19.
 * GET /admin/mcp-telemetry — per-source MCP telemetry aggregates.
 * Auth: available to all authenticated users (no separate admin role for v1).
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createServerSupabase } from "../lib/supabase.js";

export const adminRouter = Router();

// ---------------------------------------------------------------------------
// GET /admin/mcp-telemetry
// ---------------------------------------------------------------------------

adminRouter.get("/mcp-telemetry", requireAuth, async (_req, res) => {
    const db = createServerSupabase();

    // Fetch all events and aggregate in Node.js (avoids a stored procedure)
    const { data: events, error } = await db
        .from("mcp_events")
        .select("source, tool, latency_ms, cache_hit, success, error_type, created_at")
        .order("created_at", { ascending: false });

    if (error) {
        return void res.status(500).json({ detail: error.message });
    }

    const rows = (events ?? []) as Array<{
        source: string;
        latency_ms: number | null;
        cache_hit: boolean;
        success: boolean;
        created_at: string;
    }>;

    const now = Date.now();
    const ms24h = 24 * 60 * 60 * 1000;

    // Group by source
    const bySource = new Map<string, typeof rows>();
    for (const row of rows) {
        if (!bySource.has(row.source)) bySource.set(row.source, []);
        bySource.get(row.source)!.push(row);
    }

    const sources = Array.from(bySource.entries()).map(([source, evts]) => {
        const total = evts.length;
        const successes = evts.filter((e) => e.success).length;
        const cacheHits = evts.filter((e) => e.cache_hit).length;
        const latencies = evts.map((e) => e.latency_ms ?? 0);
        const avgLatency = latencies.length
            ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
            : 0;
        const errors24h = evts.filter(
            (e) => !e.success && now - new Date(e.created_at).getTime() < ms24h,
        ).length;

        return {
            source,
            total_calls: total,
            success_rate: total ? Math.round((successes / total) * 10000) / 100 : 0,
            avg_latency_ms: avgLatency,
            cache_hit_rate: total ? Math.round((cacheHits / total) * 10000) / 100 : 0,
            errors_24h: errors24h,
        };
    });

    res.json({ sources });
});
