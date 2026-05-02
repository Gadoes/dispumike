-- Migration: user_profiles column additions
-- Chunk 6 — Source Connections DB + User Settings UX + Key Encryption
-- Spec: Section 3, migration step 6

alter table public.user_profiles
  add column if not exists courtlistener_api_key text,
  add column if not exists govinfo_api_key text,
  add column if not exists is_admin boolean not null default false;

-- is_admin gates the telemetry dashboard (Section 5.19, Chunk 19).
