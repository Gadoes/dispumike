# MCP Integration — Implementation Resume Context

**Date written:** 2026-05-02  
**Working directory:** /Users/ahmadgado/Documents/GitHub/dispumike  
**Branch:** main  
**Spec:** data/specs/mcp-integration-spec.md

---

## What is this project?

Dispumike is a legal research app. We are integrating MCP (Model Context Protocol) servers for 6 legal databases: CourtListener, GovInfo, Al-Meezan, EUR-Lex, italaw, ICSID.

## Chunks completed (merged to main)

| Chunk | Name | Status |
|-------|------|--------|
| 1 | MCP Host Plumbing (lazy-spawn singleton) | ✅ merged |
| 2 | Mock MCP Server for Tests | ✅ merged |
| 3 | Tool Registration in Agent Loop | ✅ merged |
| 4 | Citation Data Model + Storage | ✅ merged |
| 5 | Citation Rendering Component | ✅ merged |
| 6 | Source Connections DB + Key Encryption | ✅ merged |
| 7 | Source Picker Popover UI | ✅ merged |
| 8 | Per-Query Scope Toggling | ✅ merged |
| 9 | DELETED (no router) | N/A |
| 10 | CourtListener Integration | ✅ merged |
| 11 | GovInfo Integration | ✅ merged |
| 12 | Al-Meezan Integration | ✅ merged |

**Tests:** 110 passing, 0 failing (`npx vitest run` from backend/)

---

## Chunks remaining (implement in this order)

### Chunk 13: EUR-Lex Integration
**Branch:** chunk-13-eurlex  
**Depends on:** Chunks 3, 6 (done)  
**Files to create:**
- `backend/src/lib/mcp/servers/eurLex.ts` — server config (same pattern as alMeezan.ts)
- `backend/src/__fixtures__/eurlex/search-response.json` — sample EUR-Lex results
- `backend/src/lib/mcp/eurLex.test.ts` — tests

**Key spec details (Section 4.4):**
- Package: `eur-lex-mcp` (scimorph) — check if available, stub if not
- No API key needed
- source_type="eurlex", source_id=celex number
- Citation parser already written in citationParser.ts (parseEurLexResult)
- Test: source_id is a valid CELEX number (e.g. "32016R0679")
- Test: 503 error → source_unavailable
- Fixture: `{"results": [{"celex": "32016R0679", "title": "General Data Protection Regulation", "date": "2016-04-27", "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679", "excerpt": "processing of personal data"}]}`

---

### Chunk 14: Portable DB Framework
**Branch:** chunk-14-portable-db  
**Depends on:** Chunk 1 (done)  
**Install first:**
```bash
cd backend && npm install better-sqlite3 p-throttle cheerio && npm install -D @types/better-sqlite3 @types/cheerio
```

**Files to create:**
- `backend/src/lib/mcp/portable/baseScraper.ts` — abstract BaseScraper class
- `backend/src/lib/mcp/portable/portableMcpServer.ts` — abstract PortableMcpServer class
- `backend/src/lib/mcp/portable/freshnessManager.ts` — FreshnessManager class
- `backend/src/lib/mcp/portable/portable.test.ts` — tests

**Key spec details (Sections 2.8, 5/Chunk 14):**
- BaseScraper: throttled fetch (1 req/sec via p-throttle), cheerio parsing, better-sqlite3 inserts
- Resumability: reads freshness_log.last_checkpoint_url from Supabase; skips already-indexed; INSERT OR IGNORE; updates checkpoint after each insert
- Graceful degradation: on failure, sets status="error", search results include {freshness_warning: "Data may be stale — last successful scrape: {date}"}
- PortableMcpServer: FTS5 BM25 search + retrieve by ID via stdio MCP protocol
- FreshnessManager: checks freshness_log, triggers scrape if stale (>24h), first-run returns "indexing in progress"

---

### Chunk 15: italaw Portable DB
**Branch:** chunk-15-italaw  
**Depends on:** Chunk 14

