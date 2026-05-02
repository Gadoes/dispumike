/**
 * Tests for LegalSourcesPage component.
 * Spec: Section 5, Chunk 6.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LegalSourcesPage from "./page";
import type { McpServerRecord } from "@/app/lib/mikeApi";

// ---------------------------------------------------------------------------
// Mock mikeApi
// ---------------------------------------------------------------------------

vi.mock("@/app/lib/mikeApi", () => ({
    listMcpConnections: vi.fn(),
    saveMcpConnection: vi.fn(),
    deleteMcpConnection: vi.fn(),
}));

import { listMcpConnections, saveMcpConnection } from "@/app/lib/mikeApi";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeServer(overrides: Partial<McpServerRecord> = {}): McpServerRecord {
    return {
        id: "srv-1",
        name: "courtlistener",
        display_name: "CourtListener",
        description: "US federal and state court opinions",
        region: "us",
        country_code: "US",
        region_glyph: "🇺🇸",
        auth_type: "api_key",
        default_enabled: false,
        tier: 1,
        sort_order: 10,
        connection: null,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("LegalSourcesPage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("renders loading state initially", () => {
        vi.mocked(listMcpConnections).mockResolvedValue([]);
        render(<LegalSourcesPage />);
        expect(screen.getByText(/loading sources/i)).toBeInTheDocument();
    });

    it("renders server display name after loading", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([makeServer()]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(screen.getByText("CourtListener")).toBeInTheDocument();
        });
    });

    it("renders region glyph", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([makeServer()]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(screen.getByText("🇺🇸")).toBeInTheDocument();
        });
    });

    it("renders region header with correct label", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ region: "us" }),
        ]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(screen.getByText("United States")).toBeInTheDocument();
        });
    });

    it("shows toggle switch per server", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([makeServer()]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(
                screen.getByRole("switch", { name: /toggle courtlistener/i }),
            ).toBeInTheDocument();
        });
    });

    it("shows 'Connected' badge when server has active connection", async () => {
        const server = makeServer({
            connection: {
                id: "conn-1",
                enabled: true,
                has_key: true,
                key_version: 1,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
        });
        vi.mocked(listMcpConnections).mockResolvedValue([server]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(screen.getByText("Connected")).toBeInTheDocument();
        });
    });

    it("shows 'Coming soon' badge for tier > 1 server", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ tier: 2, name: "bailii", display_name: "BAILII" }),
        ]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
        });
    });

    it("shows 'Add key' button for api_key servers", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ auth_type: "api_key" }),
        ]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(
                screen.getByRole("button", { name: /add key/i }),
            ).toBeInTheDocument();
        });
    });

    it("does not show 'Add key' button for servers with auth_type=none", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ auth_type: "none" }),
        ]);
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(
                screen.queryByRole("button", { name: /add key/i }),
            ).not.toBeInTheDocument();
        });
    });

    it("expands API key input when 'Add key' clicked", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ auth_type: "api_key" }),
        ]);
        render(<LegalSourcesPage />);
        await waitFor(() =>
            screen.getByRole("button", { name: /add key/i }),
        );
        fireEvent.click(screen.getByRole("button", { name: /add key/i }));
        expect(
            screen.getByPlaceholderText(/enter api key/i),
        ).toBeInTheDocument();
    });

    it("calls saveMcpConnection when toggle clicked", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([makeServer()]);
        vi.mocked(saveMcpConnection).mockResolvedValue(undefined);
        render(<LegalSourcesPage />);
        await waitFor(() =>
            screen.getByRole("switch", { name: /toggle courtlistener/i }),
        );
        fireEvent.click(
            screen.getByRole("switch", { name: /toggle courtlistener/i }),
        );
        await waitFor(() => {
            expect(saveMcpConnection).toHaveBeenCalledWith({
                server_id: "srv-1",
                enabled: true,
            });
        });
    });

    it("groups servers by region in correct order", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ id: "s1", region: "us", display_name: "US Source" }),
            makeServer({ id: "s2", region: "eu", display_name: "EU Source" }),
            makeServer({
                id: "s3",
                region: "arbitration",
                display_name: "ARB Source",
            }),
        ]);
        render(<LegalSourcesPage />);
        await waitFor(() =>
            screen.getByText("International Arbitration"),
        );
        const headings = screen
            .getAllByRole("heading", { level: 3 })
            .map((h) => h.textContent);
        // arbitration should appear before eu and us
        const arbIdx = headings.findIndex((h) =>
            h?.includes("International Arbitration"),
        );
        const euIdx = headings.findIndex((h) =>
            h?.includes("European Union"),
        );
        const usIdx = headings.findIndex((h) =>
            h?.includes("United States"),
        );
        expect(arbIdx).toBeLessThan(euIdx);
        expect(euIdx).toBeLessThan(usIdx);
    });

    it("shows error message on load failure", async () => {
        vi.mocked(listMcpConnections).mockRejectedValue(
            new Error("Network error"),
        );
        render(<LegalSourcesPage />);
        await waitFor(() => {
            expect(
                screen.getByText(/failed to load legal sources/i),
            ).toBeInTheDocument();
        });
    });
});
