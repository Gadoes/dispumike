/**
 * Citation routes — Chunk 20.
 * POST /citations/:id/verify — run CitationVerifier and update verification_status.
 */

import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createServerSupabase } from "../lib/supabase.js";
import { CitationVerifier } from "../lib/mcp/citationVerifier.js";

export const citationsRouter = Router();
const verifier = new CitationVerifier();

citationsRouter.post("/:id/verify", requireAuth, async (req, res) => {
    const { id } = req.params;
    const db = createServerSupabase();

    const { data: citation, error: fetchError } = await db
        .from("citations")
        .select("id, user_id, url, excerpt")
        .eq("id", id)
        .single();

    if (fetchError || !citation) {
        return void res.status(404).json({ detail: "Citation not found" });
    }

    if (!citation.excerpt) {
        return void res.status(422).json({ detail: "Citation has no excerpt to verify" });
    }

    const status = await verifier.verify(citation.url as string, citation.excerpt as string);

    await db
        .from("citations")
        .update({ verification_status: status })
        .eq("id", id);

    res.json({ id, verification_status: status });
});
