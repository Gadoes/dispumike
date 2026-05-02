/**
 * CitationVerifier — checks whether a citation's excerpt appears in the
 * fetched source URL content.
 * Spec: Section 5, Chunk 20.
 *
 * Returns:
 *   'verified'    — excerpt text found in the fetched page
 *   'unverified'  — page fetched but excerpt not found
 *   'unavailable' — fetch failed, timed out, or excerpt is empty
 */

export type VerificationStatus = "verified" | "unverified" | "unavailable";

const TIMEOUT_MS = 10_000;

export class CitationVerifier {
    async verify(url: string, excerpt: string): Promise<VerificationStatus> {
        if (!excerpt || excerpt.trim().length === 0) return "unavailable";

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) return "unavailable";

            const html = await response.text();
            const normalizedPage = this.normalizeText(html);
            const normalizedExcerpt = this.normalizeText(excerpt);

            return normalizedPage.includes(normalizedExcerpt) ? "verified" : "unverified";
        } catch {
            return "unavailable";
        } finally {
            clearTimeout(timeoutId);
        }
    }

    private normalizeText(text: string): string {
        return text
            .replace(/<[^>]+>/g, " ") // strip HTML tags
            .replace(/\s+/g, " ")      // collapse whitespace
            .trim()
            .toLowerCase();
    }
}
