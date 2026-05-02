/**
 * CitationVerifier tests — Chunk 20.
 * Uses vi.stubGlobal to mock fetch.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CitationVerifier } from "./citationVerifier.js";

const verifier = new CitationVerifier();

describe("CitationVerifier", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it("returns 'verified' when excerpt is found in fetched content", async () => {
        const excerpt = "due process requires notice";
        const html = `<html><body><p>The court held that due process requires notice and hearing.</p></body></html>`;

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            text: async () => html,
        }));

        const status = await verifier.verify("https://example.com/case", excerpt);
        expect(status).toBe("verified");
    });

    it("returns 'unverified' when excerpt is NOT found in fetched content", async () => {
        const excerpt = "freedom of assembly is fundamental";
        const html = `<html><body><p>The court found no violation.</p></body></html>`;

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            text: async () => html,
        }));

        const status = await verifier.verify("https://example.com/case", excerpt);
        expect(status).toBe("unverified");
    });

    it("returns 'unavailable' when fetch fails (non-ok response)", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 404,
            text: async () => "Not found",
        }));

        const status = await verifier.verify("https://example.com/missing", "some text");
        expect(status).toBe("unavailable");
    });

    it("returns 'unavailable' when fetch throws (network error)", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));

        const status = await verifier.verify("https://example.com/case", "some text");
        expect(status).toBe("unavailable");
    });

    it("returns 'unavailable' on 10s timeout", async () => {
        vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
            return new Promise((_resolve, reject) => {
                opts?.signal?.addEventListener("abort", () =>
                    reject(new DOMException("Aborted", "AbortError")),
                );
            });
        }));

        const p = verifier.verify("https://example.com/slow", "some text");
        await vi.advanceTimersByTimeAsync(10_001);
        const status = await p;
        expect(status).toBe("unavailable");
    });

    it("is case-insensitive in excerpt matching", async () => {
        const excerpt = "DUE PROCESS";
        const html = `<html><body><p>The doctrine of due process applies here.</p></body></html>`;

        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            text: async () => html,
        }));

        const status = await verifier.verify("https://example.com/case", excerpt);
        expect(status).toBe("verified");
    });

    it("returns 'unavailable' when excerpt is empty", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            text: async () => "<html><body>content</body></html>",
        }));

        const status = await verifier.verify("https://example.com/case", "");
        expect(status).toBe("unavailable");
    });
});
