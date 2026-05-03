/**
 * Citation parser — maps MCP tool results to the Citation schema.
 * Spec: Section 5, Chunk 4.
 *
 * Each MCP source has a different response shape; this module normalizes
 * them all to the canonical Citation type.
 */

import type { Citation, CitationSourceType, RawMcpResult } from "./types.js";

// ---------------------------------------------------------------------------
// Per-source parsers
// ---------------------------------------------------------------------------

/** Parse a CourtListener result (Section 4.1). */
function parseCourtListenerResult(raw: RawMcpResult, userId: string): Omit<Citation, "id" | "chat_message_id"> {
    return {
        user_id: userId,
        source_type: "courtlistener",
        source_id: raw.id != null ? String(raw.id) : null,
        url: String(raw.url ?? ""),
        title: raw.case_name != null ? String(raw.case_name) : null,
        excerpt: raw.snippet != null ? String(raw.snippet).slice(0, 500) : null,
        liveness_status: "unchecked",
    };
}

/** Parse a GovInfo result (Section 4.2). */
function parseGovInfoResult(raw: RawMcpResult, userId: string): Omit<Citation, "id" | "chat_message_id"> {
    return {
        user_id: userId,
        source_type: "govinfo",
        source_id: raw.packageId != null ? String(raw.packageId) : null,
        url: String(raw.url ?? ""),
        title: raw.title != null ? String(raw.title) : null,
        excerpt: raw.excerpt != null ? String(raw.excerpt).slice(0, 500) : null,
        liveness_status: "unchecked",
    };
}

/** Parse an Al-Meezan result (Section 4.3). */
function parseAlMeezanResult(raw: RawMcpResult, userId: string): Omit<Citation, "id" | "chat_message_id"> {
    // Prefer English text; fall back to Arabic
    const title = (raw.title_english ?? raw.title_arabic) != null
        ? String(raw.title_english ?? raw.title_arabic)
        : null;
    const excerpt = (raw.text_english ?? raw.text_arabic) != null
        ? String(raw.text_english ?? raw.text_arabic).slice(0, 500)
        : null;
    return {
        user_id: userId,
        source_type: "al-meezan",
        source_id: raw.provision_id != null ? String(raw.provision_id) : null,
        url: String(raw.url ?? ""),
        title,
        excerpt,
        liveness_status: "unchecked",
    };
}

/** Parse a EUR-Lex result (Section 4.4). */
function parseEurLexResult(raw: RawMcpResult, userId: string): Omit<Citation, "id" | "chat_message_id"> {
    return {
        user_id: userId,
        source_type: "eurlex",
        source_id: raw.celex != null ? String(raw.celex) : null,
        url: String(raw.url ?? ""),
        title: raw.title != null ? String(raw.title) : null,
        excerpt: raw.excerpt != null ? String(raw.excerpt).slice(0, 500) : null,
        liveness_status: "unchecked",
    };
}

/** Parse an italaw result (Section 4.5). */
function parseItalawResult(raw: RawMcpResult, userId: string): Omit<Citation, "id" | "chat_message_id"> {
    return {
        user_id: userId,
        source_type: "italaw",
        source_id: raw.url != null ? String(raw.url) : null, // use URL as ID for portable DB
        url: String(raw.url ?? ""),
        title: raw.case_name != null ? String(raw.case_name) : null,
        excerpt: raw.excerpt != null ? String(raw.excerpt).slice(0, 500) : null,
        liveness_status: "unchecked",
    };
}

/** Parse an ICSID result (Section 4.6). */
function parseIcsidResult(raw: RawMcpResult, userId: string): Omit<Citation, "id" | "chat_message_id"> {
    return {
        user_id: userId,
        source_type: "icsid",
        source_id: raw.url != null ? String(raw.url) : null, // use URL as ID for portable DB
        url: String(raw.url ?? ""),
        title: raw.case_name != null ? String(raw.case_name) : null,
        excerpt: raw.excerpt != null ? String(raw.excerpt).slice(0, 500) : null,
        liveness_status: "unchecked",
    };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Map a single raw MCP result object to a Citation, based on the source type.
 * Returns null if the source type is unknown or the URL is missing.
 */
export function parseSingleCitation(
    sourceType: CitationSourceType,
    raw: RawMcpResult,
    userId: string,
): Omit<Citation, "id" | "chat_message_id"> | null {
    // All citations require a URL
    if (!raw.url || typeof raw.url !== "string" || raw.url.trim() === "") {
        return null;
    }

    switch (sourceType) {
        case "courtlistener":
            return parseCourtListenerResult(raw, userId);
        case "govinfo":
            return parseGovInfoResult(raw, userId);
        case "al-meezan":
            return parseAlMeezanResult(raw, userId);
        case "eurlex":
            return parseEurLexResult(raw, userId);
        case "italaw":
            return parseItalawResult(raw, userId);
        case "icsid":
            return parseIcsidResult(raw, userId);
        default:
            return null;
    }
}

/**
 * Parse an MCP tool result blob into an array of Citations.
 *
 * The blob is expected to be a JSON object with a `results` array field,
 * matching the per-source schemas in Section 4 of the spec.
 *
 * Malformed or non-array results are silently skipped.
 */
export function parseMcpResultToCitations(
    sourceType: CitationSourceType,
    toolResultContent: string,
    userId: string,
): Omit<Citation, "id" | "chat_message_id">[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(toolResultContent);
    } catch {
        return [];
    }

    if (typeof parsed !== "object" || parsed === null) return [];

    let asObj = parsed as Record<string, unknown>;

    // Unwrap MCP content envelope: {content: [{type: "text", text: "{\"results\":[...]}"}]}
    if (Array.isArray(asObj.content)) {
        const textBlock = (asObj.content as Array<Record<string, unknown>>).find(
            (b) => b.type === "text" && typeof b.text === "string",
        );
        if (textBlock) {
            try {
                const inner = JSON.parse(textBlock.text as string);
                if (typeof inner === "object" && inner !== null) {
                    asObj = inner as Record<string, unknown>;
                }
            } catch {
                // fall through to existing logic
            }
        }
    }

    // Results can be in `results` array (live sources) or directly as array
    const resultsArray: unknown[] = Array.isArray(asObj.results)
        ? asObj.results
        : Array.isArray(asObj)
        ? (asObj as unknown as unknown[])
        : [];

    const citations: Omit<Citation, "id" | "chat_message_id">[] = [];
    for (const raw of resultsArray) {
        if (typeof raw !== "object" || raw === null) continue;
        const citation = parseSingleCitation(sourceType, raw as RawMcpResult, userId);
        if (citation) citations.push(citation);
    }
    return citations;
}
