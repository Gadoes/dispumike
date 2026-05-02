/**
 * ItalawMcpServer — portable MCP server for italaw.com cases.
 * Spec: Section 4.5, Chunk 15.
 *
 * Tools: search_italaw, retrieve_italaw
 * Citation URL format: https://italaw.com/cases/{id}
 */

import { PortableMcpServer, type SearchResult } from "../portableMcpServer.js";
import { FreshnessManager } from "../freshnessManager.js";

export class ItalawMcpServer extends PortableMcpServer {
    constructor(dbPath: string, freshnessManager?: FreshnessManager) {
        super(dbPath, "italaw", freshnessManager);
        this.db.prepare(
            "CREATE TABLE IF NOT EXISTS italaw_cases " +
            "(id TEXT PRIMARY KEY, url TEXT NOT NULL, case_name TEXT NOT NULL, " +
            "year TEXT, treaty TEXT, outcome TEXT, excerpt TEXT, " +
            "indexed_at TEXT NOT NULL DEFAULT (datetime('now')))"
        ).run();
        this.db.prepare(
            "CREATE VIRTUAL TABLE IF NOT EXISTS italaw_fts USING fts5" +
            "(case_name, treaty, outcome, excerpt, content=italaw_cases, content_rowid=rowid)"
        ).run();
    }

    protected executeSearch(query: string, limit: number): SearchResult[] {
        return this.db.prepare(
            "SELECT c.id, c.url, c.case_name, c.year, c.treaty, c.outcome, c.excerpt " +
            "FROM italaw_cases c JOIN italaw_fts f ON c.rowid = f.rowid " +
            "WHERE italaw_fts MATCH ? ORDER BY rank LIMIT ?"
        ).all(query, limit) as SearchResult[];
    }

    retrieve(id: string): SearchResult | null {
        return (this.db.prepare(
            "SELECT id, url, case_name, year, treaty, outcome, excerpt FROM italaw_cases WHERE id = ?"
        ).get(id) as SearchResult | undefined) ?? null;
    }
}
