/**
 * Tests for GET /admin/mcp-telemetry (Chunk 19).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { adminRouter } from "./admin.js";

// ---------------------------------------------------------------------------
// Mock auth middleware
// ---------------------------------------------------------------------------
vi.mock("../middleware/auth", () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

// ---------------------------------------------------------------------------
// Mock Supabase
// ---------------------------------------------------------------------------
const mockOrder = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock("../lib/supabase", () => ({
  createServerSupabase: () => ({ from: mockFrom }),
}));

const app = express();
app.use(express.json());
app.use("/admin", adminRouter);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    source: "courtlistener",
    tool: "search",
    latency_ms: 200,
    cache_hit: false,
    success: true,
    error_type: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("GET /admin/mcp-telemetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOrder.mockReturnValue(mockOrder);
    mockSelect.mockReturnValue({ order: mockOrder });
    mockFrom.mockReturnValue({ select: mockSelect });
  });

  it("returns 200 with per-source stats", async () => {
    const events = [
      makeEvent({ source: "courtlistener", success: true,  latency_ms: 100, cache_hit: false }),
      makeEvent({ source: "courtlistener", success: true,  latency_ms: 300, cache_hit: true  }),
      makeEvent({ source: "courtlistener", success: false, latency_ms: 50,  cache_hit: false, error_type: "timeout" }),
      makeEvent({ source: "eurlex",        success: true,  latency_ms: 400, cache_hit: false }),
    ];
    mockOrder.mockReturnValue({ data: events, error: null });

    const res = await request(app).get("/admin/mcp-telemetry");

    expect(res.status).toBe(200);
    expect(res.body.sources).toHaveLength(2);

    const cl = res.body.sources.find((s: { source: string }) => s.source === "courtlistener");
    expect(cl).toMatchObject({
      source: "courtlistener",
      total_calls: 3,
      success_rate: expect.any(Number),
      avg_latency_ms: expect.any(Number),
      cache_hit_rate: expect.any(Number),
      errors_24h: expect.any(Number),
    });
    expect(cl.success_rate).toBeCloseTo(66.67, 1);
    expect(cl.avg_latency_ms).toBeCloseTo(150, 0); // (100+300+50)/3
    expect(cl.cache_hit_rate).toBeCloseTo(33.33, 1);
    expect(cl.errors_24h).toBe(1);
  });

  it("returns empty array when no events", async () => {
    mockOrder.mockReturnValue({ data: [], error: null });
    const res = await request(app).get("/admin/mcp-telemetry");
    expect(res.status).toBe(200);
    expect(res.body.sources).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    mockOrder.mockReturnValue({ data: null, error: { message: "db error" } });
    const res = await request(app).get("/admin/mcp-telemetry");
    expect(res.status).toBe(500);
  });
});
