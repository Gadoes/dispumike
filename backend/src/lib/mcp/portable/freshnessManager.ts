/**
 * FreshnessManager — checks freshness_log and triggers re-scrape if stale.
 * Spec: Section 2.8, Chunk 14.
 *
 * - Stale threshold: 24 hours
 * - First-run: returns "indexing_in_progress"
 * - On scrape failure: sets status="error", search results include freshness_warning
 */

export type FreshnessStatus =
    | "fresh"
    | "stale"
    | "indexing_in_progress"
    | "error";

export interface FreshnessLog {
    source: string;
    status: FreshnessStatus;
    last_successful_scrape: string | null;
    last_checkpoint_url: string | null;
    updated_at: string;
}

export const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export class FreshnessManager {
    private logs = new Map<string, FreshnessLog>();

    /** Record the start of a scrape (first-run detection). */
    startScrape(source: string): void {
        const existing = this.logs.get(source);
        if (!existing) {
            this.logs.set(source, {
                source,
                status: "indexing_in_progress",
                last_successful_scrape: null,
                last_checkpoint_url: null,
                updated_at: new Date().toISOString(),
            });
        } else {
            this.logs.set(source, {
                ...existing,
                status: "indexing_in_progress",
                updated_at: new Date().toISOString(),
            });
        }
    }

    /** Record a successful scrape completion. */
    completeScrape(source: string, lastCheckpointUrl?: string): void {
        const now = new Date().toISOString();
        this.logs.set(source, {
            source,
            status: "fresh",
            last_successful_scrape: now,
            last_checkpoint_url: lastCheckpointUrl ?? null,
            updated_at: now,
        });
    }

    /** Record a scrape failure. */
    failScrape(source: string): void {
        const existing = this.logs.get(source);
        this.logs.set(source, {
            source: existing?.source ?? source,
            status: "error",
            last_successful_scrape: existing?.last_successful_scrape ?? null,
            last_checkpoint_url: existing?.last_checkpoint_url ?? null,
            updated_at: new Date().toISOString(),
        });
    }

    /** Update the checkpoint URL after each record insert. */
    updateCheckpoint(source: string, checkpointUrl: string): void {
        const existing = this.logs.get(source);
        if (existing) {
            this.logs.set(source, {
                ...existing,
                last_checkpoint_url: checkpointUrl,
                updated_at: new Date().toISOString(),
            });
        }
    }

    /** Get the current freshness log for a source. */
    getLog(source: string): FreshnessLog | null {
        return this.logs.get(source) ?? null;
    }

    /**
     * Check if a source needs re-scraping.
     * Returns true when: no log exists, status is "stale", or last_successful_scrape
     * is older than STALE_THRESHOLD_MS.
     */
    isStale(source: string): boolean {
        const log = this.logs.get(source);
        if (!log) return true;
        if (log.status === "indexing_in_progress") return false;
        if (!log.last_successful_scrape) return true;

        const lastScrape = new Date(log.last_successful_scrape).getTime();
        return Date.now() - lastScrape > STALE_THRESHOLD_MS;
    }

    /**
     * Build a freshness_warning message for stale/error sources.
     * Included in search results per spec Section 2.8.
     */
    getFreshnessWarning(source: string): string | null {
        const log = this.logs.get(source);
        if (!log) return null;
        if (log.status === "error" || log.status === "stale") {
            const date = log.last_successful_scrape
                ? new Date(log.last_successful_scrape).toLocaleDateString()
                : "unknown";
            return `Data may be stale — last successful scrape: ${date}`;
        }
        return null;
    }
}
