# MCP Integration Specification
## Dispumike — Legal Database Research via MCP

*Status: Draft v2 — revised for review — 2026-05-01*

---

## CHANGELOG — v1 → v2

### Architecture (Section 2)
- **2.1:** Lazy-spawn with 15-min idle TTL replaces eager-spawn at boot. Per-server request queue (max depth 10). Process pool mentioned as v1.5 upgrade path.
- **2.2:** Heuristic router removed entirely. Source selection is user-driven via Chunk 8 (per-query scope). LLM picks from the connected-and-active set via standard tool selection.
- **2.3:** Two-tier truncation replaces flat 4,000-token cap — full result list (all titles + URLs + 1-sentence excerpts) plus full excerpts for first 5–10 results only.
- **2.5:** Cache key normalization specified explicitly: lowercase, collapse whitespace, strip leading/trailing punctuation. Stop words not removed.
- **2.6:** API keys encrypted at rest via Supabase Vault (or AES-256-GCM with env master key). `key_version` tag stored for rotation. Key rotation path documented. Launch-gate audit checklist added. **Migration path for existing plaintext rows explicitly specified:** `mcp_connections` is a new table — empty at migration time, encryption from row zero. Fallback one-time migration script documented for edge-case pre-existing rows.
- **2.7:** System prompt diff when circuit opens now specified — tool definition removed from active tool list AND prose note appended. Circuit breaker reset changed from static 5 min to exponential backoff (60s initial, doubles up to 5-min cap).

### Data Model (Section 3)
- `citations`: `verification_status` → `liveness_status` (`unchecked` | `live` | `unreachable`). Added `(user_id, source_type, source_id)` unique constraint with `ON CONFLICT DO UPDATE retrieved_at`. `chat_message_id` changed to `ON DELETE CASCADE`.
- `mcp_servers`: `flag_emoji` → `region_glyph`; thematic values (ARB, EU·27, UN) for multi-jurisdiction sources.
- `mcp_events`: added `query_hash text` field.
- `user_profiles`: added `is_admin boolean not null default false`.
- `freshness_log`: added `last_checkpoint_url text` for scrape resumability.
- Migration ordering updated for `is_admin` addition.

### Chunks
- **Chunk 1:** Lazy-spawn semantics, idle TTL, queue, permanently_failed state after 3 reconnect failures. +1 day (2 → 3 days).
- **Chunk 5:** CitationCard gains compact list view (expand-on-click for ≥4 citations).
- **Chunk 6:** Encryption layer for `mcp_connections.api_key`. +1 day (2 → 3 days).
- **Chunk 8:** Two persistence modes (per-message / sticky-for-thread). Now canonical source-selection mechanism. +0.5 day (1 → 1.5 days).
- **Chunk 9:** DELETED (product decision). Source selection is user-driven via Chunk 8. −2 days.
- **Chunk 11:** Estimate 1 → 2 days (GPO package in preview).
- **Chunk 12:** Arabic tokenization detail added (`unicode61` or stemming pass). Test for stem/plural match added.
- **Chunk 14:** Scrape resumability added (checkpoint URL in `freshness_log`, idempotent inserts, graceful degradation). FreshnessManager scheduling pattern documented.
- **Chunk 15:** Estimate 2 → 4 days. First-scrape duration note.
- **Chunk 16:** Estimate 2 → 4 days. First-scrape duration note.
- **Chunk 17:** Cache normalization function specified. +0.5 day (2 → 2.5 days).
- **Chunk 19:** Admin-gated dashboard (`is_admin` flag). `query_hash` in `mcp_events`. Nightly 30-day cleanup job added.
- **Chunk 20:** Renamed "Citation URL Liveness + Side-by-Side Viewer." No text matching. HEAD liveness check + iframe side panel only. Forward reference to Feature 2 (hallucination council). −1 day (2 → 1 day).

### Testing (Section 7)
- Fixture lifecycle policy added: per-source refresh scripts, `recorded_at` timestamps, CI age warning at 90 days.

### Milestones (Section 6)
- Calendar: ~9 weeks (was ~8). All milestone day counts updated.

### Risk Register (Section 8)
- Added: telemetry scope leakage risk, mitigated by admin-gated dashboard.

### Open Questions (Section 9)
- Question 6 (admin access) closed: admin-only via `is_admin` flag.
- Router question closed: Chunk 9 deleted; scope is user-driven.

---

## 1. Executive Summary

**19 chunks, 5 milestones, ~9 calendar weeks** for a single engineer.

| Milestone | Name | Calendar | Demo |
|---|---|---|---|
| M1 | Plumbing | Weeks 1–2 | Fake MCP tool returns cited results; citation cards render; source picker visible |
| M2 | First Real Source | Week 3 | Lawyer asks US case-law question, gets cited CourtListener results with scope control |
| M3 | Breadth | Weeks 4–5 | Source picker with multiple regions, Arabic Al-Meezan results, EUR-Lex working |
| M4 | Portable DB | Weeks 5–6 | Investment arbitration awards (italaw + ICSID) retrievable |
| M5 | Hardening | Weeks 7–9 | Ops dashboard, graceful degradation, citation liveness verification |

**Critical path:** Chunk 1 (MCP host plumbing) → Chunk 3 (tool registration) → Chunk 10 (CourtListener) → Chunk 14 (portable DB framework) → Chunk 17 (caching). Everything else is parallelizable around this spine.

**Locked decisions (not re-opened here):**
- Transport: **stdio** — self-hosted deployments, `child_process.spawn` works freely
- Credentials: **per-user API keys** in `user_profiles` + `.env` fallback, matching existing claude/gemini key pattern; **encrypted at rest** via Supabase Vault
- MCP servers: **npm install** for Tier 1/2 servers; build portable DB servers for Tier 3
- Test framework: **Vitest**
- `McpClientManager`: **singleton**, lazy-spawned on first request, idle-disposed after 15 min
- Source selection: **user-driven** via per-query scope picker (Chunk 8). No heuristic router.
- Speed priority: quickest working solution first

---

## 2. Architecture Decisions

### 2.1 MCP Host Implementation

Use `@modelcontextprotocol/sdk` (official TypeScript SDK, `Client` class with `StdioClientTransport`). Each MCP server runs as a **stdio child process** spawned by the Express backend via `child_process.spawn`. No separate service, no networking between host and server.

`McpClientManager` is a **singleton** initialized at Express boot but uses **lazy-spawn semantics**: child processes are not started at boot. The lifecycle per source is:

1. **Cold (first request):** spawn child process (~500ms), serve request, mark warm.
2. **Warm (within idle TTL of 15 min):** serve immediately from running process.
3. **Idle TTL expired:** dispose child process, free memory. Next request restarts from cold.
4. **Unexpected exit:** mark stopped; lazy-respawn on next request.
5. **3 consecutive respawn failures:** mark `permanently_failed`; skip on all subsequent requests; emit `source_unavailable` SSE. Recovery requires Express restart (or a `POST /admin/mcp-connections/:serverId/reset` endpoint, v1.5).

Each source has a **per-server request queue** (max depth 10). When the queue is full, new requests return `source_unavailable: { source, reason: "throttled" }` immediately without queuing. A v1.5 process pool (2–3 children per source) can raise concurrency without this queue pressure.

`McpClientManager.dispose()` kills all running child processes cleanly on `SIGTERM`/`SIGINT`.

Rationale for lazy-spawn over eager-spawn: 6 sources × 50–150 MB Node footprint = 300–900 MB of memory for processes the user may never touch in a session. Lazy-spawn pays a 500ms cold-start tax on first use per source, which is preferable to the constant memory overhead.

### 2.2 Tool Registration

Each turn, the active tool list is built from **connected-and-active MCP servers** only: servers the user has enabled (via `mcp_connections`) and has not excluded via the per-query scope picker (Chunk 8). The LLM receives this set and picks which tools to call via standard Claude tool selection.

No heuristic router. The user scopes their query via the source picker popover before submitting; the resulting active set is passed directly to the LLM. Default state when the user has not actively scoped is "all connected sources active."

Tool naming convention: `mcp__{serverName}__{toolName}` (e.g. `mcp__courtlistener__search_cases`). This prefix must not conflict with existing tool names — verify against `TOOLS` in `chatTools.ts` before implementing Chunk 3.

MCP tools are appended to `activeTools` after existing TOOLS. The system prompt names each active MCP source and its tools so the LLM knows when to use them.

Context budget: see Section 2.3.

### 2.3 Context Budget for Tool Results

**Two-tier truncation:**
- **All results:** title + URL + 1-sentence excerpt (first ~100 chars of excerpt field). These are cheap tokens and preserve the lawyer's ability to see that case 21 exists.
- **Full excerpts:** included for the first 5–10 results only.
- **Overflow message:** `[Showing {N} of {total} results. Ask a narrower question or click a citation to read more.]`

Total per-source budget remains approximately 4,000 tokens under this model. No LLM summarization in the tool path — truncation is deterministic and fast.

Rationale: the previous flat 4,000-token cap silently dropped results without signaling their existence. Lawyers need to know that a case exists even if they can't read the full excerpt without drilling in.

### 2.4 Citation Data Model

Shape: `{ source_type, source_id, url, title, excerpt (≤500 chars), liveness_status, retrieved_at }`. Stored in a Supabase `citations` table linked to `chat_messages`. Also emitted as an SSE `mcp_citations` event at end of each assistant message. Rendered in the frontend as **citation cards** below the assistant message — compact list view by default for ≥4 citations (expand-on-click for full excerpt), expanded for ≤3.

### 2.5 Caching Strategy

Cache key: SHA-256 of `(source + normalized_query_text)`.

**Normalization function** (must be identical everywhere the key is computed):
1. Lowercase
2. Collapse all whitespace sequences to a single space
3. Strip leading and trailing punctuation
4. Do not remove stop words (legal phrasing is semantically load-bearing — "claim under FIDIC" ≠ "FIDIC claim")

