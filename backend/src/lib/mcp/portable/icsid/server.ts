/**
 * IcsidMcpServer — portable MCP server for ICSID cases.
 * Spec: Section 4.6, Chunk 16.
 *
 * Tools: search_icsid, retrieve_icsid
 * Citation URLs: icsid.worldbank.org
 */

import { PortableMcpServer, type SearchResult } from "../portableMcpServer.js";
import { FreshnessManager } from "../freshnessManager.js";

export class IcsidMcpServer extends PortableMcpServer {
    constructor(dbPath: string, freshnessManager?: FreshnessManager) {
        super(dbPath, "icsid", freshnessManager);
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

    protected executeSearch(query: string, limit: number): SearchResult[] {
        return this.db.prepare(
            "SELECT c.id, c.url, c.case_name, c.case_number, c.proceeding_type, c.year, c.excerpt " +
            "FROM icsid_cases c JOIN icsid_fts f ON c.rowid = f.rowid " +
            "WHERE icsid_fts MATCH ? ORDER BY rank LIMIT ?"
        ).all(query, limit) as SearchResult[];
    }

    retrieve(id: string): SearchResult | null {
        return (this.db.prepare(
            "SELECT id, url, case_name, case_number, proceeding_type, year, excerpt FROM icsid_cases WHERE id = ?"
        ).get(id) as SearchResult | undefined) ?? null;
    }
}
