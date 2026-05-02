/**
 * IcsidScraper — scrapes ICSID case database.
 * Spec: Section 4.6, Chunk 16.
 *
 * SQLite schema: icsid_cases + icsid_fts (FTS5) + trigger
 * Proceeding types: Award, Decision on Jurisdiction, Annulment
 */

import { BaseScraper, type ScrapeRecord } from "../baseScraper.js";

export interface IcsidRecord extends ScrapeRecord {
    case_name: string;
    case_number: string | null;
    proceeding_type: string;
    year: string | null;
    excerpt: string | null;
}

const CASES_INDEX_URL = "https://icsid.worldbank.org/cases/case-database";

export class IcsidScraper extends BaseScraper {
    constructor(dbPath: string) {
        super(dbPath);
        this.db.prepare(
            "CREATE TABLE IF NOT EXISTS icsid_cases " +
            "(id TEXT PRIMARY KEY, url TEXT NOT NULL, case_name TEXT NOT NULL, " +
            "case_number TEXT, proceeding_type TEXT, year TEXT, excerpt TEXT, " +
            "indexed_at TEXT NOT NULL DEFAULT (datetime('now')))"
        ).run();
        this.db.prepare(
            "CREATE VIRTUAL TABLE IF NOT EXISTS icsid_fts USING fts5" +
            "(case_name, case_number, proceeding_type, excerpt, content=icsid_cases, content_rowid=rowid)"
        ).run();
    }

    /** Insert a record, skipping duplicates (INSERT OR IGNORE). Manually syncs FTS5 index. */
    insertRecord(record: IcsidRecord): void {
        const result = this.db.prepare(
            "INSERT OR IGNORE INTO icsid_cases (id, url, case_name, case_number, proceeding_type, year, excerpt) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(record.id, record.url, record.case_name, record.case_number, record.proceeding_type, record.year, record.excerpt);

        if (result.changes > 0) {
            this.db.prepare(
                "INSERT INTO icsid_fts(rowid, case_name, case_number, proceeding_type, excerpt) " +
                "SELECT rowid, case_name, case_number, proceeding_type, excerpt FROM icsid_cases WHERE id = ?"
            ).run(record.id);
        }
    }

    /** Parse an ICSID case page into an IcsidRecord. */
    parseCasePage(html: string, url: string): IcsidRecord | null {
        const $ = this.loadHtml(html);
        const caseName = $("h1.case-name").text().trim();
        if (!caseName) return null;

        const caseNumber = $(".case-number").first().text().trim() || null;
        const proceedingType = $(".proceeding-type").first().text().trim() || "Award";
        const year = $(".year").first().text().trim() || null;
        const excerpt = $(".case-excerpt").first().text().trim().slice(0, 500) || null;

        const id = "icsid-" + (caseNumber ?? url).replace(/[^a-zA-Z0-9]/g, "-");

        return {
            id,
            url,
            case_name: caseName,
            case_number: caseNumber,
            proceeding_type: proceedingType,
            year,
            excerpt,
        };
    }

    async *scrape(checkpointUrl?: string): AsyncGenerator<IcsidRecord> {
        const $ = await this.fetchPage(CASES_INDEX_URL);
        if (!$) return;

        const caseLinks: string[] = [];
        $("a.case-link").each((_i, el) => {
            const href = $(el).attr("href");
            if (href) caseLinks.push(href);
        });

        let skipping = !!checkpointUrl;
        for (const link of caseLinks) {
            if (skipping) {
                if (link === checkpointUrl) skipping = false;
                continue;
            }

            const casePage = await this.fetchPage(link);
            if (!casePage) continue;

            const html = casePage.html() ?? "";
            const record = this.parseCasePage(html, link);
            if (!record) continue;

            this.insertRecord(record);
            yield record;
        }
    }
}
