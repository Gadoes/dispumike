/**
 * ItalawScraper — scrapes italaw.com case listings.
 * Spec: Section 4.5, Chunk 15.
 *
 * SQLite schema: italaw_cases + italaw_fts (FTS5) + trigger
 */

import { BaseScraper, type ScrapeRecord } from "../baseScraper.js";

export interface ItalawRecord extends ScrapeRecord {
    case_name: string;
    year: string | null;
    treaty: string | null;
    outcome: string | null;
    excerpt: string | null;
}

const CASES_INDEX_URL = "https://italaw.com/cases-by-respondent";

const SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS italaw_cases (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        case_name TEXT NOT NULL,
        year TEXT,
        treaty TEXT,
        outcome TEXT,
        excerpt TEXT,
        indexed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS italaw_fts USING fts5(
        case_name, treaty, outcome, excerpt,
        content=italaw_cases, content_rowid=rowid
    );

    CREATE TRIGGER IF NOT EXISTS italaw_fts_insert
    AFTER INSERT ON italaw_cases BEGIN
        INSERT INTO italaw_fts(rowid, case_name, treaty, outcome, excerpt)
        VALUES (new.rowid, new.case_name, new.treaty, new.outcome, new.excerpt);
    END;
`;

export class ItalawScraper extends BaseScraper {
    constructor(dbPath: string) {
        super(dbPath);
        this.db.exec(SCHEMA_SQL);
    }

    /** Insert a record, skipping duplicates (INSERT OR IGNORE). */
    insertRecord(record: ItalawRecord): void {
        this.db.prepare(`
            INSERT OR IGNORE INTO italaw_cases (id, url, case_name, year, treaty, outcome, excerpt)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(record.id, record.url, record.case_name, record.year, record.treaty, record.outcome, record.excerpt);
    }

    /** Parse a case page into an ItalawRecord. */
    parseCasePage(html: string, url: string): ItalawRecord | null {
        const $ = this.loadHtml(html);
        const caseName = $("h1.case-name").text().trim();
        if (!caseName) return null;

        const id = url.replace(/.*\/cases\//, "italaw-");
        return {
            id,
            url,
            case_name: caseName,
            year: $(".year").first().text().trim() || null,
            treaty: $(".treaty").first().text().trim() || null,
            outcome: $(".outcome").first().text().trim() || null,
            excerpt: $(".case-excerpt").first().text().trim().slice(0, 500) || null,
        };
    }

    async *scrape(checkpointUrl?: string): AsyncGenerator<ItalawRecord> {
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
