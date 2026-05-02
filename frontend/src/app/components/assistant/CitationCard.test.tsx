/**
 * Tests for CitationCard / CitationList component.
 * Spec: Section 5, Chunk 5.
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CitationList } from "./CitationCard";
import type { McpCitation } from "../shared/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCitation(overrides: Partial<McpCitation> = {}): McpCitation {
    return {
        user_id: "user-1",
        source_type: "courtlistener",
        url: "https://www.courtlistener.com/opinion/123/smith-v-jones/",
        title: "Smith v. Jones",
        excerpt: "The court held that due process requires notice.",
        liveness_status: "unchecked",
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Single card view (≤3 citations)
// ---------------------------------------------------------------------------

describe("CitationList — single card view (≤3 citations)", () => {
    it("renders title and excerpt", () => {
        const citations = [makeCitation()];
        render(<CitationList citations={citations} />);
        expect(screen.getByText("Smith v. Jones")).toBeInTheDocument();
        expect(
            screen.getByText("The court held that due process requires notice."),
        ).toBeInTheDocument();
    });

    it("renders source badge with display name", () => {
        const citations = [makeCitation({ source_type: "courtlistener" })];
        render(<CitationList citations={citations} />);
        expect(screen.getByText("CourtListener")).toBeInTheDocument();
    });

    it("renders region glyph for courtlistener", () => {
        const citations = [makeCitation({ source_type: "courtlistener" })];
        render(<CitationList citations={citations} />);
        expect(screen.getByText("🇺🇸")).toBeInTheDocument();
    });

    it("renders EUR-Lex region glyph", () => {
        const citations = [
            makeCitation({
                source_type: "eurlex",
                title: "Regulation EU 2024/1",
                url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:12024P001",
            }),
        ];
        render(<CitationList citations={citations} />);
        expect(screen.getByText("EU·27")).toBeInTheDocument();
    });

    it("'Open source' link has target=_blank and correct href", () => {
        const url =
            "https://www.courtlistener.com/opinion/123/smith-v-jones/";
        const citations = [makeCitation({ url })];
        render(<CitationList citations={citations} />);
        const link = screen.getByRole("link", { name: /open source/i });
        expect(link).toHaveAttribute("href", url);
        expect(link).toHaveAttribute("target", "_blank");
        expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders 'Verify & read' button stub", () => {
        const citations = [makeCitation()];
        render(<CitationList citations={citations} />);
        expect(
            screen.getByRole("button", { name: /verify.*read/i }),
        ).toBeInTheDocument();
    });

    it("calls onVerifyAndRead with the citation when button clicked", () => {
        const onVerifyAndRead = vi.fn();
        const citation = makeCitation();
        render(
            <CitationList
                citations={[citation]}
                onVerifyAndRead={onVerifyAndRead}
            />,
        );
        fireEvent.click(screen.getByRole("button", { name: /verify.*read/i }));
        expect(onVerifyAndRead).toHaveBeenCalledWith(citation);
    });

    it("falls back to 'Untitled' when title is null", () => {
        const citations = [makeCitation({ title: null })];
        render(<CitationList citations={citations} />);
        expect(screen.getByText("Untitled")).toBeInTheDocument();
    });

    it("renders liveness dot with unchecked title", () => {
        const citations = [makeCitation({ liveness_status: "unchecked" })];
        render(<CitationList citations={citations} />);
        expect(
            screen.getByTitle("Liveness not checked"),
        ).toBeInTheDocument();
    });

    it("renders liveness dot with live title", () => {
        const citations = [makeCitation({ liveness_status: "live" })];
        render(<CitationList citations={citations} />);
        expect(screen.getByTitle("URL is reachable")).toBeInTheDocument();
    });

    it("renders liveness dot with unreachable title", () => {
        const citations = [makeCitation({ liveness_status: "unreachable" })];
        render(<CitationList citations={citations} />);
        expect(screen.getByTitle("URL unreachable")).toBeInTheDocument();
    });

    it("applies dir=rtl for Arabic excerpt", () => {
        const arabicExcerpt = "يُحدد هذا القانون الإجراءات القضائية.";
        const citations = [makeCitation({ excerpt: arabicExcerpt })];
        render(<CitationList citations={citations} />);
        const p = screen.getByText(arabicExcerpt);
        expect(p).toHaveAttribute("dir", "rtl");
    });

    it("does not apply dir=rtl for non-Arabic excerpt", () => {
        const citations = [
            makeCitation({
                excerpt: "The court held that due process requires notice.",
            }),
        ];
        render(<CitationList citations={citations} />);
        const p = screen.getByText(
            "The court held that due process requires notice.",
        );
        expect(p).not.toHaveAttribute("dir", "rtl");
    });

    it("renders 3 citations as 3 expanded cards", () => {
        const citations = [
            makeCitation({ title: "Case A", id: "1" }),
            makeCitation({ title: "Case B", id: "2" }),
            makeCitation({ title: "Case C", id: "3" }),
        ];
        render(<CitationList citations={citations} />);
        expect(screen.getByText("Case A")).toBeInTheDocument();
        expect(screen.getByText("Case B")).toBeInTheDocument();
        expect(screen.getByText("Case C")).toBeInTheDocument();
        // All 3 excerpts should be visible (no compact list)
        const links = screen.getAllByRole("link", { name: /open source/i });
        expect(links).toHaveLength(3);
    });

    it("renders nothing for empty citations array", () => {
        const { container } = render(<CitationList citations={[]} />);
        expect(container.firstChild).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Compact list view (≥4 citations)
// ---------------------------------------------------------------------------

describe("CitationList — compact list view (≥4 citations)", () => {
    function makeCompactCitations(): McpCitation[] {
        return [
            makeCitation({ title: "Case A", id: "1" }),
            makeCitation({ title: "Case B", id: "2" }),
            makeCitation({ title: "Case C", id: "3" }),
            makeCitation({ title: "Case D", id: "4" }),
        ];
    }

    it("renders all 4 titles in compact list", () => {
        render(<CitationList citations={makeCompactCitations()} />);
        expect(screen.getByText("Case A")).toBeInTheDocument();
        expect(screen.getByText("Case B")).toBeInTheDocument();
        expect(screen.getByText("Case C")).toBeInTheDocument();
        expect(screen.getByText("Case D")).toBeInTheDocument();
    });

    it("does not show excerpt by default (collapsed state)", () => {
        const citations = makeCompactCitations();
        render(<CitationList citations={citations} />);
        // Excerpts are hidden until rows are expanded
        const excerpts = screen.queryAllByText(
            "The court held that due process requires notice.",
        );
        expect(excerpts).toHaveLength(0);
    });

    it("expands row to show excerpt on click", () => {
        const citations = makeCompactCitations();
        render(<CitationList citations={citations} />);
        // Click the first row button (Case A)
        const rowButtons = screen.getAllByRole("button", {
            name: /case a/i,
        });
        fireEvent.click(rowButtons[0]);
        // Now the excerpt should be visible
        expect(
            screen.getByText("The court held that due process requires notice."),
        ).toBeInTheDocument();
    });

    it("collapses row again on second click", () => {
        const citations = makeCompactCitations();
        render(<CitationList citations={citations} />);
        const rowButtons = screen.getAllByRole("button", { name: /case a/i });
        fireEvent.click(rowButtons[0]);
        // Excerpt visible
        expect(
            screen.getByText("The court held that due process requires notice."),
        ).toBeInTheDocument();
        // Click again to collapse
        fireEvent.click(rowButtons[0]);
        // Excerpt hidden
        expect(
            screen.queryByText(
                "The court held that due process requires notice.",
            ),
        ).not.toBeInTheDocument();
    });

    it("compact row shows 'Open source' link when expanded", () => {
        const citations = makeCompactCitations();
        render(<CitationList citations={citations} />);
        // No link initially
        expect(
            screen.queryByRole("link", { name: /open source/i }),
        ).not.toBeInTheDocument();
        // Expand first row
        const rowButtons = screen.getAllByRole("button", { name: /case a/i });
        fireEvent.click(rowButtons[0]);
        expect(
            screen.getByRole("link", { name: /open source/i }),
        ).toBeInTheDocument();
    });

    it("renders Sources header with count", () => {
        const citations = makeCompactCitations();
        render(<CitationList citations={citations} />);
        expect(screen.getByText("Sources (4)")).toBeInTheDocument();
    });

    it("applies dir=rtl for Arabic excerpt in expanded compact row", () => {
        const arabicExcerpt = "يُحدد هذا القانون الإجراءات القضائية.";
        const citations = [
            makeCitation({ title: "Arabic Case", id: "1", excerpt: arabicExcerpt }),
            makeCitation({ title: "Case B", id: "2" }),
            makeCitation({ title: "Case C", id: "3" }),
            makeCitation({ title: "Case D", id: "4" }),
        ];
        render(<CitationList citations={citations} />);
        const rowButtons = screen.getAllByRole("button", {
            name: /arabic case/i,
        });
        fireEvent.click(rowButtons[0]);
        const p = screen.getByText(arabicExcerpt);
        expect(p).toHaveAttribute("dir", "rtl");
    });
});
