/**
 * scrape-icsid.ts — CLI runner for the IcsidScraper.
 * Usage: npx tsx scripts/scrape-icsid.ts [path/to/icsid.db]
 */

import { IcsidScraper } from "../src/lib/mcp/portable/icsid/scraper.js";
import path from "path";

const dbPath = process.argv[2] ?? path.join(process.cwd(), "icsid.db");
const scraper = new IcsidScraper(dbPath);

let count = 0;
console.log(`[scrape-icsid] Starting scrape → ${dbPath}`);

try {
    for await (const record of scraper.scrape()) {
        count++;
        if (count % 50 === 0) {
            console.log(`[scrape-icsid] ${count} cases indexed (last: ${record.url})`);
        }
    }
    console.log(`[scrape-icsid] Done. ${count} cases indexed.`);
} catch (err) {
    console.error("[scrape-icsid] Error during scrape:", err);
    process.exit(1);
} finally {
    scraper.close();
}
