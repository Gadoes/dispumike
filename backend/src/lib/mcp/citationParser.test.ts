/**
 * Tests for the citation parser (Chunk 4).
 * Spec: Section 5, Chunk 4 — Citation Data Model + Storage.
 */

import { describe, it, expect } from "vitest";
import { parseSingleCitation, parseMcpResultToCitations } from "./citationParser.js";
import type { CitationSourceType } from "./types.js";

const USER_ID = "test-user-123";

// ---------------------------------------------------------------------------
// parseSingleCitation — per source type
// ---------------------------------------------------------------------------

describe("parseSingleCitation — CourtListener", () => {
    it("maps CourtListener result to citation schema", () => {
        const raw = {
            id: "12345",
            case_name: "Yukos Capital v. Rosneft",
            citation: "723 F.3d 860",
            court: "ca7",
            date_filed: "2013-07-31",
            url: "https://www.courtlistener.com/opinion/12345/",
            snippet: "...investment treaty arbitration award...",
        };

        const citation = parseSingleCitation("courtlistener", raw, USER_ID);

        expect(citation).toMatchObject({
            user_id: USER_ID,
            source_type: "courtlistener",
            source_id: "12345",
            url: "https://www.courtlistener.com/opinion/12345/",
            title: "Yukos Capital v. Rosneft",
            excerpt: "...investment treaty arbitration award...",
            liveness_status: "unchecked",
        });
    });

    it("returns null when url is missing", () => {
        const raw = { id: "1", case_name: "Test Case" };
        expect(parseSingleCitation("courtlistener", raw, USER_ID)).toBeNull();
    });
});

describe("parseSingleCitation — GovInfo", () => {
    it("maps GovInfo result to citation schema", () => {
        const raw = {
            packageId: "CFR-2024-title29-vol5",
            title: "29 CFR Part 1910 — Occupational Safety",
            dateIssued: "2024-01-01",
            url: "https://www.govinfo.gov/content/pkg/CFR-2024-title29-vol5/pdf/",
            excerpt: "First 500 chars of txt content...",
        };

        const citation = parseSingleCitation("govinfo", raw, USER_ID);

        expect(citation).toMatchObject({
            user_id: USER_ID,
            source_type: "govinfo",
            source_id: "CFR-2024-title29-vol5",
            url: "https://www.govinfo.gov/content/pkg/CFR-2024-title29-vol5/pdf/",
            title: "29 CFR Part 1910 — Occupational Safety",
            liveness_status: "unchecked",
        });
    });
});

describe("parseSingleCitation — Al-Meezan", () => {
    it("maps Al-Meezan result to citation schema (English)", () => {
        const raw = {
            provision_id: "QA-CIV-2004-22-art45",
            law_number: "22",
            year: 2004,
            title_arabic: "القانون المدني",
            title_english: "Civil Code",
            article: "45",
            text_arabic: "يجب أن يكون العقد...",
            text_english: "The contract must...",
            url: "https://www.al-meezan.qa/article/45",
        };

        const citation = parseSingleCitation("al-meezan", raw, USER_ID);

        expect(citation).toMatchObject({
            user_id: USER_ID,
            source_type: "al-meezan",
            source_id: "QA-CIV-2004-22-art45",
            url: "https://www.al-meezan.qa/article/45",
            title: "Civil Code",
            excerpt: "The contract must...",
            liveness_status: "unchecked",
        });
    });

    it("falls back to Arabic title/text when English is absent", () => {
        const raw = {
            provision_id: "QA-CIV-2004-22-art45",
            title_arabic: "القانون المدني",
            text_arabic: "يجب أن يكون العقد...",
            url: "https://www.al-meezan.qa/article/45",
        };

        const citation = parseSingleCitation("al-meezan", raw, USER_ID);

        expect(citation?.title).toBe("القانون المدني");
        expect(citation?.excerpt).toBe("يجب أن يكون العقد...");
    });
});

