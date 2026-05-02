# Disputes-Focused Fork — Strategy, Roadmap, and Implementation Plan

*Working document, draft 2 — incorporates MCP database research and on-demand council architecture*

## 1. Strategic context

A solo developer open-sourced an app (mikeoss.com) that replicates the core feature surface of Harvey and Legora. It has gone viral on LinkedIn over the last 24 hours. This creates a short, asymmetric window: building on top of the wave gives free distribution, free attention, and a way to validate disputes-specific features against real lawyer demand without committing Kallam's roadmap to anything.

The play has three layers:

1. **Audience** — fork the repo, add disputes-specific features that no general legal AI tool has, post the result on LinkedIn and X riding the existing thread momentum.
2. **Validation** — capture interest signal via a structured waitlist (which feature do you want most?). The waitlist is the experiment; LinkedIn reactions are signal but selection-on-feature is hard data.
3. **Funnel** — features that validate well become Kallam roadmap items. Features that don't get traction stay on the fork or get dropped. The fork is a controlled validation environment, not a competing product.

The fork stays positioned as an exploration/community project. Kallam stays positioned as the production product. Two-feature launch (legal research + hallucination council) maps to the two universal lawyer concerns: *can I find what I need* and *can I trust what comes back*.

**Gulf is now an explicit positioning advantage.** Qatar's Al-Meezan portal has a production-ready MCP server (Ansvar Systems, SQLite + FTS5, 71,155 provisions, daily freshness). Including it in v1 lets us claim Gulf-disputes capability that no general legal AI tool has — and it directly serves Kallam's validated ICP (construction and energy arbitration in the Gulf).

## 2. What disputes lawyers actually need

This list combines what was identified in initial discovery with arbitration-specific additions. Each item is annotated with *viral potential* (will lawyers share it?), *moat strength* (does any general legal AI tool already do this well?), and *Kallam fit* (does this become a Kallam feature if validated?).

### Already on the original list

| Feature | Viral | Moat | Kallam fit |
|---|---|---|---|
| Legal research + document analysis in same place | Medium | Low (Jus Mundi, Harvey) | High |
| Quick verifiability (every claim → source) | High | Medium | High |
| Hallucination control (multi-agent council) | High | High | High |
| Deliverable verification (own claims grounded in corpus) | High | High | High |
| Production-request flagging (opposing claims with no doc support) | Very high | Very high | High |
| Cite verification (cites point to right doc, content matches) | High | Medium | High |
| Claim worldview (supporting vs refuting docs in corpus) | Very high | High | High |
| Skills/plugins (firm handbook adaptability) | Low | Low | Medium |
| Fact map builder | Medium | Medium | High |

### Additions, ranked by *viral potential × arbitration specificity*

**Tier 1 — disputes-specific, high LinkedIn appeal**

- **Redfern Schedule generator and manager.** This is the single highest-leverage addition. The Redfern Schedule is the standardized document for international arbitration document production (Request | Description of Documents | Relevance & Materiality | Response | Tribunal Decision). No general legal AI tool builds Redfern Schedules natively. Drafting requests from case theory, suggesting responses, tracking tribunal rulings — this is "where has this been all my career" material. Tease this as "coming next" in the launch sequence.
- **Cross-examination preparation packages.** Witness statement plus document corpus → contradictions, prior inconsistent statements, gaps. Counsel currently does this manually with associates over weekends.
- **Procedural calendar from POs.** Ingest Procedural Orders, surface every deadline on a single calendar. Painful, mechanical, universally needed, not done well anywhere.

**Tier 2 — high value, less viral**

- **Authority verification.** Given a citation in your draft, does the case stand for what you claim? Has it been distinguished, overruled, narrowed?
- **Damages tie-out.** Each damages claim must trace to expert reports and source documents.
- **Bilingual handling.** Arabic/English side-by-side for Gulf disputes, especially given Al-Meezan integration.
- **Confidentiality and redaction.** Generate confidentiality-club versions of pleadings.
- **Tribunal/arbitrator profile lookup.** What positions has this arbitrator taken on similar issues? (Jus Connect already does this — differentiation is bringing it into the workspace.)

**Tier 3 — useful but commoditized**

