"use client";

/**
 * SourcesPill + SourcePickerPopover components.
 * Spec: Section 5, Chunk 7.
 *
 * - SourcesPill: shows in the chat input toolbar with count of active sources.
 * - SourcePickerPopover: opens on pill click, lists sources grouped by region,
 *   with search, state badges, and region_glyph badges.
 * - Closes on outside click / Escape.
 * - Chunk 8 wires up per-query scope toggles via the checkbox prop on each row.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Globe, X } from "lucide-react";
import { listMcpConnections, type McpServerRecord } from "@/app/lib/mikeApi";

// ---------------------------------------------------------------------------
// Region ordering
// ---------------------------------------------------------------------------

const REGION_ORDER: string[] = [
    "internal",
    "arbitration",
    "gulf",
    "eu",
    "us",
    "other",
];

const REGION_LABELS: Record<string, string> = {
    internal: "Internal",
    arbitration: "International Arbitration",
    gulf: "Gulf & Middle East",
    eu: "European Union",
    us: "United States",
    other: "Other Jurisdictions",
};

// ---------------------------------------------------------------------------
// State badge
// ---------------------------------------------------------------------------

type ConnectionStatus = "always_on" | "connected" | "connect" | "permission_required";

function getConnectionStatus(server: McpServerRecord): ConnectionStatus {
    if (server.default_enabled) return "always_on";
    if (server.connection?.enabled) return "connected";
    if (server.tier > 1) return "permission_required";
    return "connect";
}

interface StateBadgeProps {
    status: ConnectionStatus;
}

function StateBadge({ status }: StateBadgeProps) {
    const config: Record<
        ConnectionStatus,
        { label: string; className: string }
    > = {
        always_on: {
            label: "Always on",
            className: "bg-gray-100 text-gray-600",
        },
        connected: {
            label: "Connected",
            className: "bg-teal-50 text-teal-700 border border-teal-200",
        },
        connect: {
            label: "Connect",
            className: "bg-gray-50 text-gray-500 border border-gray-200",
        },
        permission_required: {
            label: "Permission required",
            className: "bg-amber-50 text-amber-700 border border-amber-200",
        },
    };
    const { label, className } = config[status];
    return (
        <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${className}`}
        >
            {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// SourcePickerPopover
// ---------------------------------------------------------------------------

export interface SourcePickerPopoverProps {
    /** Called when the popover closes. */
    onClose: () => void;
    /** Called when user toggles a source checkbox (Chunk 8). */
    onToggleSource?: (serverName: string, enabled: boolean) => void;
    /** Server names that are currently active in the per-query scope (Chunk 8). */
    activeScope?: string[] | null;
}

export function SourcePickerPopover({
    onClose,
    onToggleSource,
    activeScope,
}: SourcePickerPopoverProps) {
    const [servers, setServers] = useState<McpServerRecord[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    // Load servers on open
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await listMcpConnections();
                if (!cancelled) {
                    setServers(data);
                    setIsLoading(false);
                }
            } catch {
                if (!cancelled) setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // Focus search on open
    useEffect(() => {
        if (!isLoading) {
            searchRef.current?.focus();
        }
    }, [isLoading]);

    // Close on outside click
    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("pointerdown", handlePointerDown);
        return () =>
            document.removeEventListener("pointerdown", handlePointerDown);
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    // Filter servers by search query
    const filteredServers = searchQuery.trim()
        ? servers.filter(
              (s) =>
                  s.display_name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                  (s.description ?? "")
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()),
          )
        : servers;

    // Group filtered servers by region
    const byRegion = new Map<string, McpServerRecord[]>();
    for (const server of filteredServers) {
        const list = byRegion.get(server.region) ?? [];
        list.push(server);
        byRegion.set(server.region, list);
    }
    const orderedRegions = [
        ...REGION_ORDER.filter((r) => byRegion.has(r)),
        ...[...byRegion.keys()].filter((r) => !REGION_ORDER.includes(r)),
    ];

    return (
        <div
            ref={containerRef}
            className="absolute bottom-full mb-2 left-0 z-50 w-80 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden"
            role="dialog"
            aria-label="Source picker"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 pt-3 pb-2">
                <p className="text-sm font-semibold text-gray-900">
                    Legal Sources
                </p>
                <button
                    onClick={onClose}
                    className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                    aria-label="Close source picker"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Search */}
            <div className="px-3 pb-2">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                        ref={searchRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search sources..."
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-1 focus:ring-gray-300"
                        aria-label="Search sources"
                    />
                </div>
            </div>

            {/* Server list */}
            <div className="overflow-y-auto max-h-72">
                {isLoading ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                        Loading sources...
                    </div>
                ) : orderedRegions.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                        No sources found.
                    </div>
                ) : (
                    orderedRegions.map((region) => {
                        const regionServers = byRegion.get(region) ?? [];
                        return (
                            <div key={region}>
                                <p className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide bg-gray-50">
                                    {REGION_LABELS[region] ?? region}
                                </p>
                                {regionServers.map((server) => {
                                    const status =
                                        getConnectionStatus(server);
                                    const isChecked = activeScope
                                        ? activeScope.includes(server.name)
                                        : server.connection?.enabled ?? false;
                                    return (
                                        <div
                                            key={server.id}
                                            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50"
                                        >
                                            {/* Checkbox (Chunk 8) */}
                                            {onToggleSource && (
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) =>
                                                        onToggleSource(
                                                            server.name,
                                                            e.target.checked,
                                                        )
                                                    }
                                                    aria-label={`Toggle ${server.display_name}`}
                                                    className="h-3.5 w-3.5 rounded border-gray-300 text-gray-900 focus:ring-gray-400"
                                                    disabled={
                                                        status === "always_on" ||
                                                        status ===
                                                            "permission_required"
                                                    }
                                                />
                                            )}

                                            {/* Region glyph */}
                                            <span className="text-sm text-gray-500 w-6 flex-shrink-0 text-center">
                                                {server.region_glyph ?? (
                                                    <Globe className="h-3.5 w-3.5 inline" />
                                                )}
                                            </span>

                                            {/* Display name */}
                                            <span className="flex-1 text-sm text-gray-900 truncate">
                                                {server.display_name}
                                            </span>

                                            {/* State badge */}
                                            <StateBadge status={status} />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Footer — Add custom MCP server (placeholder, disabled for v1) */}
            <div className="border-t border-gray-100 px-3 py-2">
                <button
                    disabled
                    className="w-full text-left text-xs text-gray-400 cursor-not-allowed py-1"
                    title="Coming in a future release"
                >
                    + Add custom MCP server
                </button>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// SourcesPill — toolbar button for the chat input
// ---------------------------------------------------------------------------

export interface SourcesPillProps {
    /** Number of currently active sources. */
    activeCount: number;
    onClick: () => void;
}

export function SourcesPill({ activeCount, onClick }: SourcesPillProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={`Open sources picker. ${activeCount} active`}
            className="flex items-center gap-1.5 rounded-lg px-2 h-8 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
            <Globe className="h-3.5 w-3.5" />
            <span className="hidden sm:inline text-xs">
                Sources
                {activeCount > 0 && (
                    <span className="ml-1 text-gray-500">{activeCount} active</span>
                )}
            </span>
        </button>
    );
}
