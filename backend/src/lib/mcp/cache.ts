/**
 * CacheManager — MCP query result caching with TTL.
 * Spec: Section 2.5, Chunk 17.
 *
 * Cache key: SHA-256 of "{source}:{normalizedQuery}"
 * TTL: stable sources (al-meezan, italaw, icsid) = 86400s
 *      live sources (courtlistener, eurlex, govinfo) = 3600s
 */

import crypto from "crypto";
import { normalizeQuery } from "./queryNormalizer.js";

export const TTL_STABLE = 86400;  // 24 hours (al-meezan, italaw, icsid)
export const TTL_LIVE = 3600;     // 1 hour (courtlistener, eurlex, govinfo)

const STABLE_SOURCES = new Set(["al-meezan", "italaw", "icsid"]);

export interface CacheEntry {
    cache_key: string;
    source: string;
    query: string;
    result_json: string;
    created_at: string;
    expires_at: string;
}

export function getTtlForSource(source: string): number {
    return STABLE_SOURCES.has(source) ? TTL_STABLE : TTL_LIVE;
}

export function buildCacheKey(source: string, normalizedQuery: string): string {
    return crypto
        .createHash("sha256")
        .update(`${source}:${normalizedQuery}`)
        .digest("hex");
}

export class CacheManager {
    private store = new Map<string, CacheEntry>();

    get(source: string, query: string): string | null {
        const key = buildCacheKey(source, normalizeQuery(query));
        const entry = this.store.get(key);
        if (!entry) return null;
        if (new Date(entry.expires_at) < new Date()) {
            this.store.delete(key);
            return null;
        }
        return entry.result_json;
    }

    set(source: string, query: string, resultJson: string): void {
        const normalized = normalizeQuery(query);
        const key = buildCacheKey(source, normalized);
        const ttl = getTtlForSource(source);
        const now = new Date();
        const expiresAt = new Date(now.getTime() + ttl * 1000);

        this.store.set(key, {
            cache_key: key,
            source,
            query: normalized,
            result_json: resultJson,
            created_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
        });
    }

    has(source: string, query: string): boolean {
        return this.get(source, query) !== null;
    }

    clear(): void {
        this.store.clear();
    }
}

export const cacheManager = new CacheManager();
