import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { buildSearchSparql, buildRetrieveSparql, searchEurLex, retrieveEurLex } from "./client.js";

describe("buildSearchSparql", () => {
    it("builds a SPARQL query with a single keyword", () => {
        const sparql = buildSearchSparql("arbitration", 10);
        expect(sparql).toContain('CONTAINS(LCASE(?title), "arbitration")');
        expect(sparql).toContain("LIMIT 10");
    });

    it("builds a SPARQL query with multiple keywords ANDed", () => {
        const sparql = buildSearchSparql("data protection", 5);
        expect(sparql).toContain('CONTAINS(LCASE(?title), "data")');
        expect(sparql).toContain('CONTAINS(LCASE(?title), "protection")');
        expect(sparql).toContain("&&");
        expect(sparql).toContain("LIMIT 5");
    });

    it("strips tokens with unsafe characters and keeps safe ones", () => {
        const sparql = buildSearchSparql('regulation "inject; #bad safe', 10);
        expect(sparql).toContain('CONTAINS(LCASE(?title), "regulation")');
        expect(sparql).toContain('CONTAINS(LCASE(?title), "safe")');
        expect(sparql).not.toContain("inject");
        expect(sparql).not.toContain("bad");
    });

    it("returns empty string when all tokens contain unsafe chars", () => {
        const sparql = buildSearchSparql('"quote" @special !bang', 10);
        expect(sparql).toBe("");
    });

    it("handles empty query", () => {
        expect(buildSearchSparql("", 10)).toBe("");
        expect(buildSearchSparql("   ", 10)).toBe("");
    });
});

describe("buildRetrieveSparql", () => {
    it("builds a SPARQL query for a valid CELEX number", () => {
        const sparql = buildRetrieveSparql("32016R0679");
        expect(sparql).not.toBeNull();
        expect(sparql).toContain('FILTER(?celex = "32016R0679")');
        expect(sparql).toContain("LIMIT 1");
    });

    it("rejects CELEX with special characters", () => {
        expect(buildRetrieveSparql('32016R0679"')).toBeNull();
        expect(buildRetrieveSparql("32016R0679; DROP")).toBeNull();
    });

    it("accepts CELEX with underscores", () => {
        const sparql = buildRetrieveSparql("62025TO0144_RES");
        expect(sparql).not.toBeNull();
        expect(sparql).toContain("62025TO0144_RES");
    });
});

describe("searchEurLex", () => {
    const mockResponse = {
        results: {
            bindings: [
                {
                    celex: { value: "32016R0679" },
                    title: { value: "Regulation (EU) 2016/679 of the European Parliament#General Data Protection Regulation" },
                    date: { value: "2016-04-27" },
                },
                {
                    celex: { value: "32002L0058" },
                    title: { value: "Directive 2002/58/EC concerning the processing of personal data" },
                    date: { value: "2002-07-12" },
                },
            ],
        },
    };

    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(mockResponse),
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns mapped results from SPARQL response", async () => {
        const results = await searchEurLex("data protection");
        expect(results).toHaveLength(2);
        expect(results[0].celex).toBe("32016R0679");
        expect(results[0].title).toBe("Regulation (EU) 2016/679 of the European Parliament");
        expect(results[0].url).toContain("CELEX:32016R0679");
        expect(results[0].date).toBe("2016-04-27");
    });

    it("deduplicates results by CELEX", async () => {
        const dupeResponse = {
            results: {
                bindings: [
                    { celex: { value: "32016R0679" }, title: { value: "GDPR v1" }, date: { value: "2016-04-27" } },
                    { celex: { value: "32016R0679" }, title: { value: "GDPR v2" }, date: { value: "2016-04-27" } },
                ],
            },
        };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve(dupeResponse),
        }));

        const results = await searchEurLex("gdpr");
        expect(results).toHaveLength(1);
    });

    it("returns empty array for empty query", async () => {
        const results = await searchEurLex("");
        expect(results).toEqual([]);
    });

    it("throws on non-200 response", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: false,
            status: 500,
        }));
        await expect(searchEurLex("test")).rejects.toThrow("500");
    });
});

describe("retrieveEurLex", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                results: {
                    bindings: [
                        {
                            celex: { value: "32016R0679" },
                            title: { value: "General Data Protection Regulation" },
                            date: { value: "2016-04-27" },
                        },
                    ],
                },
            }),
        }));
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("returns a single result for valid CELEX", async () => {
        const result = await retrieveEurLex("32016R0679");
        expect(result).not.toBeNull();
        expect(result!.celex).toBe("32016R0679");
        expect(result!.url).toContain("CELEX:32016R0679");
    });

    it("returns null for invalid CELEX format", async () => {
        const result = await retrieveEurLex('invalid"celex');
        expect(result).toBeNull();
    });

    it("returns null when no bindings returned", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ results: { bindings: [] } }),
        }));
        const result = await retrieveEurLex("99999X0000");
        expect(result).toBeNull();
    });
});
