/**
 * Tests for POST /citations/:id/verify (Chunk 20).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { citationsRouter } from "./citations.js";

vi.mock("../middleware/auth", () => ({
    requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------
const mockSingle = vi.fn();
const mockSelectEq = vi.fn();
const mockSelectFromEq = vi.fn();
const mockUpdateEq = vi.fn();
const mockUpdate = vi.fn();
const mockSelectFn = vi.fn();
const mockFrom = vi.fn();

vi.mock("../lib/supabase", () => ({
    createServerSupabase: () => ({ from: mockFrom }),
}));

// ---------------------------------------------------------------------------
// Mock CitationVerifier
// ---------------------------------------------------------------------------
const { mockVerify } = vi.hoisted(() => ({ mockVerify: vi.fn() }));
vi.mock("../lib/mcp/citationVerifier.js", () => ({
    CitationVerifier: class { verify = mockVerify; },
}));

const app = express();
app.use(express.json());
app.use("/citations", citationsRouter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function setupDb({ citation, updateError = null }: {
    citation: Record<string, unknown> | null;
    updateError?: { message: string } | null;
}) {
    mockSingle.mockResolvedValue({ data: citation, error: citation ? null : { message: "not found" } });
    mockSelectEq.mockReturnValue({ single: mockSingle });
    mockSelectFn.mockReturnValue({ eq: mockSelectEq });
    mockUpdateEq.mockResolvedValue({ error: updateError });
    mockUpdate.mockReturnValue({ eq: mockUpdateEq });
    mockFrom.mockImplementation((_table: string) => ({
        select: mockSelectFn,
        update: mockUpdate,
    }));
}

describe("POST /citations/:id/verify", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns 200 with verified status when excerpt found", async () => {
        setupDb({
            citation: {
                id: "cite-1",
                user_id: "user-1",
                url: "https://example.com/case",
                excerpt: "due process requires notice",
            },
        });
        mockVerify.mockResolvedValue("verified");

        const res = await request(app).post("/citations/cite-1/verify");

        expect(res.status).toBe(200);
        expect(res.body).toMatchObject({ id: "cite-1", verification_status: "verified" });
    });

    it("returns 200 with unverified status when excerpt not found", async () => {
        setupDb({
            citation: {
                id: "cite-2",
                user_id: "user-1",
                url: "https://example.com/case",
                excerpt: "something not on the page",
            },
        });
        mockVerify.mockResolvedValue("unverified");

        const res = await request(app).post("/citations/cite-2/verify");

        expect(res.status).toBe(200);
        expect(res.body.verification_status).toBe("unverified");
    });

    it("returns 200 with unavailable when fetch fails", async () => {
        setupDb({
            citation: {
                id: "cite-3",
                user_id: "user-1",
                url: "https://example.com/dead",
                excerpt: "some text",
            },
        });
        mockVerify.mockResolvedValue("unavailable");

        const res = await request(app).post("/citations/cite-3/verify");

        expect(res.status).toBe(200);
        expect(res.body.verification_status).toBe("unavailable");
    });

    it("returns 404 when citation not found", async () => {
        setupDb({ citation: null });

        const res = await request(app).post("/citations/nonexistent/verify");

        expect(res.status).toBe(404);
    });

    it("returns 422 when citation has no excerpt", async () => {
        setupDb({
            citation: {
                id: "cite-4",
                user_id: "user-1",
                url: "https://example.com/case",
                excerpt: null,
            },
        });

        const res = await request(app).post("/citations/cite-4/verify");

        expect(res.status).toBe(422);
        expect(mockVerify).not.toHaveBeenCalled();
    });
});