Stored in `cache_results` table with `expires_at`. TTL: **24 hours** for stable sources (Al-Meezan, italaw, ICSID), **1 hour** for live sources (CourtListener, EUR-Lex, GovInfo). Cache lookup before MCP call; cache write after successful MCP response. Invalidation: TTL expiry only (no manual flush needed for v1).

### 2.6 Auth and Credentials

New columns in `user_profiles`: `courtlistener_api_key text`, `govinfo_api_key text`. Retrieved via the existing `getUserApiKeys` pattern in `backend/src/lib/userSettings.ts`. Fallback to env vars `COURTLISTENER_API_KEY`, `GOVINFO_API_KEY` when no user key is set. User provides keys via the existing user settings page (new "Legal Sources" section matching the claude/gemini key UI). Keys passed to MCP child processes via environment variable at spawn time.

**Encryption at rest:** `mcp_connections.api_key` must be encrypted before storage. Recommended approach: **Supabase Vault** (`vault.create_secret()` / `vault.decrypted_secrets`), which handles key management natively and requires no additional dependencies. Alternative: AES-256-GCM with a server-side master key from env (`MCP_KEY_ENCRYPTION_KEY`). Either approach stores a `key_version integer` alongside the encrypted value to support future rotation.

**Migration path for existing plaintext rows:** `mcp_connections` is a new table introduced by this spec's migration (migration step 2, Section 3). It does not exist in the database prior to this migration. The table is empty at the time of migration — there are no pre-existing plaintext `api_key` values to backfill. Encryption is enforced from row zero: the write path in `POST /user/mcp-connections` (Chunk 6) encrypts the key before inserting, and the schema comment documents this invariant. If a deployment somehow has pre-existing rows (e.g. a developer added them manually during a hotfix), a one-time migration script (`backend/migrations/encrypt-existing-mcp-keys.ts`) must be run and documented in the release notes before the Chunk 6 PR merges to main.

**Key rotation path** (v1 architecture, not v1 UI): incrementing `key_version` triggers re-encryption of affected rows on next read. A migration script re-encrypts all rows with the new key when `key_version` is bumped. The rotation UI is explicitly out of scope for v1 but the schema and decrypt path support it.

**Launch-gate audit checklist:**
- `grep -r "console.log" backend/src/lib/mcp/` — verify no raw key values logged
- `api_key` excluded from all SSE event serializers
- `api_key` excluded from Express error handler serialization (add explicit field filter)
- Verify that `mcp_connections.api_key` never appears in Supabase query logs (use parameterized queries only)

### 2.7 Error Handling Philosophy

**Circuit breaker per source** — open after 3 consecutive failures within 60 seconds. Reset sequence: auto-transition to half-open after 60 seconds (initial), allow 1 probe request; success → closed; failure → open again with exponential backoff on the next half-open window (60s → 120s → 240s up to a 300s cap). The static 5-minute reset is replaced by this sequence, which is less punitive for transient failures.

**When a source circuit opens:**
1. Remove that source's tool definitions from `activeTools` for the current and subsequent turns while the circuit is open.
2. Append to system prompt: `"Note: {source_display_name} is temporarily unavailable. Do not attempt to call its tools."`
3. Emit SSE `source_unavailable: { source, message: "{source_display_name} is temporarily unavailable" }`.

Both the tool removal and the prose note are required — either alone can be overridden by the LLM.

**Retry policy** — 2 attempts with exponential backoff (500ms, 1000ms) before counting as a circuit breaker failure.

**Partial results:** LLM continues with available sources; partial results are better than none.

### 2.8 Portable Database Pattern

Scraper: Node.js script using `cheerio` for HTML parsing, `pdfjs-dist` (already in project) for PDF text extraction, `better-sqlite3` for SQLite writes. Schema includes an FTS5 virtual table. A `PortableMcpServer` base class wraps the SQLite DB and exposes `search` and `retrieve` tools via stdio MCP protocol. A `FreshnessManager` checks `freshness_log` in Supabase, triggers scrape if stale (>24h), updates log on completion. Scraper rate-limits HTTP fetches to 1 req/sec via `p-throttle`. Pattern derived from Ansvar Systems' Al-Meezan implementation (SQLite + FTS5, daily freshness).

**Scrape resumability** (added in Chunk 14): the scraper checkpoints its last-successful URL in `freshness_log.last_checkpoint_url`. On restart, it resumes from that URL. All inserts use `ON CONFLICT(url) DO NOTHING` for idempotency. Re-parse is skipped if `indexed_at` timestamp is more recent than the scrape's start time.

**Graceful degradation:** if a scrape fails mid-run, the MCP server continues serving the last successfully-scraped data. `freshness_log.status` is set to `"error"`. Search results include a metadata field `{ freshness_warning: "Data may be stale — last successful scrape: {date}" }`.

**FreshnessManager scheduling:** for production deployments, run as a scheduled worker (cron / system timer / platform native scheduler) nightly while users sleep, not at Express startup. Fallback for first-run on a new deployment: if `last_scraped_at` is null and the SQLite DB is empty, trigger a scrape on the first search request and return an "indexing in progress" message.

### 2.9 Multilingual Handling

Al-Meezan: Arabic text rendered with `dir="rtl"` CSS on citation excerpt (detected via Unicode range U+0600–U+06FF). No translation in the tool path — the LLM handles Arabic-to-English translation when the user asks. The Ansvar Systems Al-Meezan MCP server should be confirmed to use the FTS5 `unicode61` tokenizer (or an equivalent stemming pass at index time) — the default tokenizer does not handle Arabic morphology, meaning "العقد" (contract) would not match "العقود" (contracts). If the package does not handle this, a stemming layer must be added. An integration test is required: search for a known Arabic stem and assert it matches its plural form.

EUR-Lex: query in English by default (`lang=en` parameter). No multilingual embedding strategy for v1.

### 2.10 Privacy and Compliance Posture

MCP tool results are transient — only the `excerpt` field (≤500 chars) is persisted in `citations`. Full result blobs in `cache_results` expire and are not user-attributable (hashed key only). Attribution strings stored with each citation per source ToS. GDPR right-of-erasure: delete `citations` rows where `user_id = X` on account deletion (add to existing delete cascade). Cross-border transfer logging deferred to v2.

---

## 3. Data Model

All new Supabase tables use `uuid` primary keys and `timestamptz` timestamps. Access control enforced in Express route handlers (matching existing pattern — no Postgres RLS on new tables). SQLite tables (`portable_db_italaw`, `portable_db_icsid`) live in the backend filesystem at `backend/data/`, not in Supabase.

### Migration ordering
1. `mcp_servers` (no dependencies)
2. `mcp_connections` (depends on `mcp_servers`)
3. `citations` (depends on `chat_messages`)
4. `cache_results` (no dependencies)
5. `freshness_log` (no dependencies)
6. `user_profiles` column additions (`courtlistener_api_key`, `govinfo_api_key`, `is_admin`)
7. `mcp_events` (Chunk 19 — telemetry)

### `mcp_servers` — registry of available servers

```sql
create table mcp_servers (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null unique,       -- 'courtlistener'
  display_name                text not null,              -- 'CourtListener'
  description                 text,
  region                      text not null,              -- 'us' | 'eu' | 'gulf' | 'arbitration'
  country_code                text,                       -- 'US' | 'EU' | 'QA' | null (multi)
  region_glyph                text,                       -- '🇺🇸' | 'EU·27' | 'ARB' | 'UN'
  npm_package                 text,                       -- null for portable DB servers
  transport                   text not null default 'stdio',
  auth_type                   text not null default 'none', -- 'none' | 'api_key'
  auth_env_var                text,                       -- 'COURTLISTENER_API_KEY'
  auth_user_profile_column    text,                       -- 'courtlistener_api_key'
  default_enabled             boolean not null default false,
  tier                        integer not null,           -- 1 | 2 | 3
  sort_order                  integer not null default 0,
  created_at                  timestamptz not null default now()
);
create index mcp_servers_region_sort on mcp_servers(region, sort_order);
```

**`region_glyph` values by source:**
- CourtListener, GovInfo: `'🇺🇸'`
- EUR-Lex: `'EU·27'`
- Al-Meezan: `'🇶🇦'`
- italaw, ICSID, UNCITRAL: `'ARB'`
- Saudi MoJ: `'🇸🇦'`
- BAILII: `'🇬🇧'`
- CanLII: `'🇨🇦'`

**Seed rows (v1 active):** CourtListener, GovInfo, Al-Meezan, EUR-Lex, italaw, ICSID.
**Seed rows (future, visible in picker as "Connect"):** UNCITRAL CLOUT, Saudi MoJ, BAILII, CanLII, BOE, Légifrance/Judilibre.

### `mcp_connections` — per-user enabled servers

```sql
create table mcp_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  server_id   uuid not null references mcp_servers on delete cascade,
  enabled     boolean not null default true,
  api_key     text,             -- encrypted via Supabase Vault or AES-256-GCM
  key_version integer not null default 1,  -- incremented on key rotation
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, server_id)
);
create index mcp_connections_user_id on mcp_connections(user_id);
```

### `citations` — every cited source from MCP results

```sql
create table citations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  chat_message_id uuid references chat_messages on delete cascade,
  source_type     text not null,   -- 'courtlistener' | 'eurlex' | 'al-meezan' | 'govinfo' | 'italaw' | 'icsid'
  source_id       text,            -- canonical ID in the source (e.g. CL opinion ID, CELEX number)
  url             text not null,
  title           text,
  excerpt         text,            -- ≤500 chars, verbatim from source
  liveness_status text not null default 'unchecked', -- 'unchecked' | 'live' | 'unreachable'
  retrieved_at    timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);
create index citations_user_id on citations(user_id);
create index citations_chat_message_id on citations(chat_message_id);
create index citations_source_type on citations(source_type);
```

