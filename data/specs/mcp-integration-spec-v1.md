# MCP Integration Specification
## Dispumike — Legal Database Research via MCP

*Status: Draft for review — 2026-05-01*

---

## 1. Executive Summary

**20 chunks, 5 milestones, ~8 calendar weeks** for a single engineer.

| Milestone | Name | Calendar | Demo |
|---|---|---|---|
| M1 | Plumbing | Weeks 1–2 | Fake MCP tool returns cited results; citation cards render; source picker visible |
| M2 | First Real Source | Week 3 | Lawyer asks US case-law question, gets cited CourtListener results with scope control |
| M3 | Breadth | Weeks 4–5 | Source picker with multiple regions, Arabic Al-Meezan results, EUR-Lex working |
| M4 | Portable DB | Weeks 5–6 | Investment arbitration awards (italaw + ICSID) retrievable |
| M5 | Hardening | Weeks 7–8 | Ops dashboard, graceful degradation, citation verification badges |

**Critical path:** Chunk 1 (MCP host plumbing) → Chunk 3 (tool registration) → Chunk 10 (CourtListener) → Chunk 14 (portable DB framework) → Chunk 17 (caching). Everything else is parallelizable around this spine.

**Locked decisions (not re-opened here):**
- Transport: **stdio** — self-hosted deployments, `child_process.spawn` works freely
- Credentials: **per-user API keys** in `user_profiles` + `.env` fallback, matching existing claude/gemini key pattern
- MCP servers: **npm install** for Tier 1/2 servers; build portable DB servers for Tier 3
- Test framework: **Vitest**
- `McpClientManager`: **singleton**, started at Express boot, disposed on process exit
- Speed priority: quickest working solution first

---

## 2. Architecture Decisions

### 2.1 MCP Host Implementation

Use `@modelcontextprotocol/sdk` (official TypeScript SDK, `Client` class with `StdioClientTransport`). Each MCP server runs as a **stdio child process** spawned by the Express backend via `child_process.spawn`. No separate service, no networking between host and server.

Rationale: Self-hosted deployments run Express on a standard VPS or Docker container where `child_process.spawn` works without restriction. Stdio is the simplest transport — no port management, no auth between host and server, no latency from HTTP round-trips. The official SDK handles framing and protocol.

`McpClientManager` is a **singleton** initialized at Express boot (`backend/src/index.ts`), keeping all connected MCP servers alive as long-running child processes. It is disposed cleanly on `SIGTERM`/`SIGINT`. This eliminates per-request cold-start latency (~500ms per spawn).

### 2.2 Tool Registration

A **router function** filters the active tool list before each LLM call. It scores the user's query against connected sources using keyword/jurisdiction heuristics and selects at most 3 sources per turn. The user's per-query scope toggle overrides the router.

Rationale: 6 sources × ~3 tools each = up to 18 extra tools injected every turn. Exposing all 18 every turn bloats the context window and confuses the LLM into calling irrelevant sources. A lightweight heuristic router keeps the tool list tight without a full sub-agent call.

### 2.3 Context Budget for Tool Results

Hard cap of **4,000 tokens per MCP tool result**. Results exceeding this are truncated at the token boundary with: `[Truncated — {N} total results available. Narrow your query for more detail.]`. No LLM summarization in the tool path — truncation is deterministic and fast.

Rationale: LLM summarization adds latency, cost, and a hallucination surface. Deterministic truncation is transparent. 4,000 tokens ≈ 3,000 words — sufficient for 5–10 case summaries or 15–20 statute excerpts.

### 2.4 Citation Data Model

Shape: `{ source_type, source_id, url, title, excerpt (≤500 chars), retrieved_at }`. Stored in a Supabase `citations` table linked to `chat_messages`. Also emitted as an SSE `mcp_citations` event at end of each assistant message. Rendered in the frontend as **citation cards** below the assistant message — title bold, excerpt in grey, URL as a clickable chip opening in a new tab.

Rationale: URL-only citations are not verifiable (the LLM may paraphrase). Full document storage is unnecessary and raises compliance concerns. Excerpt + URL gives lawyers exactly what they need: a snippet to scan and a link to verify.

### 2.5 Caching Strategy

Cache key: SHA-256 of `(source, normalized_query_text)`. Stored in `cache_results` table with `expires_at`. TTL: **24 hours** for stable sources (Al-Meezan, italaw, ICSID), **1 hour** for live sources (CourtListener, EUR-Lex, GovInfo). Cache lookup before MCP call; cache write after successful MCP response. Invalidation: TTL expiry only (no manual flush needed for v1).

