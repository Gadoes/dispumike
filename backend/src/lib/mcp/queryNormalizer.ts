/**
 * Query normalizer for MCP cache key derivation.
 * Spec: Section 2.5, Chunk 17.
 *
 * Steps: lowercase → collapse whitespace → strip leading/trailing punctuation.
 * NO stop-word removal.
 */

/**
 * Normalize a query string for stable cache key generation.
 * "FIDIC time-bar", "fidic time-bar", "  FIDIC  TIME-BAR  ", "FIDIC time-bar."
 * all produce the same normalized output.
 */
export function normalizeQuery(q: string): string {
    return q
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^[^\w]+|[^\w]+$/g, "")
        .trim();
}