`ON CONFLICT(user_id, source_type, source_id) DO UPDATE SET retrieved_at = NOW()` prevents duplicate citation rows across repeated queries for the same case.

`chat_message_id ON DELETE CASCADE`: a citation without its parent message has no context and should not be retained.

`liveness_status` replaces v1's `verification_status`. The values `verified` and `unverified` are reserved for the hallucination council (Feature 2 of roadmap) and must not be introduced here.

### `cache_results` — TTL'd cache of MCP responses

```sql
create table cache_results (
  id          uuid primary key default gen_random_uuid(),
  query_hash  text not null,      -- SHA-256 of (source + normalized query)
  source      text not null,
  result_blob jsonb not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now(),
  unique(query_hash, source)
);
create index cache_results_expires_at on cache_results(expires_at);
```

### `freshness_log` — portable DB scrape tracking

```sql
create table freshness_log (
  id                    uuid primary key default gen_random_uuid(),
  source                text not null unique,   -- 'italaw' | 'icsid'
  last_scraped_at       timestamptz,
  last_checkpoint_url   text,          -- resume point for interrupted scrapes
  records_count         integer,
  status                text not null default 'pending', -- 'pending' | 'ok' | 'error'
  error_message         text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
```

### `mcp_events` — telemetry (Chunk 19)

```sql
create table mcp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  source      text not null,
  tool        text not null,
  query_hash  text,         -- SHA-256 of normalized query (same normalization as cache key)
  latency_ms  integer,
  cache_hit   boolean not null default false,
  success     boolean not null,
  error_type  text,
  created_at  timestamptz not null default now()
);
create index mcp_events_created_at on mcp_events(created_at);
create index mcp_events_source on mcp_events(source);
```

`query_hash` enables per-query-pattern success analysis (e.g. "constitutional law queries fail at 90%"). An optional `query_text text` field can be added after privacy review with a 30-day retention policy.

### `user_profiles` additions

```sql
alter table user_profiles
  add column courtlistener_api_key text,
  add column govinfo_api_key text,
  add column is_admin boolean not null default false;
```

`is_admin` gates the telemetry dashboard (Section 5.19, Chunk 19).

### SQLite: `backend/data/italaw.db`

```sql
create table italaw_cases (
  id         integer primary key autoincrement,
  case_name  text not null,
  url        text not null unique,
  parties    text,
  tribunal   text,
  year       integer,
  treaty     text,
  outcome    text,       -- 'Award' | 'Decision on Jurisdiction' | etc.
  full_text  text,       -- for FTS5 indexing
  indexed_at text not null  -- ISO 8601
);
create virtual table italaw_fts using fts5(
  case_name, parties, tribunal, treaty, outcome, full_text,
  content=italaw_cases, content_rowid=id
);
create trigger italaw_cases_ai after insert on italaw_cases begin
  insert into italaw_fts(rowid, case_name, parties, tribunal, treaty, outcome, full_text)
  values (new.id, new.case_name, new.parties, new.tribunal, new.treaty, new.outcome, new.full_text);
end;
```

### SQLite: `backend/data/icsid.db`

```sql
create table icsid_cases (
  id               integer primary key autoincrement,
  case_name        text not null,
  url              text not null unique,
  parties          text,
  tribunal         text,
  year             integer,
  proceeding_type  text,   -- 'Award' | 'Decision on Annulment' | etc.
  outcome          text,
  full_text        text,
  indexed_at       text not null
);
create virtual table icsid_fts using fts5(
  case_name, parties, tribunal, proceeding_type, outcome, full_text,
  content=icsid_cases, content_rowid=id
);
-- Same trigger pattern as italaw
```

---

## 4. Per-Database Integration Playbooks

### 4.1 CourtListener

**Server source:** `DefendTheDisabled/courtlistener-mcp` — most feature-complete community implementation with semantic + hybrid search. Install via npm.

**Transport:** stdio

**Auth:** Free API key from courtlistener.com. Stored in `user_profiles.courtlistener_api_key`; env fallback `COURTLISTENER_API_KEY`. Passed to child process as env var at spawn. If missing: emit `source_unavailable` with message "CourtListener requires an API key. Add it in Settings → Legal Sources."

**Rate limits:** 5,000 req/hour authenticated. Request queue in `McpClientManager` — if queue depth > 10, reject with throttle event.

**Schema (sample MCP response):**
```json
{
  "results": [
    {
      "id": "12345",
      "case_name": "Yukos Capital v. Rosneft",
      "citation": "723 F.3d 860",
      "court": "ca7",
      "date_filed": "2013-07-31",
      "url": "https://www.courtlistener.com/opinion/12345/",
      "snippet": "...investment treaty arbitration award..."
    }
  ]
}
```
Normalize to citation: `source_type="courtlistener"`, `source_id=result.id`, `url=result.url`, `title=result.case_name`, `excerpt=result.snippet`.

**Edge cases:** Pagination — for v1, take first page only (20 results max); note in overflow message if truncated. Low relevance scores for rare topics — no special handling.

**Test fixtures:** msw-recorded HTTP cassettes in `backend/src/__fixtures__/courtlistener/`. Include: search response (5 results), empty response, 429 rate-limit response. Each fixture includes `recorded_at` ISO timestamp in a header comment.

**Fixture refresh:** `npm run refresh-fixtures:courtlistener`

**Compliance:** Free Law Project data is public domain or open access. Attribution required: "Data from CourtListener / Free Law Project."

---

### 4.2 GovInfo (GPO)

**Server source:** Official MCP server from the US Government Publishing Office (public preview). Package name is an open question — see Section 9.

**Transport:** stdio

**Auth:** `api.data.gov` key (free registration). Stored in `user_profiles.govinfo_api_key`; env fallback `GOVINFO_API_KEY`. Unauthenticated fallback: lower rate limit still works.

**Rate limits:** 1,000 req/hour unauthenticated. Exponential backoff on 429.

**Schema (sample):**
```json
{
  "results": [
    {
      "packageId": "CFR-2024-title29-vol5",
      "title": "29 CFR Part 1910 — Occupational Safety",
      "dateIssued": "2024-01-01",
      "url": "https://www.govinfo.gov/content/pkg/CFR-2024-title29-vol5/pdf/...",
      "download": { "txtLink": "..." }
    }
  ]
}
```
Normalize: `source_type="govinfo"`, `source_id=result.packageId`, `url=result.url`, `title=result.title`, `excerpt` from txt download (first 500 chars).

**Edge cases:** Some responses return USLM XML — use `txtLink` fallback for v1.

**Test fixtures:** Recorded in `backend/src/__fixtures__/govinfo/`. Each includes `recorded_at` timestamp.

**Fixture refresh:** `npm run refresh-fixtures:govinfo`

**Compliance:** US government works are public domain. Attribution: "Data from GovInfo / US GPO."

---

### 4.3 Al-Meezan

**Server source:** Ansvar Systems Al-Meezan MCP server. SQLite + FTS5, 71,155 provisions, daily freshness. Package name is an open question — see Section 9.

**Transport:** stdio

**Auth:** None. SQLite is local; no external API calls.

**Rate limits:** None (local SQLite).

**Schema (sample):**
```json
{
  "results": [
    {
      "provision_id": "QA-CIV-2004-22-art45",
      "law_number": "22",
      "year": 2004,
      "title_arabic": "القانون المدني",
      "title_english": "Civil Code",
      "article": "45",
      "text_arabic": "يجب أن يكون العقد...",
      "text_english": "The contract must...",
      "url": "https://www.al-meezan.qa/..."
    }
  ]
}
```
Normalize: `source_type="al-meezan"`, `source_id=provision_id`, `url`, `title=title_english ?? title_arabic`, `excerpt=text_english ?? text_arabic`.

**Edge cases:** Arabic-only provisions — excerpt uses `dir="rtl"` rendering in `CitationCard`. Arabic Unicode encoding in older provisions. FTS5 tokenizer: confirm package uses `unicode61` or equivalent — the default tokenizer does not handle Arabic morphology (stem/plural mismatch). If not handled, add a stemming pass at index time.

**Test fixtures:** Minimal fixture SQLite DB (10 provisions) in `backend/src/__fixtures__/al-meezan/`. Used without spawning full npm package.

**Compliance:** Qatari government data, publicly accessible. Attribution: "Data from Al-Meezan / Qatar Judicial Council."

---

### 4.4 EUR-Lex

**Server source:** `scimorph/eur-lex-mcp` — wraps the official EUR-Lex SOAP webservice with expert search syntax and CELEX retrieval.

**Transport:** stdio

**Auth:** None. EUR-Lex SOAP API is public.

**Rate limits:** ~60 req/min. Retry with 1s delay on 503.

**Schema (sample):**
```json
{
  "results": [
    {
      "celex": "32016R0679",
      "title": "General Data Protection Regulation",
      "date": "2016-04-27",
      "url": "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
      "excerpt": "...processing of personal data..."
    }
  ]
}
```
Normalize: `source_type="eurlex"`, `source_id=result.celex`, `url`, `title`, `excerpt`.

**Edge cases:** SOAP parsing errors on malformed queries — catch and retry with simplified query. Default language `en`; some older acts exist only in FR/DE.

**Test fixtures:** Recorded SOAP XML responses in `backend/src/__fixtures__/eurlex/`. Each includes `recorded_at` timestamp.

**Fixture refresh:** `npm run refresh-fixtures:eurlex`

**Compliance:** EU law is in the public domain. Attribution: "Data from EUR-Lex / Publications Office of the EU."

---

### 4.5 italaw

**Server source:** Build new — pattern: portable DB. No API, no existing MCP server.