Rationale: Per-query caching eliminates redundant API calls for repeated research questions — common in legal work. 24h TTL for local/stable sources is safe (legislation doesn't change daily). 1h for live sources balances freshness against quota.

### 2.6 Auth and Credentials

New columns in `user_profiles`: `courtlistener_api_key text`, `govinfo_api_key text`. Retrieved via the existing `getUserApiKeys` pattern in `backend/src/lib/userSettings.ts`. Fallback to env vars `COURTLISTENER_API_KEY`, `GOVINFO_API_KEY` when no user key is set. User provides keys via the existing user settings page (new "Legal Sources" section matching the claude/gemini key UI). Keys passed to MCP child processes via environment variable at spawn time. Keys never appear in logs.

### 2.7 Error Handling Philosophy

**Circuit breaker per source** — open after 3 consecutive failures within 60 seconds, auto-reset after 5 minutes (half-open: allow 1 test request, success → closed, failure → open again). **Retry policy** — 2 attempts with exponential backoff (500ms, 1000ms). **User-facing** — when a source circuit is open, emit SSE `source_unavailable: { source, message }`. LLM continues with available sources; partial results are better than none.

### 2.8 Portable Database Pattern

Scraper: Node.js script using `cheerio` for HTML parsing, `pdfjs-dist` (already in project) for PDF text extraction, `better-sqlite3` for SQLite writes. Schema includes an FTS5 virtual table. A `PortableMcpServer` base class wraps the SQLite DB and exposes `search` and `retrieve` tools via stdio MCP protocol. A `FreshnessManager` checks `freshness_log` in Supabase, triggers scrape if stale (>24h), updates log on completion. Scraper rate-limits HTTP fetches to 1 req/sec via `p-throttle`. Pattern derived from Ansvar Systems' Al-Meezan implementation (SQLite + FTS5, daily freshness).

### 2.9 Multilingual Handling

Al-Meezan: Arabic text rendered with `dir="rtl"` CSS on citation excerpt (detected via Unicode range U+0600–U+06FF). No translation in the tool path — the LLM handles Arabic-to-English translation when the user asks. EUR-Lex: query in English by default (`lang=en` parameter). No multilingual embedding strategy for v1 — FTS5 handles Unicode text natively.

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
6. `user_profiles` column additions
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
  flag_emoji                  text,                       -- '🇺🇸' | '🌐'
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

**Seed rows (v1 active):** CourtListener, GovInfo, Al-Meezan, EUR-Lex, italaw, ICSID.
**Seed rows (future, visible in picker as "Connect"):** UNCITRAL CLOUT, Saudi MoJ, BAILII, CanLII, BOE, Légifrance/Judilibre.

### `mcp_connections` — per-user enabled servers

```sql
create table mcp_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  server_id   uuid not null references mcp_servers on delete cascade,
  enabled     boolean not null default true,
  api_key     text,             -- user's own key for this source (v1: plaintext)
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
  chat_message_id uuid references chat_messages on delete set null,
  source_type     text not null,   -- 'courtlistener' | 'eurlex' | 'al-meezan' | 'govinfo' | 'italaw' | 'icsid'
  source_id       text,            -- canonical ID in the source (e.g. CL opinion ID, CELEX number)
  url             text not null,
  title           text,
  excerpt         text,            -- ≤500 chars, verbatim from source
  verification_status text not null default 'pending', -- 'pending' | 'verified' | 'unverified' | 'unavailable'
  retrieved_at    timestamptz not null default now()
);
create index citations_user_id on citations(user_id);
create index citations_chat_message_id on citations(chat_message_id);
create index citations_source_type on citations(source_type);
```

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
  id              uuid primary key default gen_random_uuid(),
  source          text not null unique,   -- 'italaw' | 'icsid'
  last_scraped_at timestamptz,
  records_count   integer,
  status          text not null default 'pending', -- 'pending' | 'ok' | 'error'
  error_message   text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
```

### `mcp_events` — telemetry (Chunk 19)

```sql
create table mcp_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete set null,
  source      text not null,
  tool        text not null,
  latency_ms  integer,
  cache_hit   boolean not null default false,
  success     boolean not null,
  error_type  text,
  created_at  timestamptz not null default now()
);
create index mcp_events_created_at on mcp_events(created_at);
create index mcp_events_source on mcp_events(source);
```

### `user_profiles` additions

```sql
alter table user_profiles
  add column courtlistener_api_key text,
  add column govinfo_api_key text;
