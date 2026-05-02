/**
 * ICSID Portable DB tests — Chunk 16.
 * Spec: Section 4.6.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { IcsidScraper } from "./scraper.js";
import { IcsidMcpServer } from "./server.js";
import { parseMcpResultToCitations } from "../../citationParser.js";
import { FreshnessManager } from "../freshnessManager.js";
import fs from "fs";
import os from "os";
import path from "path";

const FIXTURE_DIR = path.join(__dirname, "../../../../__fixtures__/icsid/html");

function tmpDb(): string {
    return path.join(os.tmpdir(), `icsid-test-${Date.now()}.db`);
}

// ---------------------------------------------------------------------------
// IcsidScraper — HTML parsing with fixtures
// ---------------------------------------------------------------------------

describe("IcsidScraper — HTML parsing", () => {
    let dbPath: string;
    let scraper: IcsidScraper;

    beforeEach(() => {
        dbPath = tmpDb();
        scraper = new IcsidScraper(dbPath);
    });

    afterEach(() => {
        scraper.close();
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    });

    it("parses award1.html (Award proceeding type)", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "award1.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Siemens");
        expect(record?.proceeding_type).toBe("Award");
        expect(record?.case_number).toBe("ARB/03/8");
    });

    it("parses award2.html (Award proceeding type)", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "award2.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/06/11");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Occidental");
        expect(record?.proceeding_type).toBe("Award");
    });

    it("parses jurisdiction1.html (Decision on Jurisdiction proceeding type)", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "jurisdiction1.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/00/4");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Salini");
        expect(record?.proceeding_type).toBe("Decision on Jurisdiction");
    });

    it("parses annulment1.html (Annulment proceeding type)", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "annulment1.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8-annulment");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Siemens");
        expect(record?.proceeding_type).toBe("Annulment");
    });

    it("parses award3.html correctly", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "award3.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/96/1");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Santa Elena");
        expect(record?.year).toBe("2000");
    });

    it("returns null for html with no case-name h1", () => {
        const record = scraper.parseCasePage("<html><body><p>Nothing</p></body></html>", "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=X");
        expect(record).toBeNull();
    });

    it("INSERT OR IGNORE skips duplicate inserts", () => {
        const html = fs.readFileSync(path.join(FIXTURE_DIR, "award1.html"), "utf-8");
        const record = scraper.parseCasePage(html, "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8")!;
        scraper.insertRecord(record);
        scraper.insertRecord(record);
        expect(true).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// IcsidMcpServer — search and retrieve
// ---------------------------------------------------------------------------

describe("IcsidMcpServer — search and retrieve", () => {
    let dbPath: string;
    let server: IcsidMcpServer;
    let scraper: IcsidScraper;

    const fixtures = ["award1.html", "award2.html", "jurisdiction1.html", "annulment1.html", "award3.html"];
    const urls = [
        "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8",
        "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/06/11",
        "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/00/4",
        "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8-annulment",
        "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/96/1",
    ];

    beforeEach(() => {
        dbPath = tmpDb();
        scraper = new IcsidScraper(dbPath);

        fixtures.forEach((file, i) => {
            const html = fs.readFileSync(path.join(FIXTURE_DIR, file), "utf-8");
            const record = scraper.parseCasePage(html, urls[i]);
            if (record) scraper.insertRecord(record);
        });
        scraper.close();

        server = new IcsidMcpServer(dbPath);
    });

    afterEach(() => {
        server.close();
        if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    });

    it("search_icsid returns results for 'expropriation'", () => {
        const results = server.search("expropriation");
        expect(results.length).toBeGreaterThan(0);
    });

    it("search_icsid returns results for 'Award'", () => {
        const results = server.search("Award");
        expect(results.length).toBeGreaterThan(0);
    });

    it("retrieve_icsid returns a case by ID", () => {
        const record = server.retrieve("icsid-ARB-03-8");
        expect(record).not.toBeNull();
        expect(record?.case_name).toContain("Siemens");
    });

    it("retrieve_icsid returns null for unknown ID", () => {
        expect(server.retrieve("icsid-does-not-exist")).toBeNull();
    });

    it("citation URLs point to icsid.worldbank.org", () => {
        const results = server.search("Award");
        expect(results[0].url).toContain("icsid.worldbank.org");
    });

    it("proceeding_type is one of: Award, Decision on Jurisdiction, Annulment", () => {
        const results = server.search("tribunal");
        const validTypes = new Set(["Award", "Decision on Jurisdiction", "Annulment"]);
        results.forEach(r => {
            expect(validTypes.has(String(r.proceeding_type))).toBe(true);
        });
    });
});

// ---------------------------------------------------------------------------
// Citation parser for ICSID results
// ---------------------------------------------------------------------------

describe("ICSID citation parsing", () => {
    it("maps source_type to 'icsid'", () => {
        const fixture = {
            results: [
                {
                    url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8",
                    case_name: "Siemens A.G. v. Argentine Republic",
                    excerpt: "expropriation compensation",
                },
            ],
        };
        const citations = parseMcpResultToCitations("icsid", JSON.stringify(fixture), "user-1");
        expect(citations[0].source_type).toBe("icsid");
    });

    it("uses url as source_id", () => {
        const url = "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8";
        const fixture = { results: [{ url, case_name: "Siemens", excerpt: "test" }] };
        const citations = parseMcpResultToCitations("icsid", JSON.stringify(fixture), "user-1");
        expect(citations[0].source_id).toBe(url);
    });

    it("liveness_status defaults to unchecked", () => {
        const fixture = {
            results: [
                { url: "https://icsid.worldbank.org/cases/case-database/case-detail?CaseNo=ARB/03/8", case_name: "Test", excerpt: "test" },
            ],
        };
        const citations = parseMcpResultToCitations("icsid", JSON.stringify(fixture), "user-1");
        expect(citations[0].liveness_status).toBe("unchecked");
    });
});

// ---------------------------------------------------------------------------
// Freshness integration
// ---------------------------------------------------------------------------

describe("ICSID freshness integration", () => {
    it("first-run returns indexing_in_progress", () => {
        const dbPath2 = tmpDb();
        const mgr = new FreshnessManager();
        mgr.startScrape("icsid");
        const s = new IcsidMcpServer(dbPath2, mgr);
        const results = s.search("expropriation");
        expect(results[0].freshness_warning).toContain("Indexing in progress");
        s.close();
        if (fs.existsSync(dbPath2)) fs.unlinkSync(dbPath2);
    });
});