**Transport:** stdio (our `ItalawMcpServer` wrapping local SQLite)

**Auth:** None

**Rate limits:** None (local). Scraper respects `robots.txt`, rate-limits HTTP fetches to 1 req/sec.

**Schema (our MCP response):**
```json
{
  "results": [
    {
      "case_name": "Yukos Universal Limited v. Russian Federation",
      "parties": "Yukos Universal Limited | Russian Federation",
      "tribunal": "PCA",
      "year": 2014,
      "treaty": "ECT",
      "outcome": "Award",
      "url": "https://italaw.com/cases/958",
      "excerpt": "...The Tribunal finds jurisdiction..."
    }
  ]
}
```
Schema maps directly to citation model.

**Edge cases:** HTML structure changes break selectors — pin CSS selectors, monitor via `freshness_log.status`. Some cases in French/Spanish — return as-is (no translation). Award texts are PDFs — extract with `pdfjs-dist`. First scrape takes hours; see Chunk 15.

**Test fixtures:** 5 recorded HTML pages in `backend/src/__fixtures__/italaw/html/`. Fixture SQLite DB (`italaw_test.db`) with 5 cases.

**Compliance:** italaw maintained by Prof. Newcombe for public access. No explicit ToS against bulk access. Conservative approach: excerpts only (≤500 chars), attribution to italaw.com, do not republish full award texts, respect `robots.txt`.

---

### 4.6 ICSID

**Server source:** Build new — pattern: portable DB.

**Transport:** stdio (our `IcsidMcpServer` wrapping local SQLite)

**Auth:** None

**Rate limits:** None (local). Scraper: 1 req/sec.

**Schema (our MCP response):**
```json
{
  "results": [
    {
      "case_name": "Loewen Group v. United States",
      "parties": "Loewen Group | United States of America",
      "tribunal": "ICSID",
      "year": 2003,
      "proceeding_type": "Award",
      "outcome": "Dismissed",
      "url": "https://icsid.worldbank.org/cases/case-details?id=ARB(AF)/98/3",
      "excerpt": "..."
    }
  ]
}
```

**Edge cases:** Three URL patterns (award / decision on jurisdiction / annulment) — scraper handles all three. Award documents are PDF-only — use `pdfjs-dist`. First scrape takes hours; see Chunk 16.

**Test fixtures:** 5 recorded HTML pages, fixture SQLite DB with 5 cases.

**Compliance:** ICSID is a World Bank body. Award texts are public. Attribution: "Data from ICSID / World Bank."

---

## 5. Chunk Breakdown

### Chunk 1: MCP Host Plumbing
**Goal:** The Express backend can spawn, communicate with, and health-check an MCP server as a stdio child process, using lazy-spawn semantics.

**Scope:**
- Install `@modelcontextprotocol/sdk`
- `McpClientManager` singleton in `backend/src/lib/mcp/clientManager.ts`
- Lazy-spawn: spawn on first `callTool()` or `listTools()` for that server; mark warm after spawn
- `idleTimer` per server: reset on each use; dispose process after 15 min idle
- `listTools(serverName)`: returns normalized tool definitions from a running (or freshly-spawned) server
- `callTool(serverName, name, args)`: calls tool, returns result
- `healthCheck(serverName)`: pings server, returns ok/error
- Per-server request queue (max depth 10); reject with `{ error: "throttled" }` when full
- Auto-reconnect on crash: exponential backoff, max 3 attempts; after 3: mark `permanently_failed`, skip on subsequent requests
- `dispose()`: kills all running child processes cleanly; called on `SIGTERM`/`SIGINT`

**Out of scope:** Tool registration in agent loop, any real MCP server, credentials wiring.

**Demo:** Dev runs `npx ts-node scripts/test-mcp-host.ts` with a minimal echo MCP server and sees `listTools()` output in the terminal after confirming the cold-start spawn.

**Tests:**
- Unit: cold-start — first `callTool()` triggers spawn; `listTools()` returns tools
- Unit: warm reuse — second call within idle TTL does not re-spawn
- Unit: idle disposal — after TTL expires (fake timers), process disposed
- Unit: reconnect fires after unexpected child process exit
- Unit: `permanently_failed` after 3 reconnect failures; subsequent calls return `source_unavailable` without spawn attempt
- Unit: queue-full returns throttle error without spawning
- Unit: `dispose()` kills all running processes

**Acceptance criteria:**
- `listTools()` returns at least one tool from a running MCP server
- No spawn occurs on second warm call within idle TTL
- Child process exit triggers reconnect within 1s (fake timers)
- 3 consecutive spawn failures → `permanently_failed` state
- `dispose()` kills all spawned processes (spy verification)

**Estimated days:** 3

**Depends on:** Nothing

**Risks:** `@modelcontextprotocol/sdk` `StdioClientTransport` API surface may differ from current docs — pin to a specific SDK version on install.

---

### Chunk 2: Mock MCP Server for Tests
**Goal:** An in-process mock MCP server that returns scripted responses, usable in Vitest without spawning real child processes.

**Scope:**
- `backend/src/__mocks__/mockMcpServer.ts` — implements MCP stdio protocol over in-process streams
- Pre-defined tool set: `search_cases`, `retrieve_case`
- Scripted responses configurable per test via `mockMcpServer.respondWith(toolName, response)`
- Vitest fixture helper: `createMockMcpServer()` returns started server + connected `McpClientManager`

**Out of scope:** Any real API calls, real MCP server packages.

**Demo:** Vitest test asserts `McpClientManager.callTool("mock", "search_cases", { query: "arbitration" })` returns the scripted fixture response.

**Tests:**
- Unit: mock server returns scripted tool result
- Unit: mock server responds correctly to `listTools()`

**Acceptance criteria:**
- `createMockMcpServer()` usable in any Vitest test file without spawning child processes
- Returns deterministic responses per `respondWith()` config

**Estimated days:** 1

**Depends on:** Chunk 1

**Risks:** In-process stream emulation may miss edge cases of real stdio — acceptable for v1 test coverage.

---

### Chunk 3: Tool Registration in Agent Loop
**Goal:** MCP tools from connected servers are injected into the LLM's tool list and execute correctly via the existing agent loop.

**Scope:**
- Extend `runLLMStream()` in `chatTools.ts` to accept `mcpTools: ToolDefinition[]` param
- Append `mcpTools` to `activeTools` before LLM call (after existing TOOLS)
- Extend `runToolCalls()` to detect MCP tool names by prefix (`mcp__{serverName}__`) and dispatch to `McpClientManager.callTool()`
- MCP tool results normalized to existing `{ tool_use_id, content }` format
- New SSE event `mcp_tool_call_start: { source, tool, query }` for UI feedback
- MCP tool names added to system prompt so LLM knows when to use them
- When a source circuit is open: remove its tools from `activeTools` and append unavailability note to system prompt (see Section 2.7)

**Out of scope:** Per-query scope (Chunk 8), real MCP servers.

**Demo:** Dev starts Express with mock MCP server active, sends a chat message — LLM emits `mcp__mock__search_cases` tool call, backend executes it, result feeds into next LLM turn.

**Tests:**
- Integration: full chat round-trip with mock MCP server; tool call executed and result returned
- Unit: tool name prefix detection in `runToolCalls()`
- Unit: MCP result normalized correctly to tool result format
- Unit: open-circuit source tools absent from `activeTools`

**Acceptance criteria:**
- LLM emits MCP tool call by prefixed name
- `runToolCalls()` dispatches to `McpClientManager`
- Tool result returned and fed back into LLM context
- `mcp_tool_call_start` SSE event emitted with correct fields

**Estimated days:** 2

**Depends on:** Chunks 1, 2

**Risks:** Prefix convention (`mcp__{serverName}__`) must not conflict with existing tool names — verify against current TOOLS list in `chatTools.ts` before implementing.

---

### Chunk 4: Citation Data Model + Storage
**Goal:** Every MCP-sourced result cited by the LLM is stored in the `citations` table and emitted as an SSE event.

**Scope:**
- Supabase migration: `citations` table (schema per Section 3, including `liveness_status` and unique constraint)
- Citation parser function: maps MCP tool result fields to citation schema per `source_type`
- On message save: insert citation rows with `ON CONFLICT(user_id, source_type, source_id) DO UPDATE SET retrieved_at = NOW()`
- New SSE event `mcp_citations: Citation[]` emitted at end of assistant message
- `Citation` TypeScript type in `backend/src/lib/mcp/types.ts`
- System prompt additions: citation rules for MCP sources (cite verbatim, include source_id and URL)

**Out of scope:** Citation rendering UI (Chunk 5), citation liveness check (Chunk 20).

**Demo:** Chat with mock MCP active → `citations` table has a row → browser network tab shows `mcp_citations` SSE event with correct shape.

**Tests:**
- Unit: citation parser maps mock MCP response to citation schema for each `source_type`
- Integration: citation row created in DB after chat with mock MCP server
- Unit: SSE event emitted with correct shape
- Unit: duplicate citation (same `user_id + source_type + source_id`) updates `retrieved_at` rather than inserting a new row

**Acceptance criteria:**
- Citation row inserted with correct `source_type`, `url`, `title`, `excerpt`
- `mcp_citations` SSE event matches citation rows
- Empty array emitted if no MCP tools called
- No duplicate rows for repeated queries about the same case

**Estimated days:** 2

**Depends on:** Chunk 3

---

### Chunk 5: Citation Rendering Component
**Goal:** MCP citations appear in the chat UI as clickable cards below assistant messages.

