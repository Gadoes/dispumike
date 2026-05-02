# MCP Integration Spec — Principal Engineer Review

*Reviewing: `docs/mcp-integration-spec.md` v1*
*Reviewer: Principal engineer*
*Date: 2026-05-01*
*Status: Approved with required revisions — produce v2 before starting implementation*

---

## Summary

The spec is competent and follows the prompt structure faithfully. Per-database playbooks have real schema samples, the test strategy is honest (msw, in-process mock MCP, fake timers — these are the right patterns), the locked-decisions section is good engineering hygiene, and the POC task in Appendix targets the genuinely riskiest assumption.

That said, five issues block implementation, four significant concerns should be addressed in the v2 revision, and a handful of optimizations would take this from "ships" to "ships well." Two open items have been resolved by product (see end of doc) — incorporate those decisions in v2.

---

## 1. Critical issues — must be resolved in v2 before any code is written

### 1.1 Remove the heuristic router (Chunk 9). Source selection is user-driven via UI.

**Decision (closed):** Chunk 9 is deleted entirely. The user scopes their query by checking sources in the source picker popover (the mechanism already specified in Chunk 8). Default state when the user hasn't actively scoped is "all connected sources active," and the LLM picks from that set via standard tool selection.

**Why the v1 design fails:**
- Keyword/jurisdiction heuristics break on every realistic query that doesn't name the jurisdiction explicitly. "FIDIC time-bar authority" should hit italaw + ICSID + BAILII; the heuristics catch none of that. "Construction arbitration in the GCC" needs Al-Meezan + italaw + Saudi MoJ + BAILII; keywords match nothing.
- The router runs on the user message alone, before chat history. A follow-up like "and what about Qatari law?" loses all prior context.
- The 90% accuracy criterion (18/20 hand-crafted tests) gives false confidence. The test set has selection bias toward queries the heuristics handle, and 10% miss rate in production means one in ten queries silently fails.
- Most fundamentally: the router decides which tools to expose *before* the LLM sees the question. The LLM is the smartest thing in the system; making heuristic decisions before it gets to think is the wrong layering.

**Why user-driven UI selection is better than "expose everything to the LLM":**
- LLMs picking from 6 sources will sometimes pick wrong. Lawyers picking 1-2 via UI eliminates that error class.
- More legible: the lawyer sees exactly which sources will be queried before submitting.
- Converges two mechanisms (router + per-query scope) into one. Two things doing the same job is one too many.

**Required spec changes:**
- Delete Chunk 9 entirely.
- Update Chunk 8 to make per-query scope the canonical mechanism for source selection, with persistence options: per-message (default) or per-thread (sticky toggle).
- Update Section 2.2 (Tool Registration) to remove router language. Document the actual flow: connected-and-active sources determine the tool list passed to the LLM each turn. The LLM picks from that set.
- Update the dependency graph: chunks that previously depended on Chunk 9 now depend on Chunk 8.
- Update calendar estimate (frees ~2 days from Milestone 2).

### 1.2 Encrypt API keys at rest. Plaintext in `mcp_connections.api_key` is a launch-stopper.

This fork is being launched publicly on LinkedIn, targeted at law firms, with the explicit positioning that it handles confidential research. The first technically curious lawyer or procurement reviewer who looks at the schema will find plaintext credentials in a database column read by Express handlers. That ends conversations.

**Required spec changes:**
- Section 2.6 must specify encryption at rest for `mcp_connections.api_key`. Use Supabase Vault (recommended for native integration) or AES-256-GCM with a server-side master key from env. Storing the encrypted value plus a version tag for rotation is fine.
- Add an explicit "credentials never appear in logs, error messages, or SSE events" requirement with an audit checklist before launch (search for `console.log` in the MCP path).
- Add a chunk (or extend Chunk 6) covering the encryption layer and migration of any existing plaintext keys (if any).
- Document the key rotation path in v2 even if rotation isn't shipped in v1 — at least the architecture supports it.

This is not a v1/v2 question. Plaintext credentials for third-party API keys is unacceptable at launch.

### 1.3 Reframe Chunk 20 as URL liveness, not verification. Real verification belongs to Feature 2.

**Decision (closed):** v1 ships Option A — URL liveness check + side-by-side viewer. Full claim-by-claim verification is explicitly the domain of Feature 2 (hallucination council) and should be referenced as such in the spec.

