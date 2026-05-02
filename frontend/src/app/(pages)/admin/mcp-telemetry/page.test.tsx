/**
 * Tests for /admin/mcp-telemetry page (Chunk 19).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import McpTelemetryPage from "./page.js";

// ---------------------------------------------------------------------------
// Mock fetch
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockTelemetryResponse(sources: unknown[]) {
    mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ sources }),
    });
}

const SAMPLE_SOURCES = [
    {
        source: "courtlistener",
        total_calls: 120,
        success_rate: 91.67,
        avg_latency_ms: 340,
        cache_hit_rate: 25.0,
        errors_24h: 3,
    },
    {
        source: "eurlex",
        total_calls: 45,
        success_rate: 100,
        avg_latency_ms: 820,
        cache_hit_rate: 11.11,
        errors_24h: 0,
    },
];

describe("McpTelemetryPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders loading state initially", () => {
        mockFetch.mockReturnValue(new Promise(() => {})); // never resolves
        render(<McpTelemetryPage />);
        expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it("renders table with source rows after fetch", async () => {
        mockTelemetryResponse(SAMPLE_SOURCES);
        render(<McpTelemetryPage />);

        await waitFor(() => {
            expect(screen.getByText("courtlistener")).toBeInTheDocument();
        });

        expect(screen.getByText("eurlex")).toBeInTheDocument();
        expect(screen.getByText("120")).toBeInTheDocument();
        expect(screen.getByText("91.67%")).toBeInTheDocument();
        expect(screen.getByText("340 ms")).toBeInTheDocument();
    });

    it("renders error message on fetch failure", async () => {
        mockFetch.mockRejectedValue(new Error("Network error"));
        render(<McpTelemetryPage />);

        await waitFor(() => {
            expect(screen.getByText(/error/i)).toBeInTheDocument();
        });
    });

    it("renders empty state when no sources", async () => {
        mockTelemetryResponse([]);
        render(<McpTelemetryPage />);

        await waitFor(() => {
            expect(screen.getByText(/no telemetry/i)).toBeInTheDocument();
        });
    });
});
