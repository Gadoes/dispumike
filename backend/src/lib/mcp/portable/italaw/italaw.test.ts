/**
 * italaw Portable DB tests — Chunk 15.
 * Spec: Section 4.5.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ItalawScraper } from "./scraper.js";
import { ItalawMcpServer } from "./server.js";
import { parseMcpResultToCitations } from "../../citationParser.js";
import { FreshnessManager } from "../freshnessManager.js";
import fs from "fs";
import os from "os";
import path from "path";

function tmpDb(): string {
    return path.join(os.tmpdir(), `italaw-test-${Date.now()}.db`);
}

// ---------------------------------------------------------------------------
// ItalawScraper — HTML parsing with fixtures
// ---------------------------------------------------------------------------

const FIXTURE_DIR = path.join(__dirname, "../../../../__fixtures__/italaw/html");

describe("ItalawScraper — HTML parsing", () => {
    let dbPath: string;
    let scraper: ItalawScraper;

    beforeEach(() => {
        dbPath = tmpDb();
        scraper = new ItalawScraper(dbPath);
    });

    afterEach(() => {
        scraper.close();
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    });

    it("parses case1.html correctly", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "case1.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://italaw.com/cases/671");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Metalclad");
        expect(record?.treaty).toBe("NAFTA");
        expect(record?.year).toBe("2000");
    });

    it("parses case2.html correctly", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "case2.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://italaw.com/cases/629");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Loewen");
        expect(record?.treaty).toBe("NAFTA");
    });

    it("parses case3.html with BIT treaty", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "case3.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://italaw.com/cases/767");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Occidental");
        expect(record?.treaty).toContain("BIT");
    });

    it("parses case4.html with Energy Charter Treaty", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "case4.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://italaw.com/cases/1872");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Vattenfall");
        expect(record?.treaty).toContain("Energy Charter");
    });

    it("parses case5.html correctly", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "case5.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://italaw.com/cases/1001");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Siemens");
    });

    it("returns null for html with no case-name h1", () => {
        const record = scraper.parseCasePage("<html><body><p>Nothing here</p></body></html>", "https://italaw.com/cases/0");
        expect(record).toBeNull();
    });

    it("INSERT OR IGNORE skips duplicate inserts", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "case1.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://italaw.com/cases/671")!;
        scraper.insertRecord(record);
        scraper.insertRecord(record); // should not throw
        // If we get here without error, INSERT OR IGNORE worked
        expect(true).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// ItalawMcpServer — search and retrieve
// ---------------------------------------------------------------------------

describe("ItalawMcpServer — search and retrieve", () => {
    let dbPath: string;
    let server: ItalawMcpServer;
    let scraper: ItalawScraper;

    beforeEach(() => {
        dbPath = tmpDb();
        scraper = new ItalawScraper(dbPath);

        // Index all 5 fixture cases
        const fixtures = ["case1.html", "case2.html", "case3.html", "case4.html", "case5.html"];
        const urls = [
            "https://italaw.com/cases/671",
            "https://italaw.com/cases/629",
            "https://italaw.com/cases/767",
            "https://italaw.com/cases/1872",
            "https://italaw.com/cases/1001",
        ];
        fixtures.forEach((file, i) => {
            const html = fs.readFileSync(path.join(FIXTURE_DIR, file), "utf-8");
            const record = scraper.parseCasePage(html, urls[i]);
            if (record) scraper.insertRecord(record);
        });
        scraper.close();

        server = new ItalawMcpServer(dbPath);
    });

    afterEach(() => {
        server.close();
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    });

    it("search_italaw returns results for 'NAFTA'", () => {
        const results = server.search("NAFTA");
        expect(results.length).toBeGreaterThan(0);
    });

    it("search_italaw returns results for 'treaty'", () => {
        const results = server.search("treaty");
        expect(results.length).toBeGreaterThan(0);
    });

    it("retrieve_italaw returns a case by ID", () => {
        const record = server.retrieve("italaw-671");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Metalclad");
    });

    it("retrieve_italaw returns null for unknown ID", () => {
        expect(server.retrieve("italaw-does-not-exist")).toBeNull();
    });

    it("citation URL format is https://italaw.com/cases/{id}", () => {
        const results = server.search("NAFTA");
        expect(results[0].url).toContain("italaw.com/cases/");
    });
});

// ---------------------------------------------------------------------------
// Citation parser for italaw results
// ---------------------------------------------------------------------------

describe("italaw citation parsing", () => {
    it("maps source_type to 'italaw'", () => {
        const fixture = {
            results: [
                {
                    url: "https://italaw.com/cases/671",
                    case_name: "Metalclad Corporation v. United Mexican States",
                    excerpt: "NAFTA Chapter 11 violation",
                },
            ],
        };
        const citations = parseMcpResultToCitations("italaw", JSON.stringify(fixture), "user-1");
        expect(citations[0].source_type).toBe("italaw");
    });

    it("uses url as source_id", () => {
        const fixture = {
            results: [
                {
                    url: "https://italaw.com/cases/671",
                    case_name: "Metalclad Corporation v. United Mexican States",
                    excerpt: "NAFTA violation",
                },
            ],
        };
        const citations = parseMcpResultToCitations("italaw", JSON.stringify(fixture), "user-1");
        expect(citations[0].source_id).toBe("https://italaw.com/cases/671");
    });

    it("liveness_status defaults to unchecked", () => {
        const fixture = {
            results: [
                { url: "https://italaw.com/cases/671", case_name: "Test Case", excerpt: "test" },
            ],
        };
        const citations = parseMcpResultToCitations("italaw", JSON.stringify(fixture), "user-1");
        expect(citations[0].liveness_status).toBe("unchecked");
    });
});

// ---------------------------------------------------------------------------
// Freshness integration
// ---------------------------------------------------------------------------

describe("italaw freshness integration", () => {
    it("first-run returns indexing_in_progress", () => {
        const dbPath2 = tmpDb();
        const mgr = new FreshnessManager();
        mgr.startScrape("italaw");
        const s = new ItalawMcpServer(dbPath2, mgr);
        const results = s.search("arbitration");
        expect(results[0].freshness_warning).toContain("Indexing in progress");
        s.close();
        if (fs.existsSync(dbPath2)) fs.unlinkSync(dbPath2);
    });
});