**Why v1 verification as specified fails:**
- Plain `fetch()` doesn't render JS. Most modern legal sites do. The fallback ("mark as unavailable") makes the badge meaningless on the modal case.
- String-matching the excerpt against fetched HTML is brittle: HTML formatting differs from text excerpts, whitespace and line breaks don't match, character encoding for Arabic is fragile, and short excerpts like "the contract is binding" will false-positive against thousands of unrelated pages.
- A green ✓ badge implies legal-grade verification when all we've checked is text presence. This is worse than no badge — it sets a false expectation that will be discovered on launch and damage trust specifically with the audience we're targeting.

**Required spec changes:**
- Rename Chunk 20 to "Citation URL liveness + side-by-side viewer."
- Scope: a "Verify and read" button on the citation card opens a side panel with the source URL rendered in an iframe (or new tab), alongside the citation excerpt. The lawyer reads both and decides. No automated text matching, no green/red checkmark.
- Add a "Verifying URL is reachable" liveness check (HEAD request, 5s timeout) that fails the citation gracefully if the URL is dead. This is the only "automated check" the v1 ships.
- Add a forward reference: "Full claim-level verification is handled by the hallucination council (Feature 2 of the roadmap), which decomposes assistant answers into atomic claims and runs a multi-agent council per claim. Chunk 20 deliberately stops at URL liveness; do not introduce text-matching logic that competes with the council."
- Remove `verification_status text not null default 'pending'` from the citations schema. Replace with `liveness_status text` (`unchecked` | `live` | `unreachable`). The `verified` and `unverified` states are reserved for the council's claim-level verdicts.
- Update tests: liveness tests are simple (URL reachable / not). Drop the false-positive matching tests.

### 1.4 Gate the telemetry dashboard behind admin role. Don't ship per-user-readable telemetry.

Open Question 6 ("Admin access for telemetry dashboard — confirm if open-to-all is acceptable") should be closed as **not acceptable**. The dashboard exposes per-source query patterns. For a legal product where research patterns are themselves sensitive (case strategy, client matters), letting any authenticated user see how often other users hit Al-Meezan or CourtListener is a leak.

**Required spec changes:**
- Add `is_admin boolean not null default false` to `user_profiles` (or use existing role mechanism if one exists in the codebase report).
- Gate `GET /admin/mcp-telemetry` behind `is_admin` check in the route handler.
- Frontend: route requires admin flag, shows 404 to non-admins.
- Add to Section 8 (risk register): "Per-user research pattern leakage if telemetry is mis-scoped — mitigated by admin-gated dashboard."
- Update Chunk 19 acceptance criteria: "Non-admin users receive 404 from telemetry route" and "telemetry table never accessible from frontend without admin flag."

### 1.5 Switch to lazy-spawn semantics for MCP child processes. Eager spawn at boot is too costly.

Current design (Section 2.1, "all connected MCP servers initialized at Express boot") has three problems at any non-trivial scale:

- Each MCP server is a long-running Node process holding memory. With 6 sources × ~50-150MB Node footprint = ~300-900MB just for MCP children, on top of Express. Self-hosted deployments on small VPS will feel this.
- Stdio is sequential — one child process serves one tool call at a time. Under concurrent load (10 users hitting CourtListener simultaneously) requests queue on a single pipe.
- "User has 14 sources connected but only uses 3 regularly" is the common case. We're paying memory cost for the 11 unused.

**Required spec changes:**
- Section 2.1 / Chunk 1: lazy-spawn with idle TTL.
  - First request to a source: spawn (~500ms cold), serve, mark warm.
  - Subsequent requests within idle TTL (recommend 15 min): served warm.
  - After idle TTL expires: dispose, free memory.
  - Crash detection: mark stopped, lazy respawn on next request.
- For concurrency: per-server request queue with explicit max depth (recommend 10) and user-facing "queue depth N" or "throttled" status when full. Optional v1.5: process pool of 2-3 children per source.
- Update Chunk 1 tests: spawn timing (cold start within 1s), idle disposal (after TTL), warm reuse, queue behavior under concurrent calls.

The 500ms cold-start tax is cheaper than the always-on memory cost.

---

## 2. Significant concerns — must be addressed in v2

### 2.1 Per-query scope reset (Chunk 8) is a UX footgun.

Lawyer disables Al-Meezan for one query about US law, asks a follow-up "and how does this compare to Qatar?" — Al-Meezan is silently re-enabled and they get an answer they didn't expect. This will confuse users, and confused users don't trust the source picker.

**Required spec changes:** offer two persistence modes in Chunk 8:
- **Per-message (default):** scope resets after send.
- **Sticky for thread:** scope persists until the user clears it. Surface as a small "Scope: 2 sources for this thread" indicator near the chat input. Clear button resets to user's persistent connection settings.

