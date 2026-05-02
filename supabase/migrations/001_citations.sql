-- Migration: citations table
-- Chunk 4 — Citation Data Model + Storage
-- Spec: Section 3, data model for citations from MCP results

create table if not exists public.citations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users on delete cascade,
  chat_message_id uuid references public.chat_messages on delete cascade,
  source_type     text not null,   -- 'courtlistener' | 'eurlex' | 'al-meezan' | 'govinfo' | 'italaw' | 'icsid'
  source_id       text,            -- canonical ID in the source (e.g. CL opinion ID, CELEX number)
  url             text not null,
  title           text,
  excerpt         text,            -- ≤500 chars, verbatim from source
  liveness_status text not null default 'unchecked', -- 'unchecked' | 'live' | 'unreachable'
  retrieved_at    timestamptz not null default now(),
  unique (user_id, source_type, source_id)
);

create index if not exists citations_user_id on public.citations(user_id);
create index if not exists citations_chat_message_id on public.citations(chat_message_id);
create index if not exists citations_source_type on public.citations(source_type);

-- liveness_status NOTE: The values 'verified' and 'unverified' are reserved for
-- the hallucination council (Feature 2 of roadmap). Do NOT introduce them in this migration.
-- Only 'unchecked', 'live', and 'unreachable' are valid for v1.
