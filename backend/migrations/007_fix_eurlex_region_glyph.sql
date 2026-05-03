-- Migration: fix EUR-Lex region_glyph from text 'EU·27' to flag emoji '🇪🇺'

update public.mcp_servers
set region_glyph = '🇪🇺'
where name = 'eurlex'
  and region_glyph = 'EU·27';