describe("parseSingleCitation — EUR-Lex", () => {
    it("maps EUR-Lex result with CELEX as source_id", () => {
        const raw = {
            celex: "32016R0679",
            title: "General Data Protection Regulation",
            date: "2016-04-27",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
            excerpt: "...processing of personal data...",
        };

        const citation = parseSingleCitation("eurlex", raw, USER_ID);

        expect(citation).toMatchObject({
            user_id: USER_ID,
            source_type: "eurlex",
            source_id: "32016R0679",
            url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
            title: "General Data Protection Regulation",
            liveness_status: "unchecked",
        });
    });
});

describe("parseSingleCitation — italaw", () => {
    it("maps italaw result to citation schema", () => {
        const raw = {
            case_name: "Yukos Universal Limited v. Russian Federation",
            parties: "Yukos Universal Limited | Russian Federation",
            tribunal: "PCA",
            year: 2014,
            treaty: "ECT",
            outcome: "Award",
            url: "https://italaw.com/cases/958",
            excerpt: "...The Tribunal finds jurisdiction...",
        };

        const citation = parseSingleCitation("italaw", raw, USER_ID);

        expect(citation).toMatchObject({
            user_id: USER_ID,
            source_type: "italaw",
            url: "https://italaw.com/cases/958",
            title: "Yukos Universal Limited v. Russian Federation",
            liveness_status: "unchecked",
        });
    });
});

describe("parseSingleCitation — ICSID", () => {
    it("maps ICSID result to citation schema", () => {
        const raw = {
            case_name: "Loewen Group v. United States",
            parties: "Loewen Group | United States of America",
            tribunal: "ICSID",
            year: 2003,
            proceeding_type: "Award",
            outcome: "Dismissed",
            url: "https://icsid.worldbank.org/cases/case-details?id=ARB(AF)/98/3",
            excerpt: "...",
        };

        const citation = parseSingleCitation("icsid", raw, USER_ID);

        expect(citation).toMatchObject({
            user_id: USER_ID,
            source_type: "icsid",
            url: "https://icsid.worldbank.org/cases/case-details?id=ARB(AF)/98/3",
            title: "Loewen Group v. United States",
            liveness_status: "unchecked",
        });
    });
});

// ---------------------------------------------------------------------------
// parseMcpResultToCitations — array parsing
// ---------------------------------------------------------------------------

describe("parseMcpResultToCitations", () => {
    it("parses results array from MCP tool result blob", () => {
        const blob = JSON.stringify({
            results: [
                {
                    id: "1",
                    case_name: "Case 1",
                    url: "https://www.courtlistener.com/opinion/1/",
                    snippet: "Excerpt 1",
                },
                {
                    id: "2",
                    case_name: "Case 2",
                    url: "https://www.courtlistener.com/opinion/2/",
                    snippet: "Excerpt 2",
                },
            ],
        });

        const citations = parseMcpResultToCitations("courtlistener", blob, USER_ID);

        expect(citations).toHaveLength(2);
        expect(citations[0].source_id).toBe("1");
        expect(citations[1].source_id).toBe("2");
    });

    it("skips results without URL", () => {
        const blob = JSON.stringify({
            results: [
                { id: "1", case_name: "Valid", url: "https://example.com/1", snippet: "" },
                { id: "2", case_name: "No URL" }, // no url → skip
            ],
        });

        const citations = parseMcpResultToCitations("courtlistener", blob, USER_ID);
        expect(citations).toHaveLength(1);
    });

    it("returns empty array for malformed JSON", () => {
        expect(parseMcpResultToCitations("courtlistener", "not json", USER_ID)).toEqual([]);
    });

    it("returns empty array for empty results array", () => {
        const blob = JSON.stringify({ results: [] });
        expect(parseMcpResultToCitations("courtlistener", blob, USER_ID)).toEqual([]);
    });

    it("truncates excerpt to 500 chars", () => {
        const longExcerpt = "x".repeat(600);
        const blob = JSON.stringify({
            results: [{ id: "1", url: "https://example.com", snippet: longExcerpt }],
        });

        const citations = parseMcpResultToCitations("courtlistener", blob, USER_ID);
        expect(citations[0].excerpt?.length).toBeLessThanOrEqual(500);
    });
});
