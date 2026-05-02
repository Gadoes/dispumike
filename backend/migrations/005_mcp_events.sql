-- Migration 005: MCP telemetry events.
-- Spec: Section 3 (mcp_events), Chunk 19.

CREATE TABLE IF NOT EXISTS mcp_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES auth.users ON DELETE SET NULL,
    source      TEXT NOT NULL,
    tool        TEXT NOT NULL,
    latency_ms  INTEGER,
    cache_hit   BOOLEAN NOT NULL DEFAULT FALSE,
    success     BOOLEAN NOT NULL,
    error_type  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mcp_events_created_at ON mcp_events (created_at);
CREATE INDEX IF NOT EXISTS mcp_events_source      ON mcp_events (source);