**Scope:**
- `CitationCard` React component: title (bold), excerpt (grey), source badge (`region_glyph` + display name), "Open source" link chip
- **Compact list view:** for ≥4 citations, render as a compact list (one row per citation: `region_glyph` + title + jurisdiction + year); click row to expand full excerpt. For ≤3 citations, default to expanded card.
- `mcp_citations` SSE event handler added to `useAssistantChat` hook
- Citations stored in message state, rendered below `AssistantMessage`
- RTL support: if `excerpt` contains Arabic text (Unicode U+0600–U+06FF), apply `dir="rtl"` to excerpt element
- "Verify and read" button stub (non-functional in Chunk 5 — wired up in Chunk 20)

**Out of scope:** Citation liveness check (Chunk 20), telemetry.

**Demo:** Chat with mock MCP server → citation card appears below assistant message with title, excerpt, source badge, and clickable URL chip opening in new tab. For 4+ citations, compact list with expand-on-click.

**Tests:**
- Component: `CitationCard` renders title, excerpt, source badge, and link
- Component: compact list renders for 4+ citations; single card renders for ≤3
- Component: expand-on-click works in compact list
- Component: `dir="rtl"` applied when excerpt is Arabic
- Component: link has `target="_blank"` and correct `href`
- Hook: `mcp_citations` SSE event parsed and stored in message state

**Acceptance criteria:**
- Citation card renders for each citation in `mcp_citations` event
- Link opens source URL in new tab
- Arabic excerpt renders RTL
- Compact list triggers at 4+ citations

**Estimated days:** 1.5

**Depends on:** Chunk 4

**Risks:** Styling may clash with existing `AssistantMessage` layout — reference existing `doc_read` event card for visual patterns.

---

### Chunk 6: Source Connections DB + User Settings UX + Key Encryption
**Goal:** Users can view, enable, and configure API keys for MCP sources via the settings page. API keys are encrypted at rest.

