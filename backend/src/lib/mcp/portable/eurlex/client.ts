const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";
const REQUEST_TIMEOUT_MS = 15_000;

export interface EurLexSearchResult {
    celex: string;
    title: string;
    date: string;
    url: string;
    excerpt: string;
}

interface SparqlBinding {
    celex: { value: string };
    title: { value: string };
    date: { value: string };
}

interface SparqlResponse {
    results: { bindings: SparqlBinding[] };
}

function sanitizeToken(raw: string): string | null {
    const token = raw.toLowerCase().trim();
    if (!token) return null;
    if (!/^[a-z0-9\-/()]+$/.test(token)) return null;
    return token;
}

export function buildSearchSparql(query: string, limit: number): string {
    const tokens = query
        .split(/\s+/)
        .map(sanitizeToken)
        .filter((t): t is string => t !== null);

    if (tokens.length === 0) {
        return "";
    }

    const filters = tokens
        .map((t) => `CONTAINS(LCASE(?title), "${t}")`)
        .join(" && ");

    return `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?title ?date
WHERE {
  ?work cdm:resource_legal_id_celex ?celex .
  ?work cdm:work_date_document ?date .
  ?exp cdm:expression_belongs_to_work ?work .
  ?exp cdm:expression_title ?title .
  ?exp cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
  FILTER(${filters})
}
ORDER BY DESC(?date)
LIMIT ${limit}`;
}

export function buildRetrieveSparql(celex: string): string | null {
    if (!/^[A-Za-z0-9_]+$/.test(celex)) return null;

    return `PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?title ?date
WHERE {
  ?work cdm:resource_legal_id_celex ?celex .
  FILTER(?celex = "${celex}")
  ?work cdm:work_date_document ?date .
  ?exp cdm:expression_belongs_to_work ?work .
  ?exp cdm:expression_title ?title .
  ?exp cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/ENG> .
}
LIMIT 1`;
}

function mapBinding(b: SparqlBinding): EurLexSearchResult {
    const celex = b.celex.value;
    const rawTitle = b.title.value;
    const title = rawTitle.includes("#")
        ? rawTitle.split("#").filter(Boolean)[0].trim()
        : rawTitle;
    const excerpt = rawTitle.length > 300 ? rawTitle.slice(0, 300) + "..." : rawTitle;
    return {
        celex,
        title,
        date: b.date.value,
        url: `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${encodeURIComponent(celex)}`,
        excerpt,
    };
}

async function executeSparql(sparql: string): Promise<SparqlBinding[]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const queryLen = sparql.length;
    console.log("[eurlex-sparql] request", { endpoint: SPARQL_ENDPOINT, queryLen });

    try {
        const response = await fetch(SPARQL_ENDPOINT, {
            method: "POST",
            headers: {
                "Accept": "application/sparql-results+json",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `query=${encodeURIComponent(sparql)}`,
            signal: controller.signal,
        });

        console.log("[eurlex-sparql] response", { status: response.status, queryLen });

        if (!response.ok) {
            throw new Error(`EUR-Lex SPARQL returned ${response.status}`);
        }

        const data = (await response.json()) as SparqlResponse;
        const bindingCount = data.results?.bindings?.length ?? 0;
        console.log("[eurlex-sparql] parsed", { bindingCount, queryLen });
        return data.results?.bindings ?? [];
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        const isAbort = reason.includes("aborted") || reason.includes("abort");
        console.error("[eurlex-sparql] failure", { reason, isTimeout: isAbort, queryLen });
        throw err;
    } finally {
        clearTimeout(timeout);
    }
}

export async function searchEurLex(
    query: string,
    limit = 10,
): Promise<EurLexSearchResult[]> {
    const sparql = buildSearchSparql(query, Math.min(limit, 25));
    if (!sparql) return [];

    const bindings = await executeSparql(sparql);

    const seen = new Set<string>();
    const results: EurLexSearchResult[] = [];
    for (const b of bindings) {
        if (seen.has(b.celex.value)) continue;
        seen.add(b.celex.value);
        results.push(mapBinding(b));
    }
    return results;
}

export async function retrieveEurLex(
    celex: string,
): Promise<EurLexSearchResult | null> {
    const sparql = buildRetrieveSparql(celex);
    if (!sparql) return null;

    const bindings = await executeSparql(sparql);
    if (bindings.length === 0) return null;
    return mapBinding(bindings[0]);
}