**Files to create:**
- `backend/src/lib/mcp/portable/italaw/scraper.ts` — ItalawScraper extends BaseScraper
- `backend/src/lib/mcp/portable/italaw/server.ts` — ItalawMcpServer extends PortableMcpServer
- `backend/scripts/scrape-italaw.ts`
- `backend/src/__fixtures__/italaw/html/case1.html` through `case5.html`
- `backend/src/lib/mcp/portable/italaw/italaw.test.ts`

**Key spec details (Sections 4.5, 5/Chunk 15):**
- SQLite schema already in spec Section 3 (italaw_cases + italaw_fts FTS5 + trigger)
- Tools: search_italaw, retrieve_italaw
- Citation URL format: `https://italaw.com/cases/{id}`
- Add to package.json: `"scrape:italaw": "tsx scripts/scrape-italaw.ts"`

---

### Chunk 16: ICSID Portable DB
**Branch:** chunk-16-icsid  
**Depends on:** Chunk 14

**Files to create:**
- `backend/src/lib/mcp/portable/icsid/scraper.ts` — IcsidScraper extends BaseScraper
- `backend/src/lib/mcp/portable/icsid/server.ts` — IcsidMcpServer extends PortableMcpServer
- `backend/scripts/scrape-icsid.ts`
- `backend/src/__fixtures__/icsid/html/` — 5 HTML files, at least one per type (award, jurisdiction, annulment)
- `backend/src/lib/mcp/portable/icsid/icsid.test.ts`

**Key spec details (Sections 4.6, 5/Chunk 16):**
- SQLite schema: icsid_cases + icsid_fts (same pattern as italaw but with proceeding_type instead of treaty/outcome combined)
- Three URL patterns: award, decision on jurisdiction, annulment
- Tools: search_icsid, retrieve_icsid
- Citation URLs: icsid.worldbank.org
- Add to package.json: `"scrape:icsid": "tsx scripts/scrape-icsid.ts"`

---

### Chunk 17: Caching Layer
**Branch:** chunk-17-cache  
**Depends on:** Chunk 3 (done)

**Files to create:**
- `backend/migrations/004_cache_results.sql`
- `backend/src/lib/mcp/queryNormalizer.ts` — normalizeQuery(q)
- `backend/src/lib/mcp/cache.ts` — CacheManager + cacheManager singleton
- `backend/src/lib/mcp/cache.test.ts`
- `backend/src/lib/mcp/queryNormalizer.test.ts`

**Key spec details (Sections 2.5, 5/Chunk 17):**
- normalizeQuery steps: lowercase → collapse whitespace → strip leading/trailing punctuation. NO stop-word removal.
- Cache key: SHA-256 of `${source}:${normalizedQuery}` (Node crypto module)
- TTL: stable sources (al-meezan, italaw, icsid) = 86400s; live (courtlistener, eurlex, govinfo) = 3600s
- Critical test: "FIDIC time-bar", "fidic time-bar", "  FIDIC  TIME-BAR  ", "FIDIC time-bar." → all same cache key
- add cache_hit field to mcp_tool_call_start SSE event

---

### Chunk 18: Circuit Breakers + Retries
**Branch:** chunk-18-circuit-breaker  
**Depends on:** Chunk 3 (done)

**Files to create:**
- `backend/src/lib/mcp/circuitBreaker.ts`
- `backend/src/lib/mcp/circuitBreaker.test.ts`

**Key spec details (Sections 2.7, 5/Chunk 18):**
- States: closed → open → half-open
- Opens after 3 consecutive failures within 60s window
- Reset: exponential backoff 60s → 120s → 240s → 300s cap
- Retry wrapper: 2 attempts (500ms, 1000ms backoff) before recording failure
- When circuit opens: remove source tools from activeTools, emit source_unavailable SSE, append note to system prompt
- Use Vitest fake timers for ALL timing tests

---

### Chunk 19: Telemetry Dashboard (Admin Only)
**Branch:** chunk-19-telemetry  
**Depends on:** Chunk 18

**Files to create:**
- `backend/migrations/005_mcp_events.sql`
- `backend/src/routes/admin.ts` — GET /admin/mcp-telemetry (403 for non-admin)
- `frontend/src/app/(pages)/admin/mcp-telemetry/page.tsx` — admin-only page
- `backend/src/routes/admin.test.ts`