```

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

**Edge cases:** Pagination — for v1, take first page only (20 results max); note in excerpt if truncated. Low relevance scores for rare topics — no special handling.

**Test fixtures:** msw-recorded HTTP cassettes in `backend/src/__fixtures__/courtlistener/`. Include: search response (5 results), empty response, 429 rate-limit response.

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

**Test fixtures:** Recorded in `backend/src/__fixtures__/govinfo/`.

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

**Edge cases:** Arabic-only provisions — excerpt uses `dir="rtl"` rendering in `CitationCard`. Arabic Unicode encoding in older provisions.

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

**Test fixtures:** Recorded SOAP XML responses in `backend/src/__fixtures__/eurlex/`.

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

**Edge cases:** HTML structure changes break selectors — pin CSS selectors, monitor via `freshness_log.status`. Some cases in French/Spanish — return as-is (no translation). Award texts are PDFs — extract with `pdfjs-dist`.

**Test fixtures:** 5 recorded HTML pages in `backend/src/__fixtures__/italaw/html/`. Fixture SQLite DB (`italaw_test.db`) with 5 cases.

**Compliance:** italaw maintained by Prof. Newcombe for public access. No explicit ToS against bulk access. Conservative approach: excerpts only (≤500 chars), attribution to italaw.com, do not republish full award texts.

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

**Edge cases:** Three URL patterns (award / decision on jurisdiction / annulment) — scraper handles all three. Award documents are PDF-only — use `pdfjs-dist`.

**Test fixtures:** 5 recorded HTML pages, fixture SQLite DB with 5 cases.

**Compliance:** ICSID is a World Bank body. Award texts are public. Attribution: "Data from ICSID / World Bank."

---

## 5. Chunk Breakdown

### Chunk 1: MCP Host Plumbing
**Goal:** The Express backend can spawn, communicate with, and health-check an MCP server as a stdio child process.

**Scope:**
- Install `@modelcontextprotocol/sdk`
- `McpClientManager` singleton in `backend/src/lib/mcp/clientManager.ts`
- `initialize()`: spawns child processes for all enabled servers on Express boot
- `listTools(serverName)`: returns normalized tool definitions from a running server
- `callTool(serverName, name, args)`: calls tool, returns result
- `healthCheck(serverName)`: pings server, returns ok/error
- Auto-reconnect on child process exit (exponential backoff, max 3 attempts)
- `dispose()`: kills all child processes cleanly; called on `SIGTERM`/`SIGINT`

**Out of scope:** Tool registration in agent loop, any real MCP server, credentials wiring.

**Demo:** Dev runs `npx ts-node scripts/test-mcp-host.ts` with a minimal echo MCP server and sees `listTools()` output in the terminal.

**Tests:**
- Unit: `McpClientManager.initialize()` spawns mock echo server and `listTools()` returns tools
- Unit: reconnect fires after child process exits unexpectedly
- Unit: `dispose()` kills all spawned processes

**Acceptance criteria:**
- `listTools()` returns at least one tool from a running MCP server
- Child process exit triggers reconnect within 1s
- `dispose()` kills all spawned processes (verified via spy)

**Estimated days:** 2

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

**Out of scope:** Router agent (Chunk 9), per-query scope (Chunk 8), real MCP servers.

**Demo:** Dev starts Express with mock MCP server active, sends a chat message — LLM emits `mcp__mock__search_cases` tool call, backend executes it, result feeds into next LLM turn.

**Tests:**
- Integration: full chat round-trip with mock MCP server; tool call executed and result returned
- Unit: tool name prefix detection in `runToolCalls()`
- Unit: MCP result normalized correctly to tool result format

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
- Supabase migration: `citations` table (schema per Section 3)
- Citation parser function: maps MCP tool result fields to citation schema per `source_type`
- On message save: insert citation rows linked to `chat_message_id`
- New SSE event `mcp_citations: Citation[]` emitted at end of assistant message
- `Citation` TypeScript type in `backend/src/lib/mcp/types.ts`
- System prompt additions: citation rules for MCP sources (cite verbatim, include source URL)

**Out of scope:** Citation rendering UI (Chunk 5), citation verification (Chunk 20).

**Demo:** Chat with mock MCP active → `citations` table has a row → browser network tab shows `mcp_citations` SSE event with correct shape.

**Tests:**
- Unit: citation parser maps mock MCP response to citation schema for each `source_type`
- Integration: citation row created in DB after chat with mock MCP server
- Unit: SSE event emitted with correct shape

**Acceptance criteria:**
- Citation row inserted with correct `source_type`, `url`, `title`, `excerpt`
- `mcp_citations` SSE event matches citation rows
- Empty array emitted if no MCP tools called

**Estimated days:** 2

**Depends on:** Chunk 3

**Risks:** Citation extraction depends on LLM reliably using the MCP tool results — system prompt citation rules are critical here.

---

### Chunk 5: Citation Rendering Component
**Goal:** MCP citations appear in the chat UI as clickable cards below assistant messages.

**Scope:**
- `CitationCard` React component: title (bold), excerpt (grey), source badge (name + flag emoji), "Open source" link chip
- `mcp_citations` SSE event handler added to `useAssistantChat` hook
- Citations stored in message state, rendered below `AssistantMessage`
- RTL support: if `excerpt` contains Arabic text (Unicode U+0600–U+06FF), apply `dir="rtl"` to excerpt element

**Out of scope:** Citation verification badge (Chunk 20), telemetry.

**Demo:** Chat with mock MCP server → citation card appears below assistant message with title, excerpt, source badge, and clickable URL chip opening in new tab.

**Tests:**
- Component: `CitationCard` renders title, excerpt, source badge, and link
- Component: `dir="rtl"` applied when excerpt is Arabic
- Component: link has `target="_blank"` and correct `href`
- Hook: `mcp_citations` SSE event parsed and stored in message state

**Acceptance criteria:**
- Citation card renders for each citation in `mcp_citations` event
- Link opens source URL in new tab
- Arabic excerpt renders RTL
- No citation cards if no `mcp_citations` event received

**Estimated days:** 1

**Depends on:** Chunk 4

**Risks:** Styling may clash with existing `AssistantMessage` layout — reference existing `doc_read` event card for visual patterns.

---

### Chunk 6: Source Connections DB + User Settings UX
**Goal:** Users can view, enable, and configure API keys for MCP sources via the settings page.

**Scope:**
- Supabase migrations: `mcp_servers` (with seed data for all 14 sources visible in source picker), `mcp_connections`; `user_profiles` column additions
- Backend: `GET /user/mcp-connections` (list all servers + user's connection status), `POST /user/mcp-connections` (create/update), `DELETE /user/mcp-connections/:serverId`
- Frontend settings page: new "Legal Sources" section — all servers grouped by region, toggle + API key input for servers with `auth_type="api_key"`, greyed "coming soon" for unimplemented servers
- Extend `getUserApiKeys()` in `userSettings.ts` to include MCP source keys
- `.env` fallback used when no user key set

**Out of scope:** Source picker in chat (Chunk 7).

**Demo:** User → Settings → Legal Sources → toggles CourtListener on → enters API key → saves → row in `mcp_connections`.

**Tests:**
- API: `GET /user/mcp-connections` returns correct list with user's connection status
- API: `POST /user/mcp-connections` creates row, key stored
- API: user cannot access another user's connections
- Component: toggle + key input renders correctly per `auth_type`
- Unit: `getUserApiKeys()` returns MCP keys from `user_profiles` with `.env` fallback

**Acceptance criteria:**
- Connection saved in `mcp_connections`
- API key stored (never appears in logs or SSE events)
- `.env` fallback used when no user key
- All 14 sources visible in settings

**Estimated days:** 2

**Depends on:** Chunk 1

**Risks:** API key field must never appear in Express logs — add explicit log filter in error handler.

---

### Chunk 7: Source Picker Popover UI
**Goal:** A "Sources" pill in the chat input opens the source picker popover matching the v2 mockup design.

**Scope:**
- `SourcesPill` component in chat input toolbar (alongside + Documents, Projects, Workflows)
- `SourcePickerPopover` component:
  - Search input (filters by name, case-insensitive)
  - Sources grouped by region in order: Internal → International arbitration → Gulf & Middle East → European Union → United States → Other jurisdictions
  - State badges: "Always on" (internal docs), "Connected" (teal), "Connect" (grey), "Permission required" (amber)
  - Country flag + ISO code badge per source
  - "Add custom MCP server" footer (placeholder, disabled for v1)
- Count in pill: "Sources · N active"
- Data fetched from `GET /user/mcp-connections` on popover open

**Out of scope:** Per-query scope toggles (Chunk 8), custom MCP server add.

**Demo:** Chat input shows "Sources · 6 active" pill; click opens popover matching the mockup — regions, flags, state badges, search working.

**Tests:**
- Component: popover opens on pill click, closes on outside click
- Component: sources grouped by region in correct order
- Component: search filters list in real time
- Component: state badge variant matches connection status
- Component: count in pill reflects active sources

**Acceptance criteria:**
- Popover matches mockup design (regions, flag badges, state badges)
- Search filters correctly
- Count accurate

**Estimated days:** 2

**Depends on:** Chunk 6

**Risks:** Popover positioning on small viewports — test at 375px width.

---

### Chunk 8: Per-Query Scope Toggling
**Goal:** Users can enable/disable specific sources for the current query from the source picker, overriding their persistent settings.

**Scope:**
- Checkbox on each source row in `SourcePickerPopover`
- Per-query scope state in `useAssistantChat`: `activeSources: string[]` (server names)
- Scope passed to `POST /chat` as `mcpScope: string[]` body field
- Backend: when `mcpScope` provided, filter active servers to only those listed
- Scope resets to user's persistent settings after each message send

**Out of scope:** Router agent (Chunk 9).

**Demo:** User opens source picker, unchecks CourtListener, sends query — backend only queries remaining active sources; CourtListener MCP not called.

**Tests:**
- Integration: `mcpScope=["eurlex"]` → only EUR-Lex MCP called (mock MCP server verifies via call count)
- Component: checkbox state reflected in pill count
- Unit: scope resets after message send

**Acceptance criteria:**
- `mcpScope` respected server-side — unscoped servers not called
- Scope overrides connection-level `enabled` flag
- Scope resets after send

**Estimated days:** 1

**Depends on:** Chunks 7, 3

**Risks:** None significant.

---

### Chunk 9: Router Agent
**Goal:** A lightweight router decides which MCP sources to query per turn, reducing irrelevant tool calls.

**Scope:**
- `mcpRouter()` function in `backend/src/lib/mcp/router.ts`
- Input: user message text + list of connected server names
- Logic: keyword/jurisdiction heuristics (not an LLM call for v1):
  - "Qatar", "Qatari", "Al-Meezan" → `al-meezan`
  - "ICSID", "investment arbitration", "treaty award" → `icsid`, `italaw`
  - "EU", "European", "GDPR", "CJEU", "directive" → `eurlex`
  - "US", "federal", "CFR", "Federal Register" → `govinfo`, `courtlistener`
  - Weak/no signal → all connected sources (conservative fallback)
- Caps at 3 sources per turn
- User's per-query scope override always respected (applied after router)

**Out of scope:** ML-based router (v2), router telemetry.

**Demo:** Query "What does Qatari law say about force majeure?" → only `al-meezan` MCP spawned for that turn.

**Tests:**
- Unit: router returns correct sources for 20 test queries (one per source + mixed-jurisdiction cases); assert ≥18/20 correct
- Unit: router caps at 3 sources
- Unit: scope override always takes priority

**Acceptance criteria:**
- 90% accuracy on test query set (18/20)
- Always respects per-query scope
- Fallback to all connected when no signal

**Estimated days:** 2

**Depends on:** Chunk 8

**Risks:** Mixed-jurisdiction queries ("ICSID case applying EU law") may split poorly — conservative fallback (include both) is acceptable.

---

### Chunk 10: CourtListener Integration
**Goal:** Real CourtListener MCP server installed and functional end-to-end.

**Scope:**
- `npm install courtlistener-mcp` (DefendTheDisabled package — verify exact name)
- Add CourtListener to `McpClientManager.initialize()` with API key from user settings
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
- Install official GPO MCP package (name TBD)
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

**Estimated days:** 1

**Depends on:** Chunks 3, 6

**Risks:** GPO MCP package still in public preview — pin to specific version; may need to wait for publication.

---

### Chunk 12: Al-Meezan Integration
**Goal:** Al-Meezan MCP server installed and functional, with Arabic RTL rendering.

**Scope:**
- Install Ansvar Systems Al-Meezan package (name TBD)
- Add to `McpClientManager` (no API key needed)
- Integration test using fixture SQLite DB (10 provisions)
- RTL rendering confirmed working (from Chunk 5)
- System prompt: note that Arabic text may be returned

**Out of scope:** Caching, bilingual side-by-side display (Phase 4 roadmap).

**Demo:** Query "What does Qatari law say about arbitration clauses?" → Arabic provision text returned with RTL citation card.

**Tests:**
- Integration: chat with Al-Meezan fixture DB; Arabic citation stored
- Component: RTL renders correctly for Arabic excerpt

**Acceptance criteria:**
- Al-Meezan tool called, Arabic text in `excerpt`
- Citation links to al-meezan.qa
- RTL styling applied to Arabic excerpts

**Estimated days:** 1

**Depends on:** Chunks 3, 6

**Risks:** Npm package may not ship pre-built SQLite DB — users may need a build script. Document clearly in README.

---

### Chunk 13: EUR-Lex Integration
**Goal:** EUR-Lex MCP server installed and functional.

**Scope:**
- `npm install eur-lex-mcp` (scimorph package)
- Add to `McpClientManager` (no API key)
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
**Goal:** A reusable framework for scraping a public site into SQLite + FTS5 and exposing the DB as a stdio MCP server.

**Scope:**
- `backend/src/lib/mcp/portable/` directory
- `BaseScraper` abstract class: `scrape()` method, HTTP fetch with `p-throttle` (1 req/sec), `cheerio` parsing, `better-sqlite3` insert
- `PortableMcpServer` abstract class: connects to SQLite, exposes `search` (FTS5 BM25) and `retrieve` (by ID) tools via stdio MCP
- `FreshnessManager`: checks `freshness_log` in Supabase, triggers scrape if stale (>24h), updates log
- `npm run scrape:{source}` scripts in `backend/package.json`

**Out of scope:** italaw and ICSID specific scrapers (Chunks 15, 16).

**Demo:** Dev subclasses `BaseScraper` + `PortableMcpServer` with a toy source (5 hardcoded records), runs scraper, queries via MCP, sees results.

**Tests:**
- Unit: `BaseScraper` inserts records into SQLite, FTS5 trigger fires
- Unit: `PortableMcpServer.search()` returns BM25-ranked FTS5 results
- Unit: `PortableMcpServer.retrieve()` returns single record by ID
- Unit: `FreshnessManager` triggers scrape when stale, skips when fresh, updates log

**Acceptance criteria:**
- Scraper inserts and FTS5 is queryable
- `search` returns ranked results for a keyword
- `retrieve` returns correct record
- `freshness_log` row updated after scrape

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

**Out of scope:** ICSID.

**Demo:** Query "Yukos arbitration award" → italaw MCP called → cited result with italaw.com URL.

**Tests:**
- Unit: `ItalawScraper` parses 5 recorded HTML pages, inserts into SQLite
- Integration: `ItalawMcpServer.search()` returns correct results against fixture DB
- Integration: full chat round-trip with fixture DB; citation stored

**Acceptance criteria:**
- Scraper parses italaw case list and case pages correctly
- FTS5 search returns relevant results
- Citation links to `italaw.org/cases/{id}`
- `npm run scrape:italaw` completes without error on fixture data

**Estimated days:** 2

**Depends on:** Chunk 14

**Risks:** italaw HTML structure changes break selectors — pin CSS selectors and add a CI smoke test that fetches one known live page and checks selector stability. Alert via `freshness_log.status="error"`.

---

### Chunk 16: ICSID Portable DB
**Goal:** ICSID investment arbitration awards are searchable via the portable DB MCP server.

**Scope:**
- `IcsidScraper extends BaseScraper`: fetches ICSID case list, handles three URL patterns (award / decision on jurisdiction / annulment), PDF text extraction
- `IcsidMcpServer extends PortableMcpServer`
- Add ICSID to `mcp_servers` seed
- `npm run scrape:icsid` script
- Test fixtures: 5 recorded HTML pages + fixture SQLite DB

**Out of scope:** Caching.

**Demo:** Query "ICSID cases involving energy disputes" → ICSID MCP called → cited result with icsid.worldbank.org URL.

**Tests:**
- Unit: `IcsidScraper` correctly handles all three ICSID page types (one fixture each)
- Integration: search + retrieve against fixture DB
- Integration: full chat round-trip; citation stored

**Acceptance criteria:**
- Scraper handles all three ICSID page patterns
- Citation URL is a valid icsid.worldbank.org URL
- `npm run scrape:icsid` completes on fixture data

**Estimated days:** 2

**Depends on:** Chunk 14

**Risks:** ICSID case page structure may differ between case types — test all three in fixture set.

---

### Chunk 17: Caching Layer
**Goal:** MCP query results are cached to reduce external API calls and latency on repeated queries.

**Scope:**
- `cache_results` table migration (schema per Section 3)
- `CacheManager` in `backend/src/lib/mcp/cache.ts`: `get(source, query)`, `set(source, query, result, ttl)`, `cleanup()` (delete expired rows)
- Cache lookup before `McpClientManager.callTool()` in the dispatch path
- Cache write after successful MCP response
- TTL config: stable sources (al-meezan, italaw, icsid) = 86400s; live (courtlistener, eurlex, govinfo) = 3600s
- `cache_hit` field added to `mcp_tool_call_start` SSE event
- `cleanup()` called on Express startup

**Out of scope:** Cache invalidation UI, telemetry dashboard.

**Demo:** Same query sent twice → second call returns faster; DevTools shows `cache_hit: true` in SSE event.

**Tests:**
- Unit: `CacheManager.get()` returns null on miss, correct result on hit
- Unit: TTL respected (Vitest fake timers via `vi.useFakeTimers()`)
- Unit: `cleanup()` deletes only expired rows
- Integration: second identical query does not call MCP server (call count assertion via mock)

**Acceptance criteria:**
- Cache hit on identical query within TTL
- MCP server not called on cache hit
- Expired rows pruned on startup
- `cache_hit` field correct in SSE event

**Estimated days:** 2

**Depends on:** Chunk 3

**Risks:** SHA-256 hash must normalize whitespace and case to avoid false misses on equivalent queries — test normalization explicitly.

---

### Chunk 18: Error Handling — Circuit Breakers + Retries
**Goal:** MCP source failures are handled gracefully with no user-facing crash.

**Scope:**
- `CircuitBreaker` class in `backend/src/lib/mcp/circuitBreaker.ts`
  - States: `closed` → `open` → `half-open`
  - Opens after 3 consecutive failures within 60s
  - Auto-reset to half-open after 5 min; success → closed, failure → open
- Retry wrapper: 2 attempts, exponential backoff (500ms, 1000ms)
- `McpClientManager` wraps each `callTool()` with retry + circuit breaker
- SSE event `source_unavailable: { source, message }` when circuit open
- System prompt updated dynamically when sources are unavailable

**Out of scope:** Telemetry logging (Chunk 19).

**Demo:** Kill CourtListener MCP child process → next query uses remaining sources → UI shows "CourtListener temporarily unavailable" toast.

**Tests:**
- Unit: `CircuitBreaker` state machine (closed→open→half-open→closed)
- Unit: retry wrapper attempts exactly 2 times before failing
- Unit: open circuit returns error immediately without calling MCP
- Integration: mock server fails 3 times → circuit opens

**Acceptance criteria:**
- Circuit opens after 3 failures, recovers after 5 min
- `source_unavailable` SSE event emitted when circuit open
- Partial results returned (no total failure when one source is down)

**Estimated days:** 1

**Depends on:** Chunk 3

**Risks:** Circuit state is in-process memory — resets on server restart. Acceptable for v1.

---

### Chunk 19: Telemetry and Per-Source Dashboard
**Goal:** Operators can see per-source success rates, latency, and cache hit rates.

**Scope:**
- `mcp_events` table migration (schema per Section 3)
- Log one row per MCP tool call in `McpClientManager` (after call completes)
- Backend route `GET /admin/mcp-telemetry` — returns per-source aggregates: total calls, success rate (%), avg latency (ms), cache hit rate (%), last 24h error count
- Simple frontend page `/admin/mcp-telemetry`: table of source stats, auto-refreshes every 60s
- Auth: available to all authenticated users (no separate admin role for v1)

**Out of scope:** Alerting, Grafana, per-user breakdown.

**Demo:** Admin visits `/admin/mcp-telemetry` → sees table with per-source health metrics from real queries.

**Tests:**
- Unit: telemetry row logged correctly per MCP call (success and failure)
- API: `GET /admin/mcp-telemetry` returns correct aggregated stats
- Component: telemetry table renders with data

**Acceptance criteria:**
- One telemetry row per MCP tool call
- Dashboard shows success rate, avg latency, cache hit rate per source
- Page accessible to authenticated users

**Estimated days:** 2

**Depends on:** Chunk 18

**Risks:** `mcp_events` will grow quickly — add a cleanup job (delete rows > 30 days) in v1.5.

---

### Chunk 20: Citation Verification
**Goal:** A verification check confirms that a cited URL contains the claimed excerpt, with a status badge on the citation card.

**Scope:**
- `CitationVerifier` service in `backend/src/lib/mcp/citationVerifier.ts`
  - Fetch source URL (10s timeout, plain `fetch`)
  - Normalize and check: does `excerpt` text appear in fetched content?
  - Returns: `verified` | `unverified` | `unavailable` (fetch failed/timeout)
- `citations.verification_status` column (already in schema from Chunk 4 migration)
- Backend route `POST /citations/:id/verify` — triggers verification, updates DB, returns status
- Frontend: verification badge on `CitationCard` (✓ teal / ⚠ amber / ? grey)
- "Verify" button on citation card triggers the route
- Auto-verify on citation creation for portable DB sources (synchronous, no fetch needed)

**Out of scope:** Hallucination council (Feature 2 of roadmap), bulk verification.

**Demo:** User clicks "Verify" on a CourtListener citation card → badge updates to "Verified ✓" or "Couldn't verify ⚠".

**Tests:**
- Unit: `CitationVerifier` with recorded HTTP response → `verified` when excerpt found, `unverified` when not found
- Unit: 10s timeout → `unavailable`
- API: `POST /citations/:id/verify` updates `verification_status` in DB
- Component: badge renders correct variant for each status value

**Acceptance criteria:**
- Badge renders for all status values (`pending`, `verified`, `unverified`, `unavailable`)
- Verify API updates DB row
- Timeout handled gracefully (badge shows `unavailable`, no crash)

**Estimated days:** 2

**Depends on:** Chunk 5

**Risks:** Some source URLs require JavaScript rendering — `fetch()` won't work. For v1, mark these `unavailable` and document the limitation.

---

## 6. Milestone Roadmap

### Milestone 1: Plumbing (Weeks 1–2)
**Chunks:** 1, 2, 3, 4, 5, 6, 7
**Theme:** Everything works with a fake source. No real API calls required to demo.
**Demo:** Fake MCP tool returns cited results; citation cards render in chat; source picker popover shows correct regions, flags, and state badges.
**Work:** ~10 engineering days

### Milestone 2: First Real Source (Week 3)
**Chunks:** 8, 9, 10
**Theme:** Real legal data in the product; scope control working.
**Demo:** Lawyer asks a US case-law question, gets cited CourtListener results with clickable CL URLs; scope toggle lets them limit search to CourtListener only.
**Work:** ~5 engineering days

### Milestone 3: Breadth (Weeks 4–5)
**Chunks:** 11, 12, 13
**Theme:** Multi-region, multi-language research; Gulf coverage live.
**Demo:** Source picker shows 4+ connected sources across US, EU, and Gulf; Arabic Al-Meezan provision renders RTL; CJEU case cited from EUR-Lex.
**Work:** ~3 engineering days (parallelizable)

### Milestone 4: Portable DB Pattern (Weeks 5–6)
**Chunks:** 14, 15, 16
**Theme:** Investment arbitration awards retrievable; portable DB pattern validated for future sources.
**Demo:** Query "Yukos arbitration" returns cited italaw result; ICSID case list searchable; `npm run scrape:italaw` documented in README.
**Work:** ~6 engineering days

### Milestone 5: Hardening (Weeks 7–8)
**Chunks:** 17, 18, 19, 20
**Theme:** Production-ready reliability and observability.
**Demo:** Ops dashboard shows per-source health; CourtListener gracefully degrades when killed; citation verification badge on every citation card.
**Work:** ~7 engineering days

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

### Citation Verification Testing
Deterministic: fixture HTML pages with known excerpt text (→ `verified`) and pages without (→ `unverified`). Sampling audit (separate script, not in CI): monthly, fetches 10 random recent citations and checks live URLs — alerts on failures but does not block merges.

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
| Auth credential leakage via logs or error messages | Low | High | Never log raw API key values. Explicit filter in Express error handler. `api_key` field excluded from all SSE events. Audit all `console.log` calls in MCP path before launch. |
| Portable DB scrape blocking — italaw/ICSID HTML changes break parser | Medium | High | Pin CSS selectors. CI smoke test fetches one known live page per scraper and checks selector stability. Alert via `freshness_log.status="error"` visible in telemetry dashboard. |
| Legal exposure for portable DB scraping (CanLII-style ToS litigation) | Low | High | italaw: no explicit ToS against bulk access; conservative approach (excerpts only, attribution, respect robots.txt). ICSID: World Bank public data, same approach. Never build portable DB for CanLII without official API key and legal sign-off. Document posture clearly in README. |
| LLM context overflow when MCP returns too much | Medium | Medium | Hard 4,000-token cap per result (Chunk 3). Router limits to ≤3 sources per turn (Chunk 9). Total MCP context addition: max ~12,000 tokens — well within Claude Sonnet's 200k context. |
| Citation hallucination — LLM cites MCP source but invents the content | Medium | High | System prompt: explicit citation rules (cite verbatim from tool result, include source_id and URL). Excerpt stored at retrieval time, not generated by LLM. Citation verification (Chunk 20) surfaces discrepancies to users. |
| User confusion about which sources are connected vs. recommended | Low | Medium | Source picker state badges are unambiguous: "Connected" (teal) vs. "Connect" (grey). "Always on" for internal documents. Count in pill always accurate. No sources silently active. |

---

## 9. Open Questions

1. **GovInfo MCP npm package name.** The GPO MCP server is "in public preview" — what is the exact npm package name and is it published? This unblocks Chunk 11 only after the package ships. Fallback: build a thin wrapper around the api.data.gov REST API.

2. **Al-Meezan npm package name.** What is the exact package name for the Ansvar Systems Al-Meezan server?

3. **Al-Meezan DB distribution.** Does the Ansvar Systems package ship with a pre-built SQLite DB, or does it require running a build script first? This affects self-hosted setup complexity and README instructions significantly.

4. **EUR-Lex: one package or two?** The roadmap mentions both `scimorph/eur-lex-mcp` (live SOAP) and `Ansvar-Systems/Comprehensive-EU-Law-MCP` (SQLite-backed). This spec recommends scimorph for v1 (live search breadth). If Ansvar's package covers more regulation, evaluate adding it in v1.5.

5. **Existing `MikeCitationAnnotation` type.** The frontend already has this type in `shared/types.ts` and existing citation rendering logic. Review before Chunk 5 to determine if `CitationCard` should extend or replace it — avoid two competing citation types.

6. **Admin access for telemetry dashboard.** For v1, the dashboard is available to all authenticated users. Confirm whether a per-user admin flag should be added to `user_profiles` before Chunk 19, or if open-to-all is acceptable.

---

## 10. Appendix: Proof-of-Concept Task

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
  clientManager.ts         # McpClientManager singleton
  router.ts                # mcpRouter() heuristic function
  cache.ts                 # CacheManager
  circuitBreaker.ts        # CircuitBreaker
  citationVerifier.ts      # CitationVerifier
  types.ts                 # Citation, McpToolDef, McpServer, etc.
  portable/
    baseScraper.ts
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
  courtlistener/            # msw HTTP cassettes
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
  CitationCard.tsx
  SourcePickerPopover.tsx
  SourcesPill.tsx
frontend/src/app/(pages)/admin/
  mcp-telemetry/
    page.tsx
```
