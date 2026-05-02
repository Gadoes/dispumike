/**
 * Portable DB Framework tests — Chunk 14.
 * Spec: Section 2.8, 5/Chunk 14.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { FreshnessManager, STALE_THRESHOLD_MS } from "./freshnessManager.js";
import { PortableMcpServer, type SearchResult } from "./portableMcpServer.js";
import { BaseScraper, type ScrapeRecord } from "./baseScraper.js";
import Database from "better-sqlite3";
import os from "os";
import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// FreshnessManager
// ---------------------------------------------------------------------------

describe("FreshnessManager", () => {
    let mgr: FreshnessManager;

    beforeEach(() => {
        mgr = new FreshnessManager();
    });

    it("isStale returns true for unknown source", () => {
        expect(mgr.isStale("italaw")).toBe(true);
    });

    it("startScrape sets status to indexing_in_progress", () => {
        mgr.startScrape("italaw");
        const log = mgr.getLog("italaw");
        expect(log?.status).toBe("indexing_in_progress");
    });

    it("completeScrape sets status to fresh", () => {
        mgr.startScrape("italaw");
        mgr.completeScrape("italaw", "https://italaw.com/cases/999");
        const log = mgr.getLog("italaw");
        expect(log?.status).toBe("fresh");
        expect(log?.last_checkpoint_url).toBe("https://italaw.com/cases/999");
    });

    it("failScrape sets status to error", () => {
        mgr.startScrape("italaw");
        mgr.failScrape("italaw");
        const log = mgr.getLog("italaw");
        expect(log?.status).toBe("error");
    });

    it("isStale returns false while indexing", () => {
        mgr.startScrape("italaw");
        expect(mgr.isStale("italaw")).toBe(false);
    });

    it("isStale returns false immediately after completeScrape", () => {
        mgr.startScrape("italaw");
        mgr.completeScrape("italaw");
        expect(mgr.isStale("italaw")).toBe(false);
    });

    it("isStale returns true after 24h", () => {
        mgr.startScrape("italaw");
        mgr.completeScrape("italaw");
        const log = mgr.getLog("italaw")!;
        const oldDate = new Date(Date.now() - STALE_THRESHOLD_MS - 3600_000).toISOString();
        Object.assign(log, { last_successful_scrape: oldDate });
        expect(mgr.isStale("italaw")).toBe(true);
    });

    it("getFreshnessWarning returns null for fresh source", () => {
        mgr.startScrape("italaw");
        mgr.completeScrape("italaw");
        expect(mgr.getFreshnessWarning("italaw")).toBeNull();
    });

    it("getFreshnessWarning returns message for error source", () => {
        mgr.startScrape("italaw");
        mgr.failScrape("italaw");
        const warning = mgr.getFreshnessWarning("italaw");
        expect(warning).toContain("Data may be stale");
    });

    it("updateCheckpoint updates the checkpoint url", () => {
        mgr.startScrape("italaw");
        mgr.completeScrape("italaw", "https://italaw.com/cases/1");
        mgr.updateCheckpoint("italaw", "https://italaw.com/cases/50");
        expect(mgr.getLog("italaw")?.last_checkpoint_url).toBe("https://italaw.com/cases/50");
    });
});

// ---------------------------------------------------------------------------
// PortableMcpServer (via concrete test subclass)
// ---------------------------------------------------------------------------

class TestPortableServer extends PortableMcpServer {
    constructor(dbPath: string, freshnessManager?: FreshnessManager) {
        super(dbPath, "test", freshnessManager);
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, content TEXT);
            CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(content, content=items, content_rowid=rowid);
        `);
    }

    insert(id: string, content: string): void {
        this.db.prepare("INSERT OR IGNORE INTO items VALUES (?, ?)").run(id, content);
        this.db.prepare("INSERT INTO items_fts(rowid, content) SELECT rowid, content FROM items WHERE id = ?").run(id);
    }

    protected executeSearch(query: string, limit: number): SearchResult[] {
        return this.db.prepare(
            "SELECT i.id, i.content FROM items i JOIN items_fts f ON i.rowid = f.rowid WHERE items_fts MATCH ? ORDER BY rank LIMIT ?"
        ).all(query, limit) as SearchResult[];
    }

    retrieve(id: string): SearchResult | null {
        return (this.db.prepare("SELECT id, content FROM items WHERE id = ?").get(id) as SearchResult | undefined) ?? null;
    }
}

describe("PortableMcpServer", () => {
    let tmpDb: string;
    let server: TestPortableServer;

    beforeEach(() => {
        tmpDb = path.join(os.tmpdir(), `test-portable-${Date.now()}.db`);
        server = new TestPortableServer(tmpDb);
        server.insert("case-1", "arbitration investment treaty ICSID dispute");
        server.insert("case-2", "commercial contract breach damages award");
    });

    afterEach(() => {
        server.close();
        if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    });

    it("search returns matching records", () => {
        const results = server.search("arbitration");
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].content).toContain("arbitration");
    });

    it("retrieve returns a record by ID", () => {
        const rec = server.retrieve("case-1");
        expect(rec).not.toBeNull();
        expect(rec?.id).toBe("case-1");
    });

    it("retrieve returns null for unknown ID", () => {
        expect(server.retrieve("does-not-exist")).toBeNull();
    });

    it("search returns indexing_in_progress message when indexing", () => {
        const mgr = new FreshnessManager();
        mgr.startScrape("test");
        const s = new TestPortableServer(tmpDb, mgr);
        const results = s.search("arbitration");
        expect(results[0].freshness_warning).toContain("Indexing in progress");
        s.close();
    });

    it("search includes freshness_warning for error status", () => {
        const mgr = new FreshnessManager();
        mgr.startScrape("test");
        mgr.failScrape("test");
        const s = new TestPortableServer(tmpDb, mgr);
        const results = s.search("arbitration");
        results.forEach(r => {
            expect(r.freshness_warning).toContain("Data may be stale");
        });
        s.close();
    });
});

// ---------------------------------------------------------------------------
// BaseScraper (via concrete test subclass)
// ---------------------------------------------------------------------------

class TestScraper extends BaseScraper {
    async *scrape(_checkpointUrl?: string): AsyncGenerator<ScrapeRecord> {
        yield { id: "1", url: "https://example.com/1" };
        yield { id: "2", url: "https://example.com/2" };
    }
}

describe("BaseScraper", () => {
    let tmpDb: string;
    let scraper: TestScraper;

    beforeEach(() => {
        tmpDb = path.join(os.tmpdir(), `test-scraper-${Date.now()}.db`);
        scraper = new TestScraper(tmpDb);
    });

    afterEach(() => {
        scraper.close();
        if (fs.existsSync(tmpDb)) fs.unlinkSync(tmpDb);
    });

    it("scrape yields records", async () => {
        const records: ScrapeRecord[] = [];
        for await (const rec of scraper.scrape()) {
            records.push(rec);
        }
        expect(records).toHaveLength(2);
        expect(records[0].id).toBe("1");
    });

    it("loadHtml returns a cheerio instance with parseable content", () => {
        const html = "<html><body><h1>Test</h1></body></html>";
        // @ts-expect-error accessing protected method for testing
        const $ = scraper.loadHtml(html);
        expect($("h1").text()).toBe("Test");
    });

    it("throttledFetch is a function", () => {
        // @ts-expect-error accessing protected property for testing
        expect(typeof scraper.throttledFetch).toBe("function");
    });
});
