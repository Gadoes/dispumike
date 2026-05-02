"use client";

/**
 * /admin/mcp-telemetry — per-source MCP health dashboard.
 * Spec: Chunk 19.
 * Auto-refreshes every 60s.
 */

import { useEffect, useState, useCallback } from "react";

interface SourceStats {
    source: string;
    total_calls: number;
    success_rate: number;
    avg_latency_ms: number;
    cache_hit_rate: number;
    errors_24h: number;
}

export default function McpTelemetryPage() {
    const [sources, setSources] = useState<SourceStats[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001"}/admin/mcp-telemetry`,
                { credentials: "include" },
            );
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setSources(data.sources);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load telemetry");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 60_000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    if (loading) {
        return (
            <div className="p-8">
                <p className="text-gray-500">Loading telemetry…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8">
                <p className="text-red-500">Error: {error}</p>
            </div>
        );
    }

    if (!sources || sources.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-xl font-semibold mb-4">MCP Source Telemetry</h1>
                <p className="text-gray-500">No telemetry data yet.</p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <h1 className="text-xl font-semibold mb-4">MCP Source Telemetry</h1>
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Source</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">Total Calls</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">Success Rate</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">Avg Latency</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">Cache Hit Rate</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-700">Errors (24h)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sources.map((s) => (
                            <tr key={s.source} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium text-gray-900">{s.source}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{s.total_calls}</td>
                                <td className="px-4 py-3 text-right text-gray-700">{s.success_rate}%</td>
                                <td className="px-4 py-3 text-right text-gray-700">{s.avg_latency_ms} ms</td>
                                <td className="px-4 py-3 text-right text-gray-700">{s.cache_hit_rate}%</td>
                                <td className={`px-4 py-3 text-right font-medium ${s.errors_24h > 0 ? "text-red-600" : "text-gray-700"}`}>
                                    {s.errors_24h}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-3 text-xs text-gray-400">Auto-refreshes every 60 seconds.</p>
        </div>
    );
}