The lawyer chooses persistence mode at the moment of scoping. Default to sticky-for-thread when the user actively narrows scope; default to per-message when the user clicks "ask all sources" explicitly.

### 2.2 Scraper estimates (Chunks 15, 16) are 2-3x optimistic.

italaw has roughly a thousand case pages, many with PDF awards. ICSID has hundreds across three URL patterns. PDF text extraction with `pdfjs-dist` on legal awards is finicky (multi-column layouts, headers, footnotes, scanned pages). The first scrape will take hours. The first scraper version will fail mid-run. PDF parsing edge cases will break the schema.

**Required spec changes:**
- Estimate italaw scraper at 4 days, ICSID at 4 days. (Not 2 each.)
- Add scrape resumability to Chunk 14 (BaseScraper):
  - Checkpoint last-successful URL in `freshness_log`
  - Resume from checkpoint on next run
  - Idempotent inserts via `ON CONFLICT(url) DO NOTHING`
  - Idempotent re-parse via `indexed_at` timestamp comparison
- Add concrete first-scrape duration estimate to Chunks 15/16 (expect hours, document for self-hosted README).
- Add a "graceful degradation" rule: if scrape fails, the MCP server keeps serving stale data with a freshness warning rather than failing.

### 2.3 Cache key normalization is undefined (Chunk 17, Section 2.5).

"SHA-256(source + normalized query)" — but the spec doesn't define normalization. "FIDIC time-bar" / "FIDIC time bar" / "fidic timebar" produce different hashes under naive hashing. Result: low cache hit rate that defeats the cache's purpose.

**Required spec changes:**
- Specify the normalization function explicitly: lowercase, collapse whitespace, strip leading/trailing punctuation. Document this in code with a comment block.
- Add tests for equivalent-query cache hits across capitalization, whitespace, and punctuation variations.
- Open question to surface: should we also normalize stop words ("the", "a", "and")? Recommend no for v1 — legal phrasing matters and "claim under FIDIC" ≠ "FIDIC claim" semantically.

### 2.4 Telemetry table omits query-level data.

Without a `query_hash` (or query text) in `mcp_events`, you can see "60% of CourtListener calls succeed" but not "constitutional law queries fail at 90%, contract law queries succeed at 95%." That's the diagnostic granularity that drives improvement.

**Required spec changes:**
- Add `query_hash text` field to `mcp_events` schema.
- Optional: add `query_text text` with a 30-day retention policy (cleanup job), gated by privacy review.
- Add a chunk (or extend Chunk 19) for the telemetry retention/cleanup job: delete `mcp_events` rows >30 days, run nightly.

---

## 3. Optimizations — incorporate at engineer's discretion, justify in spec if skipped

### 3.1 Truncation strategy (Section 2.3) puts cognitive burden on the lawyer.

Current: 4,000 token cap, message says "Narrow your query for more detail." For legal research, the lawyer needs to *know* that case 21 exists and might be relevant — not have it silently dropped.

**Suggested change:** Two-tier truncation. Keep the full result list (titles + URLs + 1-line excerpt per result) in context — these are cheap. Aggressively truncate or omit the long excerpts beyond the first 5-10 results. The lawyer sees "30 results found" and the top 5 in detail, with the rest as scannable headers they can drill into via a follow-up query or by clicking the citation.

### 3.2 CitationCard should support compact list view.

A research query returning 10 cases produces 10 large stacked cards. Compact list (one line per citation: source flag + title + jurisdiction + year), expand-on-click for the excerpt, models the lawyer's natural workflow of scanning then drilling in.

### 3.3 FreshnessManager scheduling is unspecified (Chunk 14).

Who triggers freshness checks? Express startup? Cron? A worker? For self-hosted, "scrape on startup" means cold starts take an hour the first time. For production-shape deployments, you want a scheduled worker that runs nightly while users sleep.

