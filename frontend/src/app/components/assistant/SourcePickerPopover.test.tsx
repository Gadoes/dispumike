/**
 * Tests for SourcesPill and SourcePickerPopover.
 * Spec: Section 5, Chunk 7.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { SourcePickerPopover, SourcesPill } from "./SourcePickerPopover";
import type { McpServerRecord } from "@/app/lib/mikeApi";

// ---------------------------------------------------------------------------
// Mock mikeApi
// ---------------------------------------------------------------------------

vi.mock("@/app/lib/mikeApi", () => ({
    listMcpConnections: vi.fn(),
}));

import { listMcpConnections } from "@/app/lib/mikeApi";

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeServer(overrides: Partial<McpServerRecord> = {}): McpServerRecord {
    return {
        id: "srv-1",
        name: "courtlistener",
        display_name: "CourtListener",
        description: "US court opinions",
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
// SourcesPill tests
// ---------------------------------------------------------------------------

describe("SourcesPill", () => {
    it("renders with zero active count", () => {
        render(<SourcesPill activeCount={0} onClick={vi.fn()} />);
        const btn = screen.getByRole("button", { name: /open sources picker/i });
        expect(btn).toBeInTheDocument();
    });

    it("shows active count in aria-label", () => {
        render(<SourcesPill activeCount={3} onClick={vi.fn()} />);
        expect(
            screen.getByRole("button", { name: /3 active/i }),
        ).toBeInTheDocument();
    });

    it("calls onClick when clicked", () => {
        const onClick = vi.fn();
        render(<SourcesPill activeCount={0} onClick={onClick} />);
        fireEvent.click(screen.getByRole("button", { name: /sources picker/i }));
        expect(onClick).toHaveBeenCalledOnce();
    });
});

// ---------------------------------------------------------------------------
// SourcePickerPopover tests
// ---------------------------------------------------------------------------

describe("SourcePickerPopover", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("shows loading state initially", () => {
        vi.mocked(listMcpConnections).mockImplementation(
            () => new Promise(() => {}), // never resolves
        );
        render(
            <SourcePickerPopover onClose={vi.fn()} />,
        );
        expect(screen.getByText(/loading sources/i)).toBeInTheDocument();
    });

    it("renders server display names after loading", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([makeServer()]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText("CourtListener")).toBeInTheDocument();
        });
    });

    it("renders region_glyph for each server", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ region_glyph: "🇺🇸" }),
        ]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText("🇺🇸")).toBeInTheDocument();
        });
    });

    it("renders region group heading", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ region: "us" }),
        ]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText("United States")).toBeInTheDocument();
        });
    });

    it("renders 'Connect' badge for disconnected server", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ connection: null, tier: 1 }),
        ]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText("Connect")).toBeInTheDocument();
        });
    });

    it("renders 'Connected' badge for enabled connection", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({
                connection: {
                    id: "c1",
                    enabled: true,
                    has_key: true,
                    key_version: 1,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            }),
        ]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText("Connected")).toBeInTheDocument();
        });
    });

    it("renders 'Permission required' badge for tier > 1 server", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ tier: 2, connection: null }),
        ]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => {
            expect(screen.getByText("Permission required")).toBeInTheDocument();
        });
    });

    it("filters servers by search query (case-insensitive)", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ display_name: "CourtListener", name: "courtlistener" }),
            makeServer({
                id: "srv-2",
                display_name: "EUR-Lex",
                name: "eurlex",
                region: "eu",
            }),
        ]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => screen.getByText("CourtListener"));

        const searchInput = screen.getByRole("textbox", {
            name: /search sources/i,
        });
        fireEvent.change(searchInput, { target: { value: "eur" } });

        expect(screen.getByText("EUR-Lex")).toBeInTheDocument();
        expect(screen.queryByText("CourtListener")).not.toBeInTheDocument();
    });

    it("shows 'No sources found' when search has no matches", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([makeServer()]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => screen.getByText("CourtListener"));

        fireEvent.change(screen.getByRole("textbox", { name: /search/i }), {
            target: { value: "zzzznonexistent" },
        });

        expect(screen.getByText(/no sources found/i)).toBeInTheDocument();
    });

    it("groups sources in correct region order: arbitration before eu before us", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ id: "s1", region: "us", display_name: "US Court" }),
            makeServer({ id: "s2", region: "eu", display_name: "EU Law" }),
            makeServer({
                id: "s3",
                region: "arbitration",
                display_name: "Arbitration DB",
            }),
        ]);
        render(<SourcePickerPopover onClose={vi.fn()} />);
        await waitFor(() => screen.getByText("International Arbitration"));
        const headings = screen
            .getAllByText(
                /International Arbitration|European Union|United States/,
            )
            .map((el) => el.textContent ?? "");
        expect(headings[0]).toMatch(/International Arbitration/);
        expect(headings[1]).toMatch(/European Union/);
        expect(headings[2]).toMatch(/United States/);
    });

    it("calls onClose when Escape pressed", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([]);
        const onClose = vi.fn();
        render(<SourcePickerPopover onClose={onClose} />);
        fireEvent.keyDown(document, { key: "Escape" });
        expect(onClose).toHaveBeenCalled();
    });

    it("calls onToggleSource when checkbox clicked", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ tier: 1, connection: null }),
        ]);
        const onToggle = vi.fn();
        render(
            <SourcePickerPopover
                onClose={vi.fn()}
                onToggleSource={onToggle}
            />,
        );
        await waitFor(() => screen.getByText("CourtListener"));

        const checkbox = screen.getByRole("checkbox", {
            name: /toggle courtlistener/i,
        });
        fireEvent.click(checkbox);
        expect(onToggle).toHaveBeenCalledWith("courtlistener", true);
    });

    it("reflects activeScope in checkbox checked state", async () => {
        vi.mocked(listMcpConnections).mockResolvedValue([
            makeServer({ name: "courtlistener", tier: 1 }),
        ]);
        render(
            <SourcePickerPopover
                onClose={vi.fn()}
                onToggleSource={vi.fn()}
                activeScope={["courtlistener"]}
            />,
        );
        await waitFor(() => screen.getByText("CourtListener"));
        const checkbox = screen.getByRole("checkbox", {
            name: /toggle courtlistener/i,
        });
        expect(checkbox).toBeChecked();
    });
});