**Key spec details (Section 5/Chunk 19):**
- is_admin check via user_profiles.is_admin (column added in Chunk 6 migration: backend/migrations/003_user_profiles_additions.sql)
- Returns per-source aggregates: total calls, success rate %, avg latency ms, cache hit rate %, 24h error count
- Nightly cleanup: DELETE FROM mcp_events WHERE created_at < NOW() - INTERVAL '30 days'
- Frontend renders 404 for non-admin; table + 60s auto-refresh for admin
- Look at existing routes (backend/src/routes/) for auth middleware pattern

**Existing frontend pages to reference:**
- `frontend/src/app/(pages)/` — look for existing page structure

---

### Chunk 20: Citation URL Liveness + Side-by-Side Viewer
**Branch:** chunk-20-liveness  
**Depends on:** Chunk 5 (done)

**Files to create/modify:**
- `backend/src/lib/mcp/citationLiveness.ts` — CitationLivenessChecker
- Route: POST /citations/:id/check-liveness (add to existing citations route or new file)
- Modify: `frontend/src/app/components/assistant/CitationCard.tsx` — wire "Verify and read" button to open side panel

**Key spec details (Section 5/Chunk 20):**
- HEAD request, 5s timeout
- Returns: 'live' (2xx) | 'unreachable' (non-2xx or timeout)
- NEVER 'verified' or 'unverified'
- Auto-check on citation creation (background, non-blocking)
- Side panel: iframe (source URL) + excerpt side by side, close button, NO automated verdict
- REQUIRED comment in citationLiveness.ts:
  ```
  // NOTE: This service checks only URL reachability (HEAD request).
  // Full claim-level verification — Feature 2 (hallucination council) — is out of scope here.
  // Do not introduce text-matching logic in this file.
  ```
- CitationCard already has liveness dot logic for all 3 statuses (unchecked/live/unreachable) — just needs the side panel wired up

---

## Existing key files (reference)

- `backend/src/lib/mcp/types.ts` — all TypeScript types including Citation, CitationLivenessStatus
- `backend/src/lib/mcp/citationParser.ts` — parsers for all 6 source types (already complete)
- `backend/src/lib/mcp/clientManager.ts` — McpClientManager singleton
- `backend/src/lib/mcp/encryption.ts` — encryptApiKey/decryptApiKey
- `backend/src/lib/mcp/servers/courtlistener.ts` — pattern for server configs
- `backend/src/lib/mcp/servers/alMeezan.ts` — pattern (no API key)
- `frontend/src/app/components/assistant/CitationCard.tsx` — CitationList + CitationCard + liveness dot
- `frontend/src/app/components/assistant/SourcePickerPopover.tsx`
- `backend/migrations/` — existing SQL migration files

## Per-chunk process (follow for every chunk)

1. `git checkout -b chunk-N-slug`
2. Implement files
3. `cd backend && npx vitest run 2>&1 | tail -15` — fix until all pass
4. `npx tsc --noEmit 2>&1 | head -20` — fix type errors
5. `git add -A && git commit -m "Chunk N: name"`
6. `git checkout main && git merge chunk-N-slug --no-ff -m "Merge Chunk N: name" && git branch -d chunk-N-slug`
7. For chunks with frontend: also run `cd frontend && npx tsc --noEmit 2>&1 | head -20`

## Rules (never violate)

- Work ONLY inside /Users/ahmadgado/Documents/GitHub/dispumike
- No heuristic router, no scoring/ranking for source selection
- liveness_status: ONLY 'unchecked' | 'live' | 'unreachable' — NEVER 'verified'/'unverified'
- Every chunk must have passing tests before next chunk
- Spec is the contract — no silent deviations

## After all chunks done

Run final checks:
```bash
cd /Users/ahmadgado/Documents/GitHub/dispumike/backend && npx vitest run
cd /Users/ahmadgado/Documents/GitHub/dispumike/backend && npx tsc --noEmit
cd /Users/ahmadgado/Documents/GitHub/dispumike/frontend && npx tsc --noEmit
```

Create `/Users/ahmadgado/Documents/GitHub/dispumike/IMPLEMENTATION_STATUS.md` with chunk-by-chunk status, test count, open questions.
