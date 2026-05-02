-- Migration 004: MCP query result cache.
-- Spec: Section 2.5, Chunk 17.

CREATE TABLE IF NOT EXISTS mcp_cache (
    cache_key     TEXT PRIMARY KEY,              -- SHA-256 of "{source}:{normalizedQuery}"
    source        TEXT NOT NULL,
    query         TEXT NOT NULL,                 -- normalized query text
    result_json   TEXT NOT NULL,                 -- JSON blob of tool result
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_cache_expires ON mcp_cache (expires_at);
CREATE INDEX IF NOT EXISTS idx_mcp_cache_source  ON mcp_cache (source);
