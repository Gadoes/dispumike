"use client";

/**
 * Legal Sources settings page.
 * Spec: Section 5, Chunk 6.
 *
 * Shows all registered MCP source servers, grouped by region.
 * Users can toggle sources on/off and enter API keys for those that require them.
 */

import { useState, useEffect, useCallback } from "react";
import { Check, Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    listMcpConnections,
    saveMcpConnection,
    type McpServerRecord,
} from "@/app/lib/mikeApi";

// ---------------------------------------------------------------------------
// Region ordering and labels
// ---------------------------------------------------------------------------

const REGION_ORDER = [
    "internal",
    "arbitration",
    "gulf",
    "eu",
    "us",
    "other",
] as const;

const REGION_LABELS: Record<string, string> = {
    internal: "Internal",
    arbitration: "International Arbitration",
    gulf: "Gulf & Middle East",
    eu: "European Union",
    us: "United States",
    other: "Other Jurisdictions",
};

// ---------------------------------------------------------------------------
// Per-server row component
// ---------------------------------------------------------------------------

interface ServerRowProps {
    server: McpServerRecord;
    onSave: (payload: {
        server_id: string;
        enabled: boolean;
        api_key?: string;
    }) => Promise<void>;
}

function ServerRow({ server, onSave }: ServerRowProps) {
    const isConnected = server.connection !== null;
    const isEnabled = server.connection?.enabled ?? false;
    const hasKey = server.connection?.has_key ?? false;
    const isApiKeyRequired = server.auth_type === "api_key";
    const isImplemented = server.tier === 1;

    const [apiKey, setApiKey] = useState("");
    const [showKey, setShowKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const handleToggle = async () => {
        if (!isImplemented) return;
        setIsSaving(true);
        try {
            await onSave({
                server_id: server.id,
                enabled: !isEnabled,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveKey = async () => {
        if (!apiKey.trim()) return;
        setIsSaving(true);
        try {
            await onSave({
                server_id: server.id,
                enabled: true,
                api_key: apiKey.trim(),
            });
            setApiKey("");
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
            setIsExpanded(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div
            className={`border border-gray-200 rounded-lg p-4 ${
                !isImplemented ? "opacity-50" : ""
            }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Region glyph */}
                    {server.region_glyph && (
                        <span className="text-sm flex-shrink-0 mt-0.5 font-medium text-gray-600">
                            {server.region_glyph}
                        </span>
                    )}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <p className="font-medium text-sm text-gray-900">
                                {server.display_name}
                            </p>
                            {!isImplemented && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                                    Coming soon
                                </span>
                            )}
                            {isImplemented && isConnected && isEnabled && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium border border-teal-200">
                                    Connected
                                </span>
                            )}
                        </div>
                        {server.description && (
                            <p className="text-xs text-gray-500 mt-0.5">
                                {server.description}
                            </p>
                        )}
                        {isApiKeyRequired && isImplemented && (
                            <p className="text-xs text-amber-600 mt-1">
                                {hasKey
                                    ? "API key saved"
                                    : "API key required — register at the source website"}
                            </p>
                        )}
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    {isImplemented && isApiKeyRequired && (
                        <button
                            onClick={() => setIsExpanded((v) => !v)}
                            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-1 rounded"
                        >
                            {hasKey ? "Update key" : "Add key"}
                        </button>
                    )}
                    {/* Toggle */}
                    <button
                        role="switch"
                        aria-checked={isEnabled}
                        aria-label={`Toggle ${server.display_name}`}
                        disabled={!isImplemented || isSaving}
                        onClick={handleToggle}
                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                            isEnabled
                                ? "bg-gray-900"
                                : "bg-gray-200"
                        }`}
                    >
                        <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                isEnabled ? "translate-x-4" : "translate-x-0"
                            }`}
                        />
                    </button>
                    {saved && <Check className="h-3.5 w-3.5 text-green-600" />}
                    {isSaving && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    )}
                </div>
            </div>

            {/* API key input — expanded */}
            {isExpanded && isApiKeyRequired && (
                <div className="mt-3 flex gap-2">
                    <div className="relative flex-1">
                        <Input
                            type={showKey ? "text" : "password"}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="Enter API key..."
                            className="pr-9 text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setShowKey((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showKey ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                    <Button
                        onClick={handleSaveKey}
                        disabled={!apiKey.trim() || isSaving}
                        className="text-sm bg-black hover:bg-gray-900 text-white min-w-[70px]"
                    >
                        {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            "Save"
                        )}
                    </Button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function LegalSourcesPage() {
    const [servers, setServers] = useState<McpServerRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadServers = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await listMcpConnections();
            setServers(data);
        } catch (e) {
            setError("Failed to load legal sources. Please try again.");
            console.error("[LegalSourcesPage] load failed", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadServers();
    }, [loadServers]);

    const handleSave = async (payload: {
        server_id: string;
        enabled: boolean;
        api_key?: string;
    }) => {
        await saveMcpConnection(payload);
        // Refresh list to reflect updated connection status
        await loadServers();
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-8">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading sources...
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
            </div>
        );
    }

    // Group servers by region, in canonical order
    const byRegion = new Map<string, McpServerRecord[]>();
    for (const server of servers) {
        const list = byRegion.get(server.region) ?? [];
        list.push(server);
        byRegion.set(server.region, list);
    }

    const orderedRegions = [
        ...REGION_ORDER.filter((r) => byRegion.has(r)),
        ...[...byRegion.keys()].filter(
            (r) => !(REGION_ORDER as readonly string[]).includes(r),
        ),
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-medium font-serif mb-1">
                    Legal Sources
                </h2>
                <p className="text-sm text-gray-500">
                    Connect external legal databases. API keys are encrypted at rest
                    and never shared.
                </p>
            </div>

            {orderedRegions.map((region) => {
                const regionServers = byRegion.get(region) ?? [];
                return (
                    <div key={region}>
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                            {REGION_LABELS[region] ?? region}
                        </h3>
                        <div className="space-y-2">
                            {regionServers.map((server) => (
                                <ServerRow
                                    key={server.id}
                                    server={server}
                                    onSave={handleSave}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
