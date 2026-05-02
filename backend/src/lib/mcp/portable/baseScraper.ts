/**
 * BaseScraper — abstract base for portable DB scrapers.
 * Spec: Section 2.8, Chunk 14.
 *
 * - Throttled fetch: 1 request/sec via p-throttle
 * - Cheerio parsing
 * - better-sqlite3 INSERT OR IGNORE
 * - Resumability: reads last_checkpoint_url from Supabase freshness_log
 * - Graceful degradation: on failure sets status="error"
 */

import pThrottle from "p-throttle";
import * as cheerio from "cheerio";
import Database from "better-sqlite3";

type CheerioAPI = ReturnType<typeof cheerio.load>;

export interface ScrapeRecord {
    id: string;
    url: string;
    [key: string]: unknown;
}

export abstract class BaseScraper {
    protected db: Database.Database;

    /** Throttled fetch: max 1 request per second. */
    protected throttledFetch: (url: string, init?: RequestInit) => Promise<Response>;

    constructor(dbPath: string) {
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");

        const throttle = pThrottle({ limit: 1, interval: 1000 });
        this.throttledFetch = throttle(async (url: string, init?: RequestInit) => {
            return fetch(url, init);
        });
    }

    /** Load HTML into a Cheerio instance. */
    protected loadHtml(html: string): CheerioAPI {
        return cheerio.load(html);
    }

    /**
     * Fetch a URL and return a Cheerio instance of the HTML.
     * Returns null on network failure.
     */
    protected async fetchPage(url: string): Promise<CheerioAPI | null> {
        try {
            const res = await this.throttledFetch(url);
            if (!res.ok) return null;
            const html = await res.text();
            return this.loadHtml(html);
        } catch {
            return null;
        }
    }

    /**
     * Scrape all pages, resuming from checkpointUrl if provided.
     * Subclasses implement the actual scraping logic.
     */
    abstract scrape(checkpointUrl?: string): AsyncGenerator<ScrapeRecord>;

    close(): void {
        this.db.close();
    }
}
