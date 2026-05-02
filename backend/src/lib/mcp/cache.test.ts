/**
 * CacheManager tests — Chunk 17.
 * Spec: Section 2.5.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { CacheManager, buildCacheKey, getTtlForSource, TTL_STABLE, TTL_LIVE } from "./cache.js";
import { normalizeQuery } from "./queryNormalizer.js";

describe("getTtlForSource", () => {
    it("returns 86400 for al-meezan (stable)", () => {
        expect(getTtlForSource("al-meezan")).toBe(TTL_STABLE);
    });

    it("returns 86400 for italaw (stable)", () => {
        expect(getTtlForSource("italaw")).toBe(TTL_STABLE);
    });

    it("returns 86400 for icsid (stable)", () => {
        expect(getTtlForSource("icsid")).toBe(TTL_STABLE);
    });

    it("returns 3600 for courtlistener (live)", () => {
        expect(getTtlForSource("courtlistener")).toBe(TTL_LIVE);
    });

    it("returns 3600 for eurlex (live)", () => {
        expect(getTtlForSource("eurlex")).toBe(TTL_LIVE);
    });

    it("returns 3600 for govinfo (live)", () => {
        expect(getTtlForSource("govinfo")).toBe(TTL_LIVE);
    });
});

describe("buildCacheKey", () => {
    it("returns a 64-char hex SHA-256 string", () => {
        const key = buildCacheKey("courtlistener", "fidic time-bar");
        expect(key).toMatch(/^[a-f0-9]{64}$/);
    });

    it("same source+query produces same key", () => {
        const a = buildCacheKey("eurlex", "gdpr");
        const b = buildCacheKey("eurlex", "gdpr");
        expect(a).toBe(b);
    });

    it("different sources produce different keys", () => {
        const a = buildCacheKey("eurlex", "gdpr");
        const b = buildCacheKey("govinfo", "gdpr");
        expect(a).not.toBe(b);
    });

    it("critical: all four FIDIC variants map to the same cache key after normalization", () => {
        const variants = [
            "FIDIC time-bar",
            "fidic time-bar",
            "  FIDIC  TIME-BAR  ",
            "FIDIC time-bar.",
        ];
        const keys = variants.map(v => buildCacheKey("courtlistener", normalizeQuery(v)));
        expect(new Set(keys).size).toBe(1);
    });
});

describe("CacheManager", () => {
    let cache: CacheManager;

    beforeEach(() => {
        cache = new CacheManager();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns null for cache miss", () => {
        expect(cache.get("eurlex", "gdpr")).toBeNull();
    });

    it("returns result after set", () => {
        cache.set("eurlex", "gdpr", '{"results":[]}');
        expect(cache.get("eurlex", "gdpr")).toBe('{"results":[]}');
    });

    it("has() returns true for cached entry", () => {
        cache.set("eurlex", "gdpr", "{}");
        expect(cache.has("eurlex", "gdpr")).toBe(true);
    });

    it("has() returns false for missing entry", () => {
        expect(cache.has("eurlex", "gdpr")).toBe(false);
    });

    it("get() returns null for expired entry (live source)", () => {
        cache.set("courtlistener", "fidic", "{}");
        // Advance past live TTL (3600s)
        vi.advanceTimersByTime((TTL_LIVE + 1) * 1000);
        expect(cache.get("courtlistener", "fidic")).toBeNull();
    });

    it("get() returns result within live TTL", () => {
        cache.set("courtlistener", "fidic", "{}");
        vi.advanceTimersByTime((TTL_LIVE - 1) * 1000);
        expect(cache.get("courtlistener", "fidic")).toBe("{}");
    });

    it("stable source cache survives past live TTL", () => {
        cache.set("al-meezan", "عقد", "{}");
        vi.advanceTimersByTime((TTL_LIVE + 1) * 1000);
        expect(cache.get("al-meezan", "عقد")).toBe("{}");
    });

    it("stable source expires after 86400s", () => {
        cache.set("italaw", "nafta", "{}");
        vi.advanceTimersByTime((TTL_STABLE + 1) * 1000);
        expect(cache.get("italaw", "nafta")).toBeNull();
    });

    it("normalizes query before lookup (case-insensitive hit)", () => {
        cache.set("eurlex", "GDPR", "{}");
        expect(cache.get("eurlex", "gdpr")).toBe("{}");
    });

    it("clear() empties the cache", () => {
        cache.set("eurlex", "gdpr", "{}");
        cache.clear();
        expect(cache.has("eurlex", "gdpr")).toBe(false);
    });
});
