"use client";

/**
 * CitationCard component — renders MCP source citations below assistant messages.
 * Spec: Section 5, Chunk 5.
 *
 * - For ≤3 citations: expanded card view (full excerpt visible)
 * - For ≥4 citations: compact list view (one row per citation, expand on click)
 * - RTL rendering for Arabic excerpts (Unicode U+0600–U+06FF)
 * - "Verify and read" button stub (wired up in Chunk 20)
 * - Liveness indicator dot (updated in Chunk 20)
 */

import { useState } from "react";
import type { McpCitation, McpCitationLiveness, McpCitationVerification } from "@/app/components/shared/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns true if the text contains Arabic Unicode characters (U+0600–U+06FF). */
function containsArabic(text: string): boolean {
    return /[؀-ۿ]/.test(text);
}

/** Source display names used when displayName is not provided. */
const SOURCE_DISPLAY_NAMES: Record<string, string> = {
    courtlistener: "CourtListener",
    eurlex: "EUR-Lex",
    "al-meezan": "Al-Meezan",
    govinfo: "GovInfo",
    italaw: "italaw",
    icsid: "ICSID",
};

/** Region glyphs used when regionGlyph is not provided. */
const SOURCE_REGION_GLYPHS: Record<string, string> = {
    courtlistener: "🇺🇸",
    govinfo: "🇺🇸",
    eurlex: "🇪🇺",
    "al-meezan": "🇶🇦",
    italaw: "ARB",
    icsid: "ARB",
};

function getDisplayName(citation: McpCitation): string {
    return citation.displayName ?? SOURCE_DISPLAY_NAMES[citation.source_type] ?? citation.source_type;
}

function getRegionGlyph(citation: McpCitation): string {
    return citation.regionGlyph ?? SOURCE_REGION_GLYPHS[citation.source_type] ?? "";
}

// ---------------------------------------------------------------------------
// Liveness dot
// ---------------------------------------------------------------------------

interface LivenessDotProps {
    status: McpCitationLiveness;
}

function LivenessDot({ status }: LivenessDotProps) {
    const colorMap: Record<McpCitationLiveness, string> = {
        unchecked: "bg-gray-300",
        live: "bg-green-500",
        unreachable: "bg-red-500",
    };
    const titleMap: Record<McpCitationLiveness, string> = {
        unchecked: "Liveness not checked",
        live: "URL is reachable",
        unreachable: "URL unreachable",
    };
    return (
        <span
            className={`inline-block h-2 w-2 rounded-full ${colorMap[status]} flex-shrink-0`}
            title={titleMap[status]}
            aria-label={titleMap[status]}
        />
    );
}

// ---------------------------------------------------------------------------
// Verification badge
// ---------------------------------------------------------------------------

interface VerificationBadgeProps {
    status: McpCitationVerification;
}

function VerificationBadge({ status }: VerificationBadgeProps) {
    const config: Record<McpCitationVerification, { color: string; title: string; label: string }> = {
        pending:     { color: "bg-yellow-400", title: "Verification pending",    label: "?" },
        verified:    { color: "bg-green-500",  title: "Excerpt verified",        label: "✓" },
        unverified:  { color: "bg-red-500",    title: "Excerpt not found",       label: "✗" },
        unavailable: { color: "bg-gray-400",   title: "Verification unavailable", label: "-" },
    };
    const { color, title, label } = config[status];
    return (
        <span
            className={`inline-flex items-center justify-center h-4 w-4 rounded-full ${color} text-white text-xs font-bold flex-shrink-0`}
            title={title}
            aria-label={title}
        >
            {label}
        </span>
    );
}

// ---------------------------------------------------------------------------
// Single expanded citation card
// ---------------------------------------------------------------------------

interface SingleCitationCardProps {
    citation: McpCitation;
    onVerifyAndRead?: (citation: McpCitation) => void;
}