**Suggested change:** Document the recommended deployment pattern (a scheduled worker via cron / system timer / a deployment platform's native scheduler), with a fallback "trigger on first request if last_scraped_at is null and DB is empty" for first-run setup.

### 3.4 Test fixture maintenance ownership is unspecified.

"Recorded once against real APIs" — by whom, when, refreshed how? In 6 months, fixtures will diverge from real API responses and no one will know.

**Suggested change:**
- Each fixture has a refresh script: `npm run refresh-fixtures:courtlistener`.
- Each fixture file includes a `recorded_at` timestamp in metadata.
- CI emits a warning when fixtures are >90 days old (does not block merges).
- Add to the README: "Fixture refresh ownership and cadence."

### 3.5 Multilingual handling needs Arabic tokenization detail (Section 2.9).

"FTS5 handles Unicode natively" is technically true but misleading. SQLite FTS5 default tokenizer doesn't handle Arabic morphology — searching "العقد" (contract) won't match "العقود" (contracts).

**Suggested change:** Use the `unicode61` tokenizer with Arabic-aware settings, or apply a stemming pass at index time. The Al-Meezan MCP from Ansvar Systems likely already handles this — confirm and add a test that searches for a known Arabic stem and matches its plural.

### 3.6 Citation deduplication is missing.

A user asking three queries about Yukos will get three separate `citations` rows for the same italaw case, and the UI will show three duplicate cards.

**Suggested change:** Either a `(user_id, source_type, source_id)` uniqueness constraint with `ON CONFLICT DO UPDATE retrieved_at = NOW()`, or de-dupe at render time, or accept duplicates and visually group them.

### 3.7 Circuit breaker reset of 5 minutes is too long (Section 2.7).

A transient 503 shouldn't lock a source out for 5 minutes of "unavailable" warnings.

**Suggested change:** 60 seconds half-open with one probe; on probe failure, exponential backoff up to a 5-minute cap. Static 5-minute is too punitive for transient failures.

### 3.8 The 🌐 Multi glyph is ambiguous.

italaw, ICSID, EUR-Lex, and UNCITRAL all get 🌐 but mean different things (global investment arbitration vs EU-27 vs UN model laws).

**Suggested change:** Thematic indicators — "ARB" for arbitration sources, "EU·27" for EUR-Lex, "UN" for UNCITRAL. Less ambiguous than a globe. Apply in `mcp_servers.flag_emoji` (rename column to `region_glyph` or similar) and in the source picker UI.

---

## 4. Smaller nits — engineer's discretion

- **Chunk 11 (GovInfo) at 1 day is optimistic.** Package is in public preview, name is unknown. Estimate 2 days.
- **Citation cascade.** Schema has `chat_message_id ... on delete set null`. For v1, cascade delete is probably right (citation has no meaning without its message). Confirm.
- **Section 2.7 "system prompt updated dynamically" is hand-wavy.** Specify the prompt diff: when source X's circuit opens, what tokens are added/removed? Without spec, the LLM will keep trying to call unavailable sources.
- **Project name in title says "Dispumike."** Confirm or rename.
- **Chunk 1 reconnect is `max 3 attempts, exponential backoff`.** What happens after 3? Permanent failure? Manual intervention? Document the recovery path.

---

## 5. Resolved open questions (product decisions, not engineering)

These were open questions in v1; v2 should treat them as locked.

| Question | Resolution |
|---|---|
| Router (heuristic vs LLM-driven vs user-driven) | **User-driven via UI scope picker.** Heuristic router (Chunk 9) deleted. LLM picks from the user's active source set. |
| Citation verification scope | **v1 ships URL liveness + side-by-side viewer (Option A).** Full claim-level verification is Feature 2 (hallucination council) and explicitly out of scope for the MCP integration spec. |
| Telemetry dashboard access | **Admin-only, gated on `user_profiles.is_admin` flag.** |
| API key storage | **Encrypted at rest** via Supabase Vault or AES-256-GCM with server-side master key. Plaintext is not acceptable. |

---

## 6. Verdict

**Approved with required revisions.** Produce a v2 spec at `docs/mcp-integration-spec.md` incorporating every "required spec change" noted in Sections 1 and 2 above, plus the resolved decisions from Section 5. Optimizations in Section 3 are at the engineer's discretion but should be addressed in the spec (either incorporated or explicitly skipped with reasoning).

Add a changelog at the top of v2 listing the substantive changes from v1.

Run the POC (Appendix in v1) immediately — that work is unaffected by anything above and de-risks the core architectural assumption regardless of how the spec evolves.

Do not start implementation work on any chunk other than the POC until v2 is reviewed and approved.

---

## 7. Estimated impact on calendar

- Chunk 9 deletion: **-2 days** (frees Milestone 2)
- Encryption layer additions: **+1 day** (extends Milestone 1 or absorbed into Chunk 6)
- Chunk 20 simplified to liveness/viewer: **-1 day** (drops complexity)
- Lazy-spawn semantics (Chunk 1): **+1 day** (more thorough testing)
- Scraper realism (Chunks 15, 16): **+4 days** combined (4 days each instead of 2)
- Per-query scope persistence modes (Chunk 8): **+0.5 days**
- Cache normalization (Chunk 17): **+0.5 days**

Net calendar impact: **+4 days** vs v1 estimate. New total: ~9 weeks (was 8). Reasonable given the scope clarification.
