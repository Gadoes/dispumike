/**
 * Query normalizer tests — Chunk 17.
 * Spec: Section 2.5.
 */

import { describe, it, expect } from "vitest";
import { normalizeQuery } from "./queryNormalizer.js";

describe("normalizeQuery", () => {
    it("lowercases the query", () => {
        expect(normalizeQuery("FIDIC")).toBe("fidic");
    });

    it("collapses multiple spaces", () => {
        expect(normalizeQuery("  FIDIC  TIME-BAR  ")).toBe("fidic time-bar");
    });

    it("strips leading/trailing punctuation", () => {
        expect(normalizeQuery("FIDIC time-bar.")).toBe("fidic time-bar");
    });

    it("critical: all four variants produce the same key", () => {
        const variants = [
            "FIDIC time-bar",
            "fidic time-bar",
            "  FIDIC  TIME-BAR  ",
            "FIDIC time-bar.",
        ];
        const normalized = variants.map(normalizeQuery);
        // All variants must produce the same normalized output
        expect(new Set(normalized).size).toBe(1);
    });

    it("does not remove stop words", () => {
        expect(normalizeQuery("the contract is void")).toBe("the contract is void");
    });

    it("preserves internal punctuation (hyphens)", () => {
        const result = normalizeQuery("time-bar clause");
        expect(result).toContain("time-bar");
    });

    it("handles empty string", () => {
        expect(normalizeQuery("")).toBe("");
    });

    it("handles query with only punctuation", () => {
        expect(normalizeQuery("...")).toBe("");
    });

    it("handles single word", () => {
        expect(normalizeQuery("ARBITRATION")).toBe("arbitration");
    });
});
