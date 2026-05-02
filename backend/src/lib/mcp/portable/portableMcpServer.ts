/**
 * PortableMcpServer — abstract base for portable MCP servers backed by SQLite.
 * Spec: Section 2.8, Chunk 14.
 *
 * Provides FTS5 BM25 search + retrieve-by-ID via stdio MCP protocol.
 * Subclasses implement the specific table schema and result formatting.
 */

import Database from "better-sqlite3";
import { FreshnessManager } from "./freshnessManager.js";

export interface SearchResult {
    [key: string]: unknown;
    freshness_warning?: string;
}

export abstract class PortableMcpServer {
    protected db: Database.Database;
    protected freshnessManager: FreshnessManager;
    protected source: string;

    constructor(dbPath: string, source: string, freshnessManager?: FreshnessManager) {
        this.db = new Database(dbPath);
        this.db.pragma("journal_mode = WAL");
        this.source = source;
        this.freshnessManager = freshnessManager ?? new FreshnessManager();
    }

    /**
     * FTS5 BM25 search. Subclasses provide the SQL query.
     * Automatically appends freshness_warning when data may be stale.
     */
    search(query: string, limit = 10): SearchResult[] {
        const log = this.freshnessManager.getLog(this.source);
        if (log?.status === "indexing_in_progress") {
            return [{ freshness_warning: "Indexing in progress — results may be incomplete." }];
        }

        const rows = this.executeSearch(query, limit);
        const warning = this.freshnessManager.getFreshnessWarning(this.source);

        if (warning) {
            return rows.map(row => ({ ...row, freshness_warning: warning }));
        }
        return rows;
    }

    /** Retrieve a single record by its ID. Subclasses implement. */
    abstract retrieve(id: string): SearchResult | null;

    /** Execute the FTS5 search query. Subclasses implement. */
    protected abstract executeSearch(query: string, limit: number): SearchResult[];

    close(): void {
        this.db.close();
    }
}