**Scope:**
- Supabase migrations: `mcp_servers` (with seed data for all 14 sources visible in source picker), `mcp_connections`; `user_profiles` column additions (including `is_admin`)
- **Encryption layer:** `encryptApiKey(key: string): Promise<{ ciphertext: string, version: number }>` and `decryptApiKey(ciphertext: string, version: number): Promise<string>` in `backend/src/lib/mcp/encryption.ts`. Implementation: Supabase Vault (`vault.create_secret()` / `vault.decrypted_secrets`) or AES-256-GCM with `MCP_KEY_ENCRYPTION_KEY` env var. Wrap/unwrap called in `mcp_connections` read/write path; raw key never written to DB.
- Backend: `GET /user/mcp-connections` (list all servers + user's connection status), `POST /user/mcp-connections` (create/update — encrypts key before write), `DELETE /user/mcp-connections/:serverId`
- Frontend settings page: new "Legal Sources" section — all servers grouped by region, toggle + API key input for servers with `auth_type="api_key"`, greyed "coming soon" for unimplemented servers
- Extend `getUserApiKeys()` in `userSettings.ts` to include MCP source keys (decrypted at read time)
- `.env` fallback used when no user key set

**Out of scope:** Source picker in chat (Chunk 7).

**Demo:** User → Settings → Legal Sources → toggles CourtListener on → enters API key → saves → row in `mcp_connections` with encrypted value (verify plaintext is NOT present via direct Supabase table inspection).

**Tests:**
- API: `GET /user/mcp-connections` returns correct list with user's connection status
- API: `POST /user/mcp-connections` creates row; direct DB read confirms `api_key` column is not plaintext
- API: user cannot access another user's connections
- Unit: `encryptApiKey` → `decryptApiKey` round-trip produces original value
- Component: toggle + key input renders correctly per `auth_type`
- Unit: `getUserApiKeys()` returns MCP keys with `.env` fallback

**Acceptance criteria:**
- Connection saved in `mcp_connections`
- `api_key` column in DB is encrypted — never plaintext
- Decrypted key passed to MCP child process env var; never appears in logs, SSE events, or error messages
- `.env` fallback used when no user key
- All 14 sources visible in settings

**Estimated days:** 3

**Depends on:** Chunk 1

**Risks:** Supabase Vault requires the `pgsodium` extension — confirm enabled in the project before starting. AES-256-GCM fallback requires `MCP_KEY_ENCRYPTION_KEY` in env; document as required in setup README.

---

### Chunk 7: Source Picker Popover UI
**Goal:** A "Sources" pill in the chat input opens the source picker popover matching the v2 mockup design.

**Scope:**
- `SourcesPill` component in chat input toolbar (alongside + Documents, Projects, Workflows)
- `SourcePickerPopover` component:
  - Search input (filters by name, case-insensitive)
  - Sources grouped by region in order: Internal → International arbitration → Gulf & Middle East → European Union → United States → Other jurisdictions
  - State badges: "Always on" (internal docs), "Connected" (teal), "Connect" (grey), "Permission required" (amber)
  - `region_glyph` badge per source (flag emoji or thematic text — ARB, EU·27, UN)
  - "Add custom MCP server" footer (placeholder, disabled for v1)
- Count in pill: "Sources · N active"
- Data fetched from `GET /user/mcp-connections` on popover open

**Out of scope:** Per-query scope toggles (Chunk 8), custom MCP server add.

**Demo:** Chat input shows "Sources · 6 active" pill; click opens popover matching the mockup — regions, `region_glyph` badges, state badges, search working.

**Tests:**
- Component: popover opens on pill click, closes on outside click
- Component: sources grouped by region in correct order
- Component: search filters list in real time
- Component: state badge variant matches connection status
- Component: count in pill reflects active sources
- Component: `region_glyph` renders correctly (flag emoji for jurisdiction sources, text for multi-jurisdiction)

**Acceptance criteria:**
- Popover matches mockup design (regions, `region_glyph` badges, state badges)
- Search filters correctly
- Count accurate

**Estimated days:** 2

**Depends on:** Chunk 6

**Risks:** Popover positioning on small viewports — test at 375px width.

---

### Chunk 8: Per-Query Scope Toggling (Canonical Source-Selection Mechanism)
**Goal:** Users can enable/disable specific sources for the current query from the source picker, overriding their persistent settings. This is the sole source-selection mechanism — no heuristic router.

**Scope:**
- Checkbox on each source row in `SourcePickerPopover`
- Per-query scope state in `useAssistantChat`: `activeSources: string[]` (server names) and `scopeMode: 'per-message' | 'sticky'`
- **Two persistence modes:**
  - **Per-message (default when user explicitly resets to "all sources"):** scope returns to user's persistent connection settings after each message send.
  - **Sticky-for-thread (default when user actively narrows scope):** scope persists for all subsequent messages in the thread until the user clears it.
- When user unchecks one or more sources: switch to sticky-for-thread mode. Render a "Scope: N sources for this thread" indicator near the chat input with a Clear button. Clear button resets to user's persistent connection settings.
- When user clicks "Ask all sources": switch to per-message mode; scope resets after next send.
- Scope passed to `POST /chat` as `mcpScope: string[]` body field
- Backend: when `mcpScope` provided, filter active servers to only those listed
- `mcpScope` overrides connection-level `enabled` flag

**Out of scope:** Session-level scope persistence (browser reload resets to connection settings), custom MCP servers.

**Demo:** User opens source picker, unchecks CourtListener, sends query — backend queries only remaining active sources. "Scope: 5 sources for this thread" indicator visible. Follow-up query still excludes CourtListener (sticky mode). User clicks Clear → next query uses all connected sources.

**Tests:**
- Integration: `mcpScope=["eurlex"]` → only EUR-Lex MCP called (mock MCP server verifies via call count)
- Component: checkbox state reflected in pill count
- Component: sticky indicator appears after narrowing scope
- Unit: per-message mode resets scope after send
- Unit: sticky mode preserves scope across multiple sends
- Unit: Clear button resets to persistent connection settings

**Acceptance criteria:**
- `mcpScope` respected server-side — unscoped servers not called
- Scope overrides connection-level `enabled` flag
- Sticky indicator visible when scope is narrowed
- Clear button restores full persistent connection set
- Per-message mode resets scope correctly

**Estimated days:** 1.5

**Depends on:** Chunks 7, 3

---

### Chunk 9: DELETED

**Reason:** Product decision. Source selection is user-driven through the per-query scope picker (Chunk 8). Default state is "all connected sources active." The LLM picks from the user's active set via standard tool selection. A heuristic keyword/jurisdiction router is not built.

**Calendar impact:** −2 days from Milestone 2.

---

### Chunk 10: CourtListener Integration
**Goal:** Real CourtListener MCP server installed and functional end-to-end.

**Scope:**
- `npm install courtlistener-mcp` (DefendTheDisabled package — verify exact name)
- Add CourtListener to `McpClientManager` server registry with API key from user settings
- Wire `COURTLISTENER_API_KEY` env var at spawn
- Integration test with msw-recorded CourtListener HTTP fixtures
- System prompt additions: CourtListener citation format

**Out of scope:** Caching (Chunk 17).

**Demo:** Lawyer asks "Find US federal cases on ISDS energy disputes" → CourtListener MCP called → citation cards with courtlistener.com URLs render.

**Tests:**
- Integration: full chat with msw-recorded CL responses; citation stored and SSE event emitted
- Integration: missing API key → `source_unavailable` SSE event
- Integration: 429 rate limit → retry then `source_unavailable`

**Acceptance criteria:**
- CourtListener tool called, result normalized to citation schema
- Citation card renders with correct CL URL
- Missing key handled gracefully

**Estimated days:** 2

**Depends on:** Chunks 3, 6

**Risks:** Exact npm package name for DefendTheDisabled/courtlistener-mcp may differ — open question.

---

### Chunk 11: GovInfo Integration
**Goal:** GovInfo MCP server installed and functional.

**Scope:**
- Install official GPO MCP package (name TBD — see Section 9)
- Wire `GOVINFO_API_KEY` env var at spawn
- Integration test with recorded fixtures
- Citation normalization for GovInfo response shape

**Out of scope:** Caching.

**Demo:** Query about US federal regulatory requirements → GovInfo results cited with govinfo.gov URLs.

**Tests:**
- Integration: chat with recorded GovInfo fixtures; citation stored
- Integration: unauthenticated fallback (no key) still returns results

**Acceptance criteria:**
- GovInfo tool called, `source_type="govinfo"` citation stored
- Citation URL is valid govinfo.gov URL

**Estimated days:** 2

**Depends on:** Chunks 3, 6

**Risks:** GPO MCP package still in public preview — pin to specific version; may need to wait for publication. Fallback: build thin wrapper around api.data.gov REST API.

---

### Chunk 12: Al-Meezan Integration
**Goal:** Al-Meezan MCP server installed and functional, with Arabic RTL rendering and correct tokenization.

**Scope:**
- Install Ansvar Systems Al-Meezan package (name TBD)
- Add to `McpClientManager` server registry (no API key needed)
- Confirm package uses `unicode61` FTS5 tokenizer or equivalent Arabic stemming — if not, add a stemming pass
- Integration test using fixture SQLite DB (10 provisions)
- RTL rendering confirmed working (from Chunk 5)
- System prompt: note that Arabic text may be returned

**Out of scope:** Caching, bilingual side-by-side display (Phase 4 roadmap).

**Demo:** Query "What does Qatari law say about arbitration clauses?" → Arabic provision text returned with RTL citation card.

**Tests:**
- Integration: chat with Al-Meezan fixture DB; Arabic citation stored
- Component: RTL renders correctly for Arabic excerpt
- Integration: search for Arabic stem returns results matching its plural form

**Acceptance criteria:**
- Al-Meezan tool called, Arabic text in `excerpt`
- Citation links to al-meezan.qa
- RTL styling applied to Arabic excerpts
- Arabic stem/plural search works correctly

**Estimated days:** 1

**Depends on:** Chunks 3, 6

**Risks:** Npm package may not ship pre-built SQLite DB — users may need a build script. Document clearly in README.

---

### Chunk 13: EUR-Lex Integration
**Goal:** EUR-Lex MCP server installed and functional.

**Scope:**
- `npm install eur-lex-mcp` (scimorph package)
- Add to `McpClientManager` server registry (no API key)
- Integration test with msw-recorded SOAP XML responses
- Citation normalization (CELEX number as `source_id`)

**Out of scope:** Caching.

**Demo:** Query about GDPR enforcement → EUR-Lex MCP called → CJEU decision cited with eur-lex.europa.eu URL.

**Tests:**
- Integration: chat with recorded SOAP responses; CELEX citation stored
- Integration: SOAP 503 triggers retry then graceful failure

**Acceptance criteria:**
- EUR-Lex tool called, `source_id` is a valid CELEX number
- Citation URL is valid eur-lex.europa.eu URL

**Estimated days:** 1

**Depends on:** Chunks 3, 6

**Risks:** EUR-Lex SOAP has occasional downtime — circuit breaker must handle cleanly.

---

### Chunk 14: Portable DB Framework
**Goal:** A reusable framework for scraping a public site into SQLite + FTS5 and exposing the DB as a stdio MCP server. Includes scrape resumability and graceful degradation.

**Scope:**
- `backend/src/lib/mcp/portable/` directory
- `BaseScraper` abstract class: `scrape()` method, HTTP fetch with `p-throttle` (1 req/sec), `cheerio` parsing, `better-sqlite3` insert
  - **Resumability:** reads `freshness_log.last_checkpoint_url` on start; skips already-indexed URLs; all inserts use `ON CONFLICT(url) DO NOTHING`; updates `last_checkpoint_url` after each successful insert; idempotent re-parse via `indexed_at` comparison
  - **Graceful degradation:** on mid-run failure, sets `freshness_log.status="error"`, preserves last-successful data, returns freshness warning in search results metadata
- `PortableMcpServer` abstract class: connects to SQLite, exposes `search` (FTS5 BM25) and `retrieve` (by ID) tools via stdio MCP
  - `search` results include `{ freshness_warning: string | null }` in response metadata when `freshness_log.status="error"`
- `FreshnessManager`: checks `freshness_log` in Supabase, triggers scrape if stale (>24h), updates log; for first-run (empty DB + null `last_scraped_at`), triggers immediately and returns "indexing in progress" message to caller
- Recommended deployment: run as scheduled worker (cron / system timer) nightly; not at Express startup
- `npm run scrape:{source}` scripts in `backend/package.json`

**Out of scope:** italaw and ICSID specific scrapers (Chunks 15, 16).

**Demo:** Dev subclasses `BaseScraper` + `PortableMcpServer` with a toy source (5 hardcoded records), runs scraper, queries via MCP, sees results. Interrupts scraper mid-run, restarts — resumes from checkpoint.

**Tests:**
- Unit: `BaseScraper` inserts records into SQLite, FTS5 trigger fires
- Unit: interrupted scrape resumes from `last_checkpoint_url` on restart
- Unit: idempotent re-run produces no duplicate rows
- Unit: `PortableMcpServer.search()` returns BM25-ranked FTS5 results
- Unit: `PortableMcpServer.search()` includes `freshness_warning` when `status="error"`
- Unit: `PortableMcpServer.retrieve()` returns single record by ID
- Unit: `FreshnessManager` triggers scrape when stale, skips when fresh, updates log

**Acceptance criteria:**
- Scraper inserts and FTS5 is queryable
- `search` returns ranked results for a keyword
- `retrieve` returns correct record
- Resumed scrape skips already-indexed URLs
- `freshness_log` row updated after scrape
- Stale-data freshness warning visible in search results when last scrape errored

**Estimated days:** 2

**Depends on:** Chunk 1

**Risks:** `better-sqlite3` requires native compilation — must be documented in backend setup. Cannot run on Cloudflare Workers (backend is not on Workers — no issue).

---

### Chunk 15: italaw Portable DB
**Goal:** italaw investment treaty awards are searchable via the portable DB MCP server.

**Scope:**
- `ItalawScraper extends BaseScraper`: fetches italaw case list, parses case pages with `cheerio`, extracts PDF text via `pdfjs-dist`
- `ItalawMcpServer extends PortableMcpServer`: exposes `search_italaw` and `retrieve_italaw` tools
- Add italaw to `mcp_servers` seed (transport: stdio, auth: none)
- `npm run scrape:italaw` script
- Test fixtures: 5 recorded HTML pages + fixture SQLite DB
- **First-scrape duration note:** full italaw scrape (thousands of case pages + PDF extraction) takes several hours. Document in README. Fixture test run uses 5 hardcoded records and takes seconds.

**Out of scope:** ICSID.

**Demo:** Query "Yukos arbitration award" → italaw MCP called → cited result with italaw.com URL.

**Tests:**
- Unit: `ItalawScraper` parses 5 recorded HTML pages, inserts into SQLite
- Unit: scraper checkpoints and resumes correctly (simulate interruption at 2nd record)
- Integration: `ItalawMcpServer.search()` returns correct results against fixture DB
- Integration: full chat round-trip with fixture DB; citation stored

**Acceptance criteria:**
- Scraper parses italaw case list and case pages correctly
- FTS5 search returns relevant results
- Citation links to `italaw.com/cases/{id}`
- `npm run scrape:italaw` completes without error on fixture data
- Scraper can resume from checkpoint after interruption

**Estimated days:** 4

**Depends on:** Chunk 14

**Risks:** italaw HTML structure changes break selectors — pin CSS selectors and add a CI smoke test that fetches one known live page and checks selector stability. Alert via `freshness_log.status="error"` visible in telemetry dashboard. PDF parsing edge cases (multi-column, scanned pages) — document known failures; skip PDFs that fail extraction rather than crashing.

---

### Chunk 16: ICSID Portable DB
**Goal:** ICSID investment arbitration awards are searchable via the portable DB MCP server.

**Scope:**
- `IcsidScraper extends BaseScraper`: fetches ICSID case list, handles three URL patterns (award / decision on jurisdiction / annulment), PDF text extraction
- `IcsidMcpServer extends PortableMcpServer`
- Add ICSID to `mcp_servers` seed
- `npm run scrape:icsid` script
- Test fixtures: 5 recorded HTML pages + fixture SQLite DB (at least one per URL pattern)
- **First-scrape duration note:** full ICSID scrape takes several hours. Document in README.

**Out of scope:** Caching.

**Demo:** Query "ICSID cases involving energy disputes" → ICSID MCP called → cited result with icsid.worldbank.org URL.

**Tests:**
- Unit: `IcsidScraper` correctly handles all three ICSID page types (one fixture each)
- Unit: scraper checkpoints and resumes after interruption
- Integration: search + retrieve against fixture DB
- Integration: full chat round-trip; citation stored

**Acceptance criteria:**
- Scraper handles all three ICSID page patterns
- Citation URL is a valid icsid.worldbank.org URL
- `npm run scrape:icsid` completes on fixture data
- Scraper can resume from checkpoint

**Estimated days:** 4

**Depends on:** Chunk 14

**Risks:** ICSID case page structure may differ between case types — test all three in fixture set.

---

### Chunk 17: Caching Layer
**Goal:** MCP query results are cached to reduce external API calls and latency on repeated queries.

**Scope:**
- `cache_results` table migration (schema per Section 3)
- `CacheManager` in `backend/src/lib/mcp/cache.ts`: `get(source, query)`, `set(source, query, result, ttl)`, `cleanup()` (delete expired rows)
- **Query normalization** (must match Section 2.5 exactly): lowercase → collapse whitespace → strip leading/trailing punctuation. Implemented as a shared `normalizeQuery(q: string): string` function in `backend/src/lib/mcp/queryNormalizer.ts`, imported by both `CacheManager` and the `mcp_events` telemetry path. Document normalization logic with a comment block in the file.
- Cache lookup before `McpClientManager.callTool()` in the dispatch path
- Cache write after successful MCP response
- TTL config: stable sources (al-meezan, italaw, icsid) = 86400s; live (courtlistener, eurlex, govinfo) = 3600s
- `cache_hit` field added to `mcp_tool_call_start` SSE event
- `cleanup()` called on Express startup

**Out of scope:** Cache invalidation UI, telemetry dashboard.

**Demo:** Same query sent twice → second call returns faster; DevTools shows `cache_hit: true` in SSE event.

**Tests:**
- Unit: `CacheManager.get()` returns null on miss, correct result on hit
- Unit: TTL respected (Vitest fake timers)
- Unit: `cleanup()` deletes only expired rows
- Integration: second identical query does not call MCP server (call count assertion via mock)
- **Normalization tests:** "FIDIC time-bar", "fidic time-bar", "  FIDIC  TIME-BAR  ", "FIDIC time-bar." all produce the same cache hit

**Acceptance criteria:**
- Cache hit on identical query within TTL
- MCP server not called on cache hit
- Expired rows pruned on startup
- `cache_hit` field correct in SSE event
- Equivalent queries with different case/whitespace/punctuation produce same cache key

**Estimated days:** 2.5

**Depends on:** Chunk 3

---

### Chunk 18: Error Handling — Circuit Breakers + Retries
**Goal:** MCP source failures are handled gracefully with no user-facing crash.

**Scope:**
- `CircuitBreaker` class in `backend/src/lib/mcp/circuitBreaker.ts`
  - States: `closed` → `open` → `half-open`
  - Opens after 3 consecutive failures within 60s
  - Half-open after 60s; success → closed; failure → open again with exponential backoff on the next half-open window (60s → 120s → 240s, cap at 300s)
- Retry wrapper: 2 attempts, exponential backoff (500ms, 1000ms)
- `McpClientManager` wraps each `callTool()` with retry + circuit breaker
- When circuit opens: remove tool definitions from `activeTools`, append unavailability note to system prompt (see Section 2.7), emit `source_unavailable` SSE event

**Out of scope:** Telemetry logging (Chunk 19).

**Demo:** Kill CourtListener MCP child process → next query uses remaining sources → UI shows "CourtListener temporarily unavailable" indicator.

**Tests:**
- Unit: `CircuitBreaker` state machine (closed→open→half-open→closed)
- Unit: exponential backoff on repeated probe failures (60s, 120s, 240s, 300s cap)
- Unit: retry wrapper attempts exactly 2 times before failing
- Unit: open circuit returns error immediately without calling MCP
- Integration: mock server fails 3 times → circuit opens

**Acceptance criteria:**
- Circuit opens after 3 failures within 60s
- Exponential reset: 60s → 120s → 240s → 300s cap
- `source_unavailable` SSE event emitted when circuit open
- Partial results returned (no total failure when one source is down)

**Estimated days:** 1

**Depends on:** Chunk 3

---

### Chunk 19: Telemetry and Per-Source Dashboard (Admin Only)
**Goal:** Operators can see per-source success rates, latency, and cache hit rates. Access is restricted to admin users.

**Scope:**
- `mcp_events` table migration (schema per Section 3, including `query_hash`)
- Log one row per MCP tool call in `McpClientManager` (after call completes); use `normalizeQuery()` from Chunk 17 to compute `query_hash`
- Backend route `GET /admin/mcp-telemetry` — returns per-source aggregates: total calls, success rate (%), avg latency (ms), cache hit rate (%), last 24h error count. Returns 403 if `user_profiles.is_admin = false`.
- Frontend page `/admin/mcp-telemetry`: table of source stats, auto-refreshes every 60s, renders 404 for non-admin users
- **Nightly cleanup job:** `DELETE FROM mcp_events WHERE created_at < NOW() - INTERVAL '30 days'`. Wired to Express startup or a cron script.

**Out of scope:** Alerting, Grafana, per-user breakdown.

**Demo:** Admin visits `/admin/mcp-telemetry` → sees table with per-source health metrics. Non-admin user visiting the same URL sees 404.

**Tests:**
- Unit: telemetry row logged correctly per MCP call (success and failure), including `query_hash`
- API: `GET /admin/mcp-telemetry` returns correct aggregated stats for admin users
- API: non-admin users receive 403 from telemetry route
- Component: telemetry table renders with data
- Unit: cleanup job deletes rows older than 30 days, preserves recent rows

**Acceptance criteria:**
- One telemetry row per MCP tool call
- Dashboard shows success rate, avg latency, cache hit rate per source
- Non-admin users receive 403 from telemetry route
- Cleanup job runs and prunes correctly

**Estimated days:** 2

**Depends on:** Chunk 18

**Risks:** `mcp_events` will grow quickly — cleanup job handles this, but add a monitoring check if table size exceeds 1M rows before v1.5 cleanup review.

---

### Chunk 20: Citation URL Liveness + Side-by-Side Viewer
**Goal:** A liveness check confirms that cited URLs are reachable, and a side-by-side viewer lets lawyers read the source alongside the citation excerpt.

This chunk deliberately stops at URL reachability. Full claim-level verification (decomposing assistant answers into atomic claims, running multi-agent council verdicts per claim) is handled by **Feature 2 of the roadmap (hallucination council)** and is explicitly out of scope here. Do not introduce text-matching logic that competes with the council.

**Scope:**
- `CitationLivenessChecker` service in `backend/src/lib/mcp/citationLiveness.ts`
  - HEAD request to citation URL (5s timeout)
  - Returns: `live` | `unreachable` (non-2xx or timeout)
- `citations.liveness_status` column (already in schema from Chunk 4 migration)
- Backend route `POST /citations/:id/check-liveness` — triggers liveness check, updates DB, returns status
- Frontend: liveness indicator on `CitationCard` — green dot for `live`, grey for `unchecked`, red for `unreachable`
- **"Verify and read" button** on `CitationCard` (stub wired in Chunk 5): opens a side panel with the source URL rendered in an iframe alongside the citation excerpt. The lawyer reads both; no automated verdict is produced.
- Auto-check liveness on citation creation for all sources (background, non-blocking)

**Forward reference:** Full claim-level verification with green/red verdicts per cited claim is implemented in Feature 2 (hallucination council). The `liveness_status` field is reserved for URL reachability only; `verified` and `unverified` values must not be introduced in this chunk.

**Out of scope:** Text-matching, automated verification badges, hallucination council.

**Demo:** User clicks "Verify and read" on a CourtListener citation → side panel opens with source URL in iframe alongside excerpt. Liveness dot is green if URL is reachable, red if not.

**Tests:**
- Unit: `CitationLivenessChecker` with recorded HTTP — `live` on 2xx, `unreachable` on 404/timeout
- Unit: 5s timeout → `unreachable`
- API: `POST /citations/:id/check-liveness` updates `liveness_status` in DB
- Component: liveness dot renders correct variant for each status
- Component: "Verify and read" opens side panel with iframe at correct URL

**Acceptance criteria:**
- Liveness dot renders for all status values (`unchecked`, `live`, `unreachable`)
- Liveness route updates DB row
- Timeout handled gracefully (status `unreachable`, no crash)
- Side panel opens with source URL in iframe alongside excerpt

**Estimated days:** 1

**Depends on:** Chunk 5

---

## 6. Milestone Roadmap

### Milestone 1: Plumbing (Weeks 1–2)
**Chunks:** 1, 2, 3, 4, 5, 6, 7
**Theme:** Everything works with a fake source. No real API calls required to demo.
**Demo:** Fake MCP tool returns cited results; citation cards render in chat (compact list for 4+ citations); source picker popover shows correct regions, `region_glyph` badges, and state badges. API key saved encrypted.
**Work:** ~11 engineering days (+1 day for encryption in Chunk 6)

### Milestone 2: First Real Source (Week 3)
**Chunks:** 8, 10
**Theme:** Real legal data in the product; scope control working. No router chunk.
**Demo:** Lawyer asks a US case-law question, gets cited CourtListener results with clickable CL URLs; sticky scope toggle lets them limit all follow-up queries in the thread to CourtListener only.
**Work:** ~3.5 engineering days (was 5 — saved 2 by deleting Chunk 9, added 0.5 for scope persistence)

### Milestone 3: Breadth (Weeks 4–5)
**Chunks:** 11, 12, 13
**Theme:** Multi-region, multi-language research; Gulf coverage live.
**Demo:** Source picker shows 4+ connected sources across US, EU, and Gulf; Arabic Al-Meezan provision renders RTL with correct stem search; CJEU case cited from EUR-Lex.
**Work:** ~4 engineering days (GovInfo bumped to 2 days)

### Milestone 4: Portable DB Pattern (Weeks 5–7)
**Chunks:** 14, 15, 16
**Theme:** Investment arbitration awards retrievable; portable DB pattern validated for future sources.
**Demo:** Query "Yukos arbitration" returns cited italaw result; ICSID case list searchable; `npm run scrape:italaw` documented in README with duration warning; scrape resumability demonstrated.
**Work:** ~10 engineering days (scrapers 4 days each; framework 2 days)

### Milestone 5: Hardening (Weeks 7–9)
**Chunks:** 17, 18, 19, 20
**Theme:** Production-ready reliability and observability.
**Demo:** Ops dashboard (admin-only) shows per-source health; CourtListener gracefully degrades with exponential circuit reset when killed; citation liveness dot on every citation card; "Verify and read" side panel working.
**Work:** ~6.5 engineering days

---

## 7. Testing Strategy

### Framework
**Vitest** for unit and integration tests. Config at `backend/vitest.config.ts`. Tests co-located with source as `*.test.ts` files. No Jest.

### HTTP Mocking
**msw (Mock Service Worker)** for mocking external HTTP calls made by MCP servers. Fixtures (recorded request/response pairs) stored in `backend/src/__fixtures__/{source}/`. Recorded once against real APIs using msw passthrough mode; replayed deterministically in CI.

### MCP Server Mocking
In-process mock MCP server (Chunk 2) for all tests that need an MCP round-trip. Tests that specifically test child process spawning/reconnect use the `echoMcpServer.ts` script (a minimal real MCP server that echoes inputs).

### Rate Limit Testing
Vitest fake timers (`vi.useFakeTimers()`) for circuit breaker timing and backoff delays. HTTP fixture responses include 429 rate-limit responses for each source — replayed without burning real quota.

### Citation Liveness Testing
Deterministic: recorded HTTP responses — 2xx for `live`, 404/timeout for `unreachable`. Sampling audit (separate script, not in CI): monthly, fetches 10 random recent citations and checks live URLs — alerts on failures but does not block merges.

### Fixture Lifecycle Policy
- Each source has a refresh script: `npm run refresh-fixtures:{source}` (e.g. `npm run refresh-fixtures:courtlistener`)
- Each fixture file includes a `recorded_at` ISO 8601 timestamp in its metadata comment or header field
- CI emits a warning (does not fail) when any fixture is >90 days old, based on `recorded_at`
- README documents fixture refresh ownership and cadence: engineering team refreshes before each release cycle

### CI Gates (all must pass to merge)
1. `npx tsc --noEmit` — typecheck (backend + frontend)
2. `npx vitest run` — all unit + integration tests
3. `npm run lint` — ESLint (frontend)
4. Schema migration dry-run: `supabase db diff` or equivalent
5. Build: `npm run build` (backend + frontend)

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Community MCP servers (courtlistener-mcp, eur-lex-mcp) go unmaintained or break | Medium | High | Pin to specific npm versions. Weekly CI smoke test calls `listTools()` against the real server. If broken, fork and vendor. |
| Rate limit exhaustion mid-demo or under launch traffic | Medium | High | Caching layer (Chunk 17) eliminates repeated queries. Circuit breakers (Chunk 18) prevent cascading calls. msw fixtures prevent quota burn in tests. |
| Auth credential leakage via logs or error messages | Low | High | API keys encrypted at rest (Chunk 6). Never log raw key values. Explicit filter in Express error handler. `api_key` excluded from all SSE events. Launch-gate audit checklist (Section 2.6) required before launch. |
| Portable DB scrape blocking — italaw/ICSID HTML changes break parser | Medium | High | Pin CSS selectors. CI smoke test fetches one known live page per scraper and checks selector stability. Alert via `freshness_log.status="error"` visible in telemetry dashboard. |
| Legal exposure for portable DB scraping (CanLII-style ToS litigation) | Low | High | italaw: no explicit ToS against bulk access; conservative approach (excerpts only, attribution, respect robots.txt). ICSID: World Bank public data, same approach. Never build portable DB for CanLII without official API key and legal sign-off. Document posture clearly in README. |
| LLM context overflow when MCP returns too much | Medium | Medium | Two-tier truncation (Section 2.3) — full list preserved, deep excerpts for top 5–10 results only. Total MCP context addition: max ~12,000 tokens — well within Claude Sonnet's 200k context. |
| Citation hallucination — LLM cites MCP source but invents the content | Medium | High | System prompt: explicit citation rules (cite verbatim from tool result, include source_id and URL). Excerpt stored at retrieval time, not generated by LLM. Liveness check (Chunk 20) surfaces dead URLs. Full claim-level verification is Feature 2 (hallucination council). |
| User confusion about scope state (which sources are active for this thread) | Low | Medium | Sticky-for-thread mode surfaces a visible "Scope: N sources for this thread" indicator with Clear button. No sources silently active or silently excluded. |
| Per-user research pattern leakage if telemetry is mis-scoped | Low | Medium | Telemetry dashboard gated on `user_profiles.is_admin`. Non-admin requests return 403. Frontend renders 404 to non-admins. |
| Lazy-spawn cold-start latency visible to users | Low | Low | ~500ms spawn on first query to a source. User has already submitted their message; this is within normal LLM latency. Acceptable trade-off vs. always-on memory cost. |

---

## 9. Open Questions

1. **GovInfo MCP npm package name.** The GPO MCP server is "in public preview" — what is the exact npm package name and is it published? This unblocks Chunk 11 only after the package ships. Fallback: build a thin wrapper around the api.data.gov REST API.

2. **Al-Meezan npm package name.** What is the exact package name for the Ansvar Systems Al-Meezan server?

3. **Al-Meezan DB distribution.** Does the Ansvar Systems package ship with a pre-built SQLite DB, or does it require running a build script first? This affects self-hosted setup complexity and README instructions significantly.

4. **EUR-Lex: one package or two?** The roadmap mentions both `scimorph/eur-lex-mcp` (live SOAP) and `Ansvar-Systems/Comprehensive-EU-Law-MCP` (SQLite-backed). This spec recommends scimorph for v1 (live search breadth). If Ansvar's package covers more regulation, evaluate adding it in v1.5.

5. **Existing `MikeCitationAnnotation` type.** The frontend already has this type in `shared/types.ts` and existing citation rendering logic. Review before Chunk 5 to determine if `CitationCard` should extend or replace it — avoid two competing citation types.

6. ~~**Admin access for telemetry dashboard.**~~ **Closed.** Admin-only via `user_profiles.is_admin` flag (Section 3, Chunk 19). Non-admins receive 403.

---

## 10. Appendix: Proof-of-Concept Task

*(Unchanged from v1. Run Monday regardless of spec revision status.)*

### 1-day spike: MCP host SDK + stdio transport validation

**Why this first:** The single riskiest assumption in this spec is that `@modelcontextprotocol/sdk` works cleanly as a stdio MCP host in a Node.js process, and that at least one real Tier 1 npm MCP package produces the expected structured output via that transport. If this fails, the entire architecture changes (fallback: SSE over HTTP where each MCP server exposes its own HTTP endpoint). This is worth validating in isolation before writing a line of production code.

**Spike script:** `backend/scripts/spike-mcp-host.ts` (not Express — standalone Node.js)

```
1. npm install @modelcontextprotocol/sdk
2. npm install courtlistener-mcp  (or eur-lex-mcp if courtlistener isn't available)
3. Write ~60 lines:
   - Spawn the MCP server as a child process via StdioClientTransport
   - Call client.listTools() → print result
   - Call one search tool with a known query → print result
   - Exit cleanly (process.exit(0))
```

**Success criteria:**
- `listTools()` returns structured tool definitions (name, description, inputSchema)
- Search tool returns JSON with at least one result matching the expected schema
- No stderr pollution, no unhandled rejections, process exits cleanly

**Failure modes to document:**
- Transport handshake timeout → investigate SDK version / server version mismatch; pin versions
- Garbled stdout (non-JSON) → MCP server writing debug output to stdout; report as bug on server's repo
- Missing expected fields in response → update normalization logic before Chunk 3
- Import errors / peer dependency conflicts → resolve before starting Chunk 1

**Done criterion:** Spike script runs end-to-end by end of day 1. If it fails, reassess: fallback is running each MCP server as a persistent HTTP service (SSE transport), which adds deployment complexity but removes the child process dependency.

---

## Critical Files Modified During Implementation

| File | Changed in Chunk |
|---|---|
| `backend/src/lib/chatTools.ts` | 3 — extend `runLLMStream()` and `runToolCalls()` |
| `backend/src/lib/userSettings.ts` | 6 — add MCP key retrieval |
| `backend/src/routes/chat.ts` | 3 — pass MCP context to `runLLMStream()` |
| `backend/src/index.ts` | 1 — initialize/dispose `McpClientManager` singleton |
| `backend/migrations/` | 4, 6, 17, 19 — 5 new migration files |
| `frontend/src/app/hooks/useAssistantChat.ts` | 5, 8, 18 — handle new SSE events |
| `frontend/src/app/components/assistant/ChatInput.tsx` | 7 — add Sources pill |
| `frontend/src/app/components/assistant/AssistantMessage.tsx` | 5 — add citation cards |

## New Directory Structure

```
backend/src/lib/mcp/
  clientManager.ts         # McpClientManager singleton (lazy-spawn)
  cache.ts                 # CacheManager
  queryNormalizer.ts       # normalizeQuery() shared utility
  circuitBreaker.ts        # CircuitBreaker (exponential reset)
  citationLiveness.ts      # CitationLivenessChecker
  encryption.ts            # encryptApiKey / decryptApiKey
  types.ts                 # Citation, McpToolDef, McpServer, etc.
  portable/
    baseScraper.ts         # resumable scraper base
    portableMcpServer.ts
    freshnessManager.ts
    italaw/
      scraper.ts
      server.ts
    icsid/
      scraper.ts
      server.ts
backend/src/__mocks__/
  echoMcpServer.ts          # Minimal real MCP server for spawn tests
  mockMcpServer.ts          # In-process mock for unit/integration tests
backend/src/__fixtures__/
  courtlistener/            # msw HTTP cassettes (with recorded_at metadata)
  govinfo/
  al-meezan/                # fixture SQLite DB (10 provisions)
  eurlex/                   # recorded SOAP XML responses
  italaw/html/              # 5 recorded case pages
  icsid/html/               # 5 recorded case pages
backend/data/               # SQLite DB files — gitignored
  italaw.db
  icsid.db
backend/scripts/
  spike-mcp-host.ts         # PoC spike (Appendix)
  scrape-italaw.ts
  scrape-icsid.ts
frontend/src/app/components/assistant/
  CitationCard.tsx          # card + compact list view + liveness dot + side panel
  SourcePickerPopover.tsx
  SourcesPill.tsx
frontend/src/app/(pages)/admin/
  mcp-telemetry/
    page.tsx                # admin-only, 404 for non-admins
```
