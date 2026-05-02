-- Migration: mcp_servers and mcp_connections tables
-- Chunk 6 — Source Connections DB + User Settings UX + Key Encryption
-- Spec: Section 3

-- ---------------------------------------------------------------------------
-- mcp_servers — registry of available MCP source servers
-- ---------------------------------------------------------------------------

create table if not exists public.mcp_servers (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null unique,          -- 'courtlistener'
  display_name                text not null,                  -- 'CourtListener'
  description                 text,
  region                      text not null,                  -- 'us' | 'eu' | 'gulf' | 'arbitration'
  country_code                text,                           -- 'US' | 'EU' | 'QA' | null (multi)
  region_glyph                text,                           -- '🇺🇸' | '🇪🇺' | 'ARB' | 'UN'
  npm_package                 text,                           -- null for portable DB servers
  transport                   text not null default 'stdio',
  auth_type                   text not null default 'none',   -- 'none' | 'api_key'
  auth_env_var                text,                           -- 'COURTLISTENER_API_KEY'
  auth_user_profile_column    text,                           -- 'courtlistener_api_key'
  default_enabled             boolean not null default false,
  tier                        integer not null,               -- 1 | 2 | 3
  sort_order                  integer not null default 0,
  created_at                  timestamptz not null default now()
);

create index if not exists mcp_servers_region_sort on public.mcp_servers(region, sort_order);

-- ---------------------------------------------------------------------------
-- Seed rows — v1 active sources (tier 1)
-- ---------------------------------------------------------------------------

insert into public.mcp_servers
  (name, display_name, description, region, country_code, region_glyph, npm_package, auth_type, auth_env_var, auth_user_profile_column, default_enabled, tier, sort_order)
values
  ('courtlistener',  'CourtListener', 'US federal and state court opinions via CourtListener.com', 'us', 'US', '🇺🇸', '@modelcontextprotocol/courtlistener', 'api_key', 'COURTLISTENER_API_KEY', 'courtlistener_api_key', false, 1, 10),
  ('govinfo',        'GovInfo',        'US federal legislative and regulatory documents via GovInfo.gov', 'us', 'US', '🇺🇸', '@modelcontextprotocol/govinfo', 'api_key', 'GOVINFO_API_KEY', 'govinfo_api_key', false, 1, 20),
  ('al-meezan',      'Al-Meezan',      'Qatari legislation and case law (Arabic/English)', 'gulf', 'QA', '🇶🇦', null, 'none', null, null, false, 1, 10),
  ('eurlex',         'EUR-Lex',         'European Union law, regulations, and directives', 'eu', 'EU', '🇪🇺', '@modelcontextprotocol/eurlex', 'none', null, null, false, 1, 10),
  ('italaw',         'italaw',          'International investment arbitration awards and documents', 'arbitration', null, 'ARB', null, 'none', null, null, false, 1, 10),
  ('icsid',          'ICSID',           'ICSID arbitration cases and awards (World Bank)', 'arbitration', null, 'ARB', null, 'none', null, null, false, 1, 20)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- Seed rows — future sources (tier 2–3, visible in picker as "Connect")
-- ---------------------------------------------------------------------------

insert into public.mcp_servers
  (name, display_name, description, region, country_code, region_glyph, npm_package, auth_type, default_enabled, tier, sort_order)
values
  ('uncitral',    'UNCITRAL CLOUT',    'UN Commission on International Trade Law case law', 'arbitration', null, 'ARB', null, 'none', false, 2, 30),
  ('saudi-moj',   'Saudi MoJ',         'Saudi Ministry of Justice court decisions', 'gulf', 'SA', '🇸🇦', null, 'api_key', false, 2, 20),
  ('bailii',      'BAILII',            'British and Irish Legal Information Institute', 'other', 'GB', '🇬🇧', null, 'none', false, 2, 10),
  ('canlii',      'CanLII',            'Canadian Legal Information Institute', 'other', 'CA', '🇨🇦', null, 'api_key', false, 2, 20),
  ('boe',         'BOE (Spain)',        'Official State Gazette of Spain (Boletín Oficial del Estado)', 'eu', 'ES', '🇪🇸', null, 'none', false, 3, 20),
  ('legifrance',  'Légifrance',        'French legislation and case law', 'eu', 'FR', '🇫🇷', null, 'none', false, 3, 30)
on conflict (name) do nothing;

-- ---------------------------------------------------------------------------
-- mcp_connections — per-user enabled servers with encrypted keys
-- ---------------------------------------------------------------------------

create table if not exists public.mcp_connections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  server_id   uuid not null references public.mcp_servers on delete cascade,
  enabled     boolean not null default true,
  api_key     text,             -- encrypted via AES-256-GCM (never plaintext)
  key_version integer not null default 1,  -- incremented on key rotation
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, server_id)
);

create index if not exists mcp_connections_user_id on public.mcp_connections(user_id);