- Exhibit numbering consistency.
- Witness statement first drafting (controversial — many lawyers won't admit they want this).
- Award analysis / weakness spotting on your own draft.

### What to launch with

Two hero features and the waitlist for the rest. The two heroes are:

1. **Legal research via MCP** — every lawyer wants research; integration into the doc workspace plus the Gulf coverage angle is the unique pitch.
2. **Hallucination control council with course-correct and learnings** — on-demand verification that loops corrections back into a firm-specific learnings skill. This is the actual moat.

Plus a soft launch: **Redfern Schedule generator** as a "coming next" teaser. It pre-qualifies the inbound (general lawyers scroll past, arbitration lawyers stop).

## 3. Feature roadmap

### Phase 0 — Foundation (already in fork)
Whatever mikeoss ships: chat over documents, project structure, basic doc viewer, model selection.

### Phase 1 — Disputes MVP (start here, ~2-3 weeks)
1. Legal research via MCP — selectable public databases, cited results, deeplinks back. Six v1 sources including Gulf coverage.
2. Hallucination control council — on-demand verification with course-correct and save-to-learnings. Triggered manually on hover.
3. Waitlist component — capture interest in features 4-N before building them.

### Phase 2 — Verification & deliverable QA (~2 weeks)
4. Cite verification (every cite in a deliverable points to the right doc and reflects content accurately).
5. Deliverable claims map (each claim in your filing → supporting docs in corpus).
6. Production request flagging (opposing party's claims with no doc support → flagged for production request).

### Phase 3 — Arbitration-native workflows (~3-4 weeks)
7. Redfern Schedule generator/manager.
8. Procedural calendar from POs.
9. Cross-examination prep packages.
10. Claim worldview (supporting vs refuting docs).
11. Fact map builder.

### Phase 4 — Customization & polish
12. Bilingual side-by-side handling (Arabic/English).
13. Skills/plugins (firm handbook adaptability beyond learnings).
14. Exhibit numbering engine.
15. Authority verification.

The ordering reflects: validate trust narrative first (1+2), then deliverable QA (highest ROI on lawyer time), then arbitration-native workflows (where the moat is strongest), then long-tail.

## 4. Feature 1 spec — Legal research via MCP

### Architecture
The forked app becomes an **MCP host**: it instantiates MCP clients for each connected database server, exposes their tools to the LLM during inference, and surfaces the results in chat.

### Coverage strategy (revised based on tier classification)

Sources are classified by integration readiness:

- **Tier 1 — MCP Ready.** Production-grade MCP servers exist. Plug in directly.
- **Tier 2 — API exists, build wrapper.** Robust APIs, no MCP server yet. Build wrapper, contribute back.
- **Tier 3 — Public, no API/MCP.** Authoritative sources without programmatic access. Use the **portable database pattern**: scrape into local SQLite + FTS5, daily freshness checks, expose as MCP server.

### v1 cut (six sources)

| Tier | Source | Coverage | Country | Rationale |
|---|---|---|---|---|
| 1 | CourtListener | US case law, dockets, RECAP | 🇺🇸 US | Most mature MCP, semantic search, foundational |
| 1 | GovInfo (GPO) | US Code, federal bills, CFR, Federal Register | 🇺🇸 US | Official MCP in public preview, replaces standalone eCFR |
| 1 | Al-Meezan | Qatari legislation, Court of Cassation | 🇶🇦 QA | **Gulf moat**, SQLite/FTS5 portable DB exemplar |
| 2 | EUR-Lex | EU treaties, regulations, directives, CJEU | 🇪🇺 EU | Multiple community MCPs available |
| 3 | italaw | Investment treaty awards, pleadings | 🌐 Multi | Portable DB pattern, arbitration depth |
| 3 | ICSID | Investment arbitration awards | 🌐 Multi | Portable DB pattern, arbitration depth |

This gives v1 a defensible coverage story: US case law + EU regulation + Gulf legislation + investment arbitration. The Gulf coverage alone differentiates from every general legal AI tool.

### v1.5 (post-launch, fast follows)

- **Saudi MoJ** (Tier 2, REST API) — completes Gulf coverage.
- **Spain BOE** (Tier 2, OpenAPI 3.1.0 + incremental sync) — easiest Tier 2 integration, useful for Latin America-adjacent practice.
- **UNCITRAL CLOUT** (Tier 3) — same portable DB pattern as italaw/ICSID.

### Deferred to v2 (with reason)

- **France PISTE (Légifrance + Judilibre)** — OAuth 2.0, mandatory registration with sandbox/production separation. Heavy lift relative to launch velocity.
- **CanLII** — active litigation (CanLII v. Caseway, 2024-2025) over scraping for AI training. Must use official API key route. Get the key first, get legal sign-off before integration.
- **BAILII** — historically limits bulk access. Reach out, but assume slow.
- **UK Find Case Law** — requires emailing The National Archives webmaster with IP and use case. Not one-click.
- **Italy Normattiva** — async POST-poll-download pattern. Specific implementation work, low ROI for v1 audience.
- **WIPO Lex** — public but no API/MCP. Useful for IP disputes, low priority for arbitration audience.

### Premium databases (out of scope for fork)

**Jus Mundi** is the gold standard for international arbitration and already has agentic AI (Jus AI) with a similar trust narrative. The honest competitive answer for the fork is italaw + ICSID + Al-Meezan; partnering would be the production answer if Kallam moves forward.

Kluwer Arbitration, Westlaw, LexisNexis, Doctrine.fr, Dalloz — all paid, no MCPs.

### UX
A "Sources" pill in the chat input opens a popover with a tree of available databases grouped by region. Each source shows: name, country indicator (flag emoji + ISO code, or 🌐 for multi-jurisdiction), one-line description, and connection state (Connected / Connect / Permission required). Per-query, the user can scope (e.g., "search EU + UK only"). Default state when nothing is configured: internal documents only.

When the assistant returns a result, citations link directly to the source URL on the database — not to a generated paraphrase. This is the trust loop.

### Data flow
1. User question arrives.
2. Router agent decides: internal corpus only, public DB only, or both.
3. For public DB: invoke MCP tool, get results, attach to context.
4. Synthesis agent answers, cites both internal docs (page/paragraph) and external sources (URL).
5. Hallucination council (Feature 2) is available **on demand** via hover button — not in the synchronous response path.

## 5. Feature 2 spec — Hallucination control council (revised: on-demand + learnings)

### Architecture (on-demand, not always-on)

Verification is triggered manually by the lawyer hovering over an assistant answer and clicking "Verify with council". This decision is deliberate: always-on verification adds 10-15 seconds of latency to every answer; on-demand verification taxes only the answers the lawyer cares enough about to verify. The act of triggering is itself a useful signal — it marks the moment the lawyer is about to do something with the answer.

Verification has its own route (e.g., `/projects/[project_id]/verify/[answer_id]`) and its own persistent record. Reports survive even if the underlying corpus changes later.

### Council of reviewers

Each reviewer is a separate subagent with isolated context.

**Reviewer 1 — Factual.** Given the claim and the source, does the source actually support this claim? Returns: supports / partially supports / does not support / contradicts. With explanation citing the specific passage.

**Reviewer 2 — Legal interpretation.** Given the claim, is it consistent with prevailing interpretation in the relevant jurisdiction? Pulls counter-examples and alternative interpretations from public DBs via Feature 1. Returns: consistent / contested / minority view / contradicted by [authority].

**Reviewer 3 — Cross-check (final).** Given Reviewers 1 and 2 reports, identifies residual disagreement, flags claims that need user attention, produces final verdict per claim: confirmed / verify before use / do not use.

Three terminal verdicts only. Resist adding a fourth ("mostly correct", "partially supported"). Three buckets force a clear position.

### Verification report page (the LinkedIn-shareable artifact)

Components, in order:

1. **Original answer panel** at the top — full answer with inline claim annotations. Confirmed claims get a solid teal underline; verify-before-use gets a dashed amber underline; do-not-use gets a solid red underline plus subtle red background tint. Each claim has a numbered marker (1, 2, 3) tying to claim cards below.
2. **Council agent graph** — three reviewer nodes colored by their own verdict (Factual teal, Legal amber, Cross-check inheriting the worst). Click any node for full reviewer report.
3. **Summary stats** — three cards: Confirmed / Verify before use / Do not use, with counts.
4. **Action panel** (prominent, sits between summary and claim breakdown):
   - **Course-correct in chat** (primary, black). Sends report findings back to the assistant and asks for a corrected answer using only verified sources. The conversation continues in chat.
   - **Save corrections to learnings** (secondary). Adds flagged claims as learning entries that the assistant loads on future queries to avoid repeating mistakes.
5. **Per-claim breakdown** — each flagged claim shows reviewer reasoning inline plus a "Save as learning" toggle for granular control.
6. **Learnings preview** — shows the actual learning entries that get saved (`<trigger condition>` → `<correction>`), inline-editable so the lawyer is the final author.
7. **Footer actions** — Re-run council (per-reviewer), Open in chat, Export, Share public link.

### The learnings skill is the actual moat

The council itself is reproducible — anyone can wire up multi-agent verification. **A learning loop where corrections persist into a firm-specific skill that the agent loads on future queries is much harder to copy and far more valuable.** Six months in, the firm has hundreds of learnings and the assistant is materially better at *their* clients, *their* contracts, *their* preferred authorities than a fresh install. That's the lock-in.

### Learnings skill — design decisions

- **Scope: per-firm by default, with per-project override.** Per-user is too narrow to compound; per-project lets case-specific learnings stay scoped.
- **Retrieval: semantic search by trigger condition, loaded as system context only when relevant.** Don't load every learning every turn. Embed each learning's trigger, retrieve top-k for the current query, inject into context.
- **Conflict resolution: curation surface.** When two lawyers save contradicting learnings, an admin can promote one and demote the other. Partners can override associates.
- **Decay: review-after timestamps.** Each learning has a 12-month review reminder. The law changes; old learnings can become wrong.
- **Editability before save.** The council drafts learning entries; the lawyer approves and edits before they persist. This matters for trust — the lawyer is the author of the firm's knowledge.
- **Naming.** "Learnings" is fine for the demo. For Kallam production, A/B-test against *House style*, *Firm doctrine*, *Standing notes*, *Practice memos*. Lawyers respond more naturally to legal-native framing than consultancy-speak.

### Course-correct should preview before sending

Clicking "Course-correct in chat" should open a preview modal showing the system-message-style instruction that will be sent ("The previous answer had these issues: [...]. Please rewrite using only verified sources."). The lawyer can edit the prompt before submitting. Small change, high trust dividend — the lawyer feels like they're operating the system, not the system operating them.

### Public verification reports for the LinkedIn loop

Verification reports have stable URLs and a "Share public link" action. For the launch, publish a sanitized demo verification report at a public URL and link it from the launch post. Each viewer clicks through to a beautiful interactive page rather than a screenshot. Confidentiality toggle defaults to private since arbitration content is normally confidential.

### Subagent isolation

Each reviewer is a separate LLM call with only its own task in context. No agent can be biased by another agent's reasoning. Reviewer 3 is the only agent that sees Reviewers 1 and 2 outputs.

### Performance

On-demand triggering removes the latency-tax problem. Two further mitigations:
- Parallel: Reviewers 1 and 2 run concurrently. Only Reviewer 3 is serial.
- Selective triage: a triage step decides which reviewers fire. Trivial factual claims skip Reviewer 2.
- Re-run is per-reviewer, not whole council. Cheaper, faster, lets the lawyer probe one reviewer's reasoning.

## 6. Waitlist / validation mechanism

### What we capture
- Email
- Firm name + role (Partner / Senior Associate / Associate / Other)
- Practice area (Construction / Energy / Investment / Commercial / Maritime / Other)
- "Which features do you want most?" — multi-select with the full list from Section 2
- Open text: "What's missing from this list?"

### Tooling recommendation
**Tally.** Free, beautiful, multi-step with conditional logic, dashboard for submissions, webhooks to Slack/Notion/Supabase. Time to build the form: ~15 minutes. Time to embed: one iframe.

**Backup**: a custom Supabase-backed React component (see Appendix B) — only if you want to own the data immediately for nurture campaigns.

### Where to place it
1. Persistent banner at the top of the fork: "Tell us what disputes feature to build next →"
2. Inside the LinkedIn launch post: link to a dedicated landing page (e.g., `/feedback` route)
3. Triggered modal after user has interacted with the fork for 30+ seconds

## 7. Distribution plan (LinkedIn / X)

### Launch sequence (over 5-7 days)
- **Day 0** — Repo public, dedicated landing page live with waitlist
- **Day 1** — LinkedIn carousel + X thread: "I forked [mikeoss link]. Here's what disputes lawyers actually need. Built 2 features so far, the rest is waitlist-driven."
- **Day 2** — Demo video: hallucination council walkthrough, focus on the verification page + course-correct + learnings loop
- **Day 3** — Demo video: legal research with public DB picker, cited results. Lead with Gulf coverage as the differentiator.
- **Day 5** — "Coming next" teaser for Redfern Schedule generator
- **Day 7** — Numbers post: how many lawyers signed up, top requested features, what's next

### What not to do
- Don't position the fork as "Kallam Lite". Kallam stays separate.
- Don't gate features behind email. The whole repo is open.
- Don't promise timelines you'll miss.

## Appendix A — Legal MCPs landscape (current state, tier-classified)

### Tier 1 — MCP Ready (plug in directly)

**CourtListener (US)** — `DefendTheDisabled/courtlistener-mcp` is the most feature-complete community implementation: semantic + hybrid search via vector embeddings (CourtListener launched semantic search in November 2025), citation verification, hybrid query. Apify-hosted variant also available. The Free Law Project is building an official MCP at `courtlistener-api-client`. Rate limit: 5,000 requests/hour authenticated. Foundation for US case law.

**GovInfo / GPO (US)** — Official MCP server in public preview from the US Government Publishing Office. Provides US Code, congressional bills, CFR, Federal Register via API Search Service, Link Service, and bulk XML. USLM XML schema available. Requires `api.data.gov` key. Replaces the need for a separate eCFR integration.

**Al-Meezan (Qatar)** — `Ansvar Systems` MCP server. SQLite + FTS5 backed (parses the official Al-Meezan portal into a local DB), 71,155 provisions, daily automated freshness checks. Returns verbatim statute text rather than LLM-generated summaries — critical for legal reliability. **Reference implementation for the portable database pattern.** Provides Qatari legislation, Court of Cassation rulings, advisory opinions.

**EUR-Lex (EU)** — Multiple community MCPs:
- `scimorph/eur-lex-mcp` — wraps the official SOAP webservice, expert search syntax, CELEX retrieval
- `Ansvar-Systems/Comprehensive-EU-Law-MCP` — structured access to 30+ landmark regulations (GDPR, AI Act, DORA, MiCA, etc.) and CJEU cases. SQLite/FTS5 backed.
- Apify-hosted scraper variant
- Recommended for v1: Ansvar Systems for regulation/CJEU lookups, scimorph for live expert search.

### Tier 2 — API exists, build wrapper

**France: PISTE (Légifrance + Judilibre)** — Central intermediation platform managed by AIFE. Both APIs use OAuth 2.0 with sandbox/production environment separation. Mandatory PISTE account registration with 12-character password. Légifrance: codes, laws, regulations. Judilibre: Cour de cassation decisions (no per-query approval needed since June 2022 ToS update). *Heavier setup than other Tier 2 sources — defer to v2.*

**Spain: BOE** — Excellent REST API with OpenAPI 3.1.0, JSON output, ISO 8601 timestamp parameters for incremental sync. Easiest Tier 2 to build.

**Italy: Normattiva** — Asynchronous search API via `dati.normattiva.it`. POST search → poll status → download results pattern. Prevents timeouts on deep historical queries (Italian legislation since 1861).

**UK: Legislation.gov.uk** — RESTful API with stable three-tier URI structure (Identifier / Document / Representation). XML, RDF, Atom. Open Government Licence 3.0. Cleanest UK route. Requires logic for `<ukm:UnappliedEffects>` to alert users to pending amendments.

**UK: Find Case Law** — REST API by The National Archives, but not publicly open by default. Requires emailing webmaster with IP and use case. Slow path.

**US: Federal Register** — REST API, JSON/CSV, well-documented. Lower priority for arbitration audience.

**Canada: CanLII** — REST API requires secret key. **Active litigation (CanLII v. Caseway, 2024-2025)** over scraping for AI training. Must use official API key route. Get the key via CanLII feedback form, get legal sign-off before integration.

**Saudi Arabia: MoJ** — REST API via `Bayanat.ae` portal using Resource GUIDs. Use Resource Information page to identify dataset IDs. Saudi PDPL compliance considerations for data residency.

**UAE: MoJ / DIFC / ADGM** — Some programmatic access, less standardized. Worth investigating for v2 Gulf expansion.

### Tier 3 — Public, no API/MCP (portable database pattern)

**italaw** — Free, public, maintained by Prof. Newcombe. Investment arbitration awards, pleadings, briefs. No API, no bulk download. Highest value-to-effort ratio for arbitration positioning. Apply portable DB pattern.

**ICSID** — Free, public, no API. Investment arbitration awards. Apply portable DB pattern.

**UNCITRAL CLOUT** — Free, no API. Cases on UNCITRAL conventions and model laws. Portable DB pattern.

**WIPO Lex** — Public, no API, no MCP. Global IP laws and treaties. Lower priority for arbitration audience.

**WorldLII / CommonLII / SAFLII / AustLII** — Federated free-access institutes. Existing search facilities, no MCPs. Useful for Commonwealth jurisdictions.

**Caselaw Access Project (Harvard)** — Released ~7 million court decisions into the public domain in March 2024. Now distributed via CourtListener — no separate integration needed.

### Premium databases (out of scope for fork)

**Jus Mundi** — Gold standard for international arbitration. Has its own agentic AI (Jus AI) with verifiable citations. Subscription only. Honest competitive answer for the fork is italaw + ICSID + Al-Meezan; partnering would be the production answer for Kallam.

**Kluwer Arbitration, Westlaw, LexisNexis, Doctrine.fr, Dalloz, vLex, HeinOnline** — paid, no MCPs.

### Compliance and licensing notes

- **Open Government Licence (OGL) 3.0** — predominant in UK and Commonwealth. Allows commercial and non-commercial reuse with attribution.
- **Public Domain (US)** — federal statutes and court opinions generally not subject to copyright. Private aggregators may claim "database rights" over curated versions.
- **Creative Commons / Open Access** — used by WorldLII and similar.
- **CanLII v. Caseway** — leading Canadian litigation. Lesson: "Right to Access" ≠ "Right to Train" or "Right to Redistribute". Always use official API channels and adhere to no-republish rules where they exist.
- **GDPR (EU sources)** — implement data minimization, right of access/erasure, log cross-border transfers outside EEA.
- **PDPL (Saudi Arabia)** — data residency considerations; "Cloud First" preference for government entities.

## Appendix B — Email capture component (Tally embed + Supabase backup)

Drop-in for any page in the Next.js app.

```tsx
// components/WaitlistForm.tsx
export default function WaitlistForm() {
  return (
    <div className="w-full max-w-2xl mx-auto">
      <iframe
        src="https://tally.so/embed/YOUR_FORM_ID?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1"
        loading="lazy"
        width="100%"
        height="500"
        frameBorder="0"
        title="Disputes feature waitlist"
      />
      <script src="https://tally.so/widgets/embed.js" async />
    </div>
  );
}
```

Form structure to build in Tally:
1. Email (required)
2. Firm + role (short text + dropdown)
3. Practice area (single-select)
4. "Which 3 features do you most want?" (multi-select, capped at 3)
5. "Anything missing from this list?" (long text, optional)

Backup Supabase-backed component (if owning the data immediately is required): see prior version of this doc; uses `waitlist` table with `email`, `firm`, `practice_area`, `features_wanted text[]`, `feedback`.

## Appendix C — Technical agent prompt 1: Codebase exploration

> You are a senior engineer joining a project. The repository is a fork of mikeoss (https://github.com/willchen96, https://mikeoss.com/), a Next.js application that replicates the core feature surface of legal-AI tools like Harvey and Legora: chat over uploaded documents, project-based document management, and a workflow system.
>
> Your job is **only** to read the codebase and produce a written report. Do not change any code. Do not propose any features.
>
> Produce the report as a single markdown document at `docs/codebase-overview.md` with these sections, in order:
>
> **1. Stack overview.** Frameworks, libraries, deployment target, primary languages. Note version numbers where they affect compatibility.
>
> **2. Repository map.** Directory tree at the top two levels with one sentence per directory describing its purpose.
>
> **3. Data layer.** Where is data stored, what are the core tables/collections, what auth provider, what RLS or access-control patterns.
>
> **4. Document ingestion path.** Trace what happens from "user uploads a PDF" through to "the document is queryable in chat". File storage, chunking, embedding model, vector store, document-level metadata.
>
> **5. Chat and agent loop.** Trace what happens from "user submits a chat message" through to "response streams back". LLM provider and model, context assembly, tool use handling, streaming, system prompt location.
>
> **6. Workflow system.** What is a "Workflow" in this codebase? How is one defined and executed?
>
> **7. UI architecture.** Component framework, state management, project view structure, chat input component location, project context provider location.
>
> **8. Existing tool / function-call surface.** List every tool the LLM is currently exposed to.
>
> **9. MCP readiness.** MCP client code present? Server code? Where would an MCP host integration naturally slot in? Note specific files and line numbers.
>
> **10. Verification and trust surface.** Existing concept of source citation, claim grounding, or verification?
>
> **11. Open questions.** Things you weren't able to determine — list as questions, not guesses.
>
> Be specific. Reference file paths, function names, and short snippets. Do not pad.

## Appendix D — Technical agent prompt 2: Comprehensive MCP integration spec

> You are a senior engineer working on a fork of mikeoss. We are adding integrated public legal-database research via MCP, with a focus on international arbitration and disputes work.
>
> You have already produced a codebase exploration report at `docs/codebase-overview.md` (or you will read it before starting). You also have access to `docs/disputes-fork-roadmap.md` which contains the strategic context, the validated v1 cut, and the architecture decisions made so far.
>
> ## Your task
>
> Produce a complete implementation specification organized as a sequence of small, independently shippable chunks. Each chunk must be:
>
> - 1–3 days of work for a single engineer
> - Independently deployable (the app still runs after the chunk ships)
> - Independently testable (the chunk includes its own automated tests)
> - Demoable (you can show "after this chunk, X works")
>
> The spec must cover:
>
> - v1 architecture (MCP host pattern, transport, registration, citation, caching, auth)
> - Per-database integration playbook for each of: CourtListener, GovInfo, Al-Meezan, EUR-Lex, italaw, ICSID
> - Cross-cutting capabilities (source picker UX, router/scope, error handling, telemetry)
> - Test strategy at each chunk
> - Milestone organization (3–5 milestones, each with multiple chunks)
>
> ## Required document structure
>
> Output a single markdown document at `docs/mcp-integration-spec.md`, structured exactly as below.
>
> ### 1. Executive summary
> - Total chunks, milestones, estimated calendar weeks
> - What works after each milestone
> - Critical path
>
> ### 2. Architecture decisions
>
> For each, make and justify the choice in 1–3 sentences. Be opinionated; pick one option per decision, don't list options.
>
> 2.1 **MCP host implementation.** Which SDK (Anthropic TS SDK, Vercel AI SDK MCP support, or implement protocol from scratch)? What transport (stdio, SSE, streamable HTTP)? Where do MCP servers run (same process, sidecar, separate service)?
>
> 2.2 **Tool registration with the agent.** Are all MCP tools exposed every turn or selected by a router agent? If router, what's the selection logic?
>
> 2.3 **Context budget for tool results.** How much MCP tool result content goes into LLM context? How are long results chunked or summarized?
>
> 2.4 **Citation data model.** When the LLM cites an MCP result, what's the data shape (URL only, quote + URL, internal storage so the user can re-open)? How does it render in the UI?
>
> 2.5 **Caching strategy.** Per-user, per-query, per-document? TTL by source type? How is invalidation triggered?
>
> 2.6 **Auth and credentials.** Where do API keys for MCPs that need them (CourtListener, GovInfo, CanLII, etc.) live: per-user encrypted, per-workspace, platform-shared? How does the user provide them?
>
> 2.7 **Error handling philosophy.** Circuit breakers per source, retry policy with backoff, user-facing error messages.
>
> 2.8 **Portable database pattern.** For italaw and ICSID (Tier 3 sources without APIs): scraper architecture, SQLite + FTS5 schema, daily freshness check mechanism, MCP server wrapper that exposes the local DB. Reference Ansvar Systems' Al-Meezan implementation.
>
> 2.9 **Multilingual handling.** Arabic for Al-Meezan, multi-language for EUR-Lex (24 official languages). UI language switching, embedding strategy, search across languages.
>
> 2.10 **Privacy and compliance posture.** GDPR for EU sources, PDPL for Saudi sources, data residency, audit logging of cross-border data transfers.
>
> ### 3. Data model
>
> Schema for every new table. For each: columns + types + constraints, indexes, RLS / access patterns, migration ordering.
>
> Required tables (at minimum):
>
> - `mcp_servers` — registry of available servers (name, repo URL, transport, default config)
> - `mcp_connections` — per-user/workspace enabled servers + credentials reference
> - `citations` — every cited source from any tool result (source_type, source_id, url, title, excerpt, retrieved_at)
> - `cache_results` — TTL'd cache of MCP responses (query_hash, source, result_blob, expires_at)
> - `portable_db_italaw`, `portable_db_icsid` — local content tables for portable DB sources
> - `freshness_log` — last-updated tracking for portable DBs
>
> ### 4. Per-database integration playbooks
>
> For each of CourtListener, GovInfo, Al-Meezan, EUR-Lex, italaw, ICSID, produce a playbook with:
>
> - **Server source.** Existing MCP repo URL with specific recommended fork, or "build new — pattern: portable DB"
> - **Transport.** stdio / SSE / streamable HTTP
> - **Auth.** Required keys, where they live, how the user provides them, fallback behavior if missing
> - **Rate limits.** Documented numbers, handling strategy (request queue, user-facing throttle indicator)
> - **Schema.** What the MCP returns (sample JSON), how we normalize into our internal citation schema
> - **Edge cases.** Known issues with this source (e.g., italaw HTML structure changes, Al-Meezan Arabic encoding)
> - **Test fixtures.** What we record/mock for tests (recorded HTTP traffic, mock MCP server responses)
> - **Compliance notes.** Licensing, ToS constraints, attribution requirements
>
> ### 5. Chunk breakdown
>
> Every chunk has the following structure:
>
> - **Chunk N: \<name>**
> - **Goal:** 1 sentence
> - **Scope:** bullet list of what's in
> - **Out of scope:** what's NOT this chunk
> - **Demo:** "after this chunk, the user/dev can ___"
> - **Tests:** explicit list of automated tests added (unit, integration, e2e)
> - **Acceptance criteria:** bullet list, all must pass before merge
> - **Estimated days:** 1–3
> - **Depends on:** which prior chunks must be done first
> - **Risks:** known unknowns
>
> Chunks should cover, at minimum:
>
> - MCP host plumbing (client manager, reconnection, healthcheck)
> - Mock MCP server for tests
> - Tool registration in agent loop
> - Citation data model + storage + rendering component
> - Source connections data model + admin UX
> - Source picker popover UI (with country indicators)
> - Per-query scope toggling
> - Router agent (decides which sources to query)
> - Each individual MCP integration (CourtListener, GovInfo, Al-Meezan, EUR-Lex)
> - Portable DB framework (scraper + SQLite + FTS5 + freshness + MCP wrapper)
> - italaw portable DB
> - ICSID portable DB
> - Caching layer
> - Error handling (circuit breakers, retries, user-facing messages)
> - Telemetry and per-source success-rate dashboard
> - Citation verification (does the cite actually point to the claimed source?)
>
> If a chunk feels bigger than 3 days, split it. If it feels smaller than 1 day, merge it.
>
> ### 6. Milestone roadmap
>
> Group chunks into 3–5 milestones. Each milestone:
>
> - Has a thematic name
> - Ends with a demo-able state (what we can show externally)
> - Maps to a 1–2 week calendar period
> - Lists which chunks are in it
>
> Suggested shape (you may revise):
>
> - **Milestone 1: Plumbing.** MCP host, mock server, citation model, source picker UI scaffolding. Demo: a fake MCP tool returns cited results.
> - **Milestone 2: First real source.** CourtListener integration end-to-end. Demo: lawyer asks a US case-law question and gets cited results from CourtListener.
> - **Milestone 3: Breadth.** GovInfo + Al-Meezan + EUR-Lex. Demo: source picker with multiple regions, scope-by-source per query, Gulf law working.
> - **Milestone 4: Portable DB pattern.** italaw + ICSID via the portable DB framework. Demo: investment arbitration awards retrievable.
> - **Milestone 5: Hardening.** Caching, telemetry, error handling, citation verification. Demo: ops dashboard, graceful degradation when a source is down.
>
> ### 7. Testing strategy
>
> - Unit test framework, conventions
> - Integration test framework
> - How we mock MCP servers (recorded fixtures? in-memory mock server? Both?)
> - How we test rate-limiting without burning real quota (recorded fixtures, fake clocks)
> - How we verify citations point to real documents (sampling-based audit, deterministic for known cases)
> - CI gates (what must pass to merge — typecheck, unit, integration, lint, schema migrations dry-run)
>
> ### 8. Risk register
>
> For each risk: description, likelihood (low/medium/high), impact (low/medium/high), mitigation.
>
> Required risks to address (at minimum):
>
> - Community MCP servers go unmaintained or break
> - Rate limit exhaustion mid-demo or under launch traffic
> - Auth credential leakage via logs or error messages
> - Portable database scrape blocking (italaw/ICSID HTML changes break our parser)
> - CanLII-style ToS / scraping legal exposure for any portable DB source we build
> - LLM context overflow when an MCP returns too much
> - Citation hallucination at the LLM layer despite real source data being available
> - User confusion about which sources they have connected vs which are recommended
>
> ### 9. Open questions
>
> Genuine uncertainties for the team to resolve. Don't guess. If you don't know whether to pick stdio or SSE, that's an open question. If you don't know whether the existing agent loop supports multi-tool turns, that's an open question.
>
> ### 10. Appendix: proof-of-concept task
>
> Define a 1-day proof-of-concept that validates the riskiest architecture decision before committing to the full milestone plan. This is the FIRST thing the team does after spec approval.
>
> The riskiest decision is probably one of: MCP host SDK choice, the citation rendering approach, or the portable DB scrape pattern for italaw. Pick the one with the highest "if this doesn't work, we replan everything" cost and define a 1-day spike to de-risk it.
>
> ## Constraints
>
> - **Don't write code.** This is a written spec, not an implementation. Code samples are fine for illustration of schema or interface, but no production code.
> - **Be opinionated.** Make recommendations and justify them in 1–3 sentences each. Don't list options without picking one.
> - **Where you don't know enough, say "open question"** — never guess.
> - **Each chunk is 1–3 days.** If a chunk seems bigger, split it.
> - **Every chunk has tests.** No untested chunks.
> - **Total document length is whatever it needs to be.** Don't pad. Don't truncate. The goal is "manageable", not "short".
>
> ## What good looks like
>
> - A new engineer can join the project and pick up Chunk N+1 from where N ended without re-reading the whole spec.
> - The team can demo something useful after every milestone.
> - Risks are surfaced before they bite.
> - Every chunk has a "definition of done" you could verify in 10 minutes.
> - If a chunk fails its tests, the team rolls back without breaking other chunks.
>
> ## Deliverable
>
> A single markdown document at `docs/mcp-integration-spec.md`, structured exactly as the sections above. Submit for review before writing any production code.