function SingleCitationCard({ citation, onVerifyAndRead }: SingleCitationCardProps) {
    const displayName = getDisplayName(citation);
    const regionGlyph = getRegionGlyph(citation);
    const isArabic = citation.excerpt ? containsArabic(citation.excerpt) : false;
    const [verificationStatus, setVerificationStatus] = useState<McpCitationVerification | undefined>(
        citation.verification_status
    );
    const [verifying, setVerifying] = useState(false);

    async function handleVerify() {
        if (!citation.id) return;
        setVerifying(true);
        onVerifyAndRead?.(citation);
        try {
            const res = await fetch(`/api/citations/${citation.id}/verify`, { method: "POST" });
            if (res.ok) {
                const data = await res.json() as { verification_status: McpCitationVerification };
                setVerificationStatus(data.verification_status);
            }
        } catch {
            // best-effort — network errors don't crash the UI
        } finally {
            setVerifying(false);
        }
    }

    return (
        <div className="border border-gray-200 rounded-lg p-3 bg-white shadow-sm text-sm">
            {/* Header: title + liveness + source badge */}
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 min-w-0">
                    <LivenessDot status={citation.liveness_status} />
                    {verificationStatus && <VerificationBadge status={verificationStatus} />}
                    <span className="font-semibold text-gray-900 truncate">
                        {citation.title ?? "Untitled"}
                    </span>
                </div>
                {/* Source badge */}
                <span className="flex-shrink-0 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {regionGlyph && <span className="mr-1">{regionGlyph}</span>}
                    {displayName}
                </span>
            </div>

            {/* Excerpt */}
            {citation.excerpt && (
                <p
                    className="text-gray-600 text-xs leading-relaxed mb-2"
                    dir={isArabic ? "rtl" : undefined}
                >
                    {citation.excerpt}
                </p>
            )}

            {/* Action row */}
            <div className="flex items-center gap-2">
                <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                >
                    Open source ↗
                </a>
                {citation.id && (
                    <button
                        className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-0.5 rounded"
                        onClick={handleVerify}
                        disabled={verifying}
                    >
                        Verify &amp; read
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Compact list row (used for ≥4 citations)
// ---------------------------------------------------------------------------

interface CompactRowProps {
    citation: McpCitation;
    isExpanded: boolean;
    onToggle: () => void;
    onVerifyAndRead?: (citation: McpCitation) => void;
}

function CompactRow({ citation, isExpanded, onToggle, onVerifyAndRead }: CompactRowProps) {
    const displayName = getDisplayName(citation);
    const regionGlyph = getRegionGlyph(citation);
    const isArabic = citation.excerpt ? containsArabic(citation.excerpt) : false;
    const [verificationStatus, setVerificationStatus] = useState<McpCitationVerification | undefined>(
        citation.verification_status
    );
    const [verifying, setVerifying] = useState(false);

    async function handleVerify() {
        if (!citation.id) return;
        setVerifying(true);
        onVerifyAndRead?.(citation);
        try {
            const res = await fetch(`/api/citations/${citation.id}/verify`, { method: "POST" });
            if (res.ok) {
                const data = await res.json() as { verification_status: McpCitationVerification };
                setVerificationStatus(data.verification_status);
            }
        } catch {
            // best-effort — network errors don't crash the UI
        } finally {
            setVerifying(false);
        }
    }

    return (
        <div className="border-b border-gray-100 last:border-0">
            {/* Row header — always visible */}
            <button
                className="w-full flex items-center gap-2 py-2 px-1 hover:bg-gray-50 text-left"
                onClick={onToggle}
                aria-expanded={isExpanded}
            >
                <LivenessDot status={citation.liveness_status} />
                {verificationStatus && <VerificationBadge status={verificationStatus} />}
                <span className="flex-1 text-sm text-gray-900 truncate">
                    {citation.title ?? "Untitled"}
                </span>
                <span className="text-xs text-gray-500 flex-shrink-0">
                    {regionGlyph && <span className="mr-1">{regionGlyph}</span>}
                    {displayName}
                </span>
                <span className="text-gray-400 text-xs">{isExpanded ? "▲" : "▼"}</span>
            </button>

            {/* Expanded excerpt */}
            {isExpanded && (
                <div className="px-3 pb-3">
                    {citation.excerpt && (
                        <p
                            className="text-gray-600 text-xs leading-relaxed mb-2"
                            dir={isArabic ? "rtl" : undefined}
                        >
                            {citation.excerpt}
                        </p>
                    )}
                    <div className="flex items-center gap-2">
                        <a
                            href={citation.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 underline underline-offset-2"
                        >
                            Open source ↗
                        </a>
                        {citation.id && (
                            <button
                                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2 py-0.5 rounded"
                                onClick={handleVerify}
                                disabled={verifying}
                            >
                                Verify &amp; read
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main CitationList component
// ---------------------------------------------------------------------------

export interface CitationListProps {
    citations: McpCitation[];
    onVerifyAndRead?: (citation: McpCitation) => void;
}

/**
 * CitationList renders a list of MCP source citations.
 * - ≤3 citations: expanded card view
 * - ≥4 citations: compact list with expand-on-click
 */
export function CitationList({ citations, onVerifyAndRead }: CitationListProps) {
    const [expandedIndexes, setExpandedIndexes] = useState<Set<number>>(new Set());

    if (citations.length === 0) return null;

    const toggleRow = (idx: number) => {
        setExpandedIndexes((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) {
                next.delete(idx);
            } else {
                next.add(idx);
            }
            return next;
        });
    };

    const useCompactList = citations.length >= 4;

    return (
        <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                Sources ({citations.length})
            </p>

            {useCompactList ? (
                /* Compact list view for ≥4 citations */
                <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                    {citations.map((citation, idx) => (
                        <CompactRow
                            key={citation.id ?? `${citation.source_type}-${idx}`}
                            citation={citation}
                            isExpanded={expandedIndexes.has(idx)}
                            onToggle={() => toggleRow(idx)}
                            onVerifyAndRead={onVerifyAndRead}
                        />
                    ))}
                </div>
            ) : (
                /* Expanded card view for ≤3 citations */
                <div className="flex flex-col gap-2">
                    {citations.map((citation, idx) => (
                        <SingleCitationCard
                            key={citation.id ?? `${citation.source_type}-${idx}`}
                            citation={citation}
                            onVerifyAndRead={onVerifyAndRead}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

/** Re-export for convenience */
export type { McpCitation };
