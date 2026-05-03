-- Migration 006: Add verification_status to citations.
-- Spec: Section 3 (citations schema), Chunk 20.

ALTER TABLE public.citations
    ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'pending';

-- Only valid values
ALTER TABLE public.citations
    ADD CONSTRAINT citations_verification_status_check
    CHECK (verification_status IN ('pending', 'verified', 'unverified', 'unavailable'));
