/**
 * scrape-italaw.ts — CLI runner for the ItalawScraper.
 * Usage: npx tsx scripts/scrape-italaw.ts [--db path/to/italaw.db]
 */

import { ItalawScraper } from "../src/lib/mcp/portable/italaw/scraper.js";
import path from "path";

const dbPath = process.argv[2] ?? path.join(process.cwd(), "italaw.db");
const scraper = new ItalawScraper(dbPath);

let count = 0;
console.log(`[scrape-italaw] Starting scrape → ${dbPath}`);

try {
    for await (const record of scraper.scrape()) {
        count++;
        if (count % 50 === 0) {
            console.log(`[scrape-italaw] ${count} cases indexed (last: ${record.url})`);
        }
    }
    console.log(`[scrape-italaw] Done. ${count} cases indexed.`);
} catch (err) {
    console.error("[scrape-italaw] Error during scrape:", err);
    process.exit(1);
} finally {
    scraper.close();
}
