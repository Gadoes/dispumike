import path from "path";
import { createServerSupabase } from "../../supabase.js";
import type { McpToolDefinition } from "../types.js";
import { IcsidMcpServer } from "./icsid/server.js";
import { ItalawMcpServer } from "./italaw/server.js";
import { cacheManager } from "../cache.js";
import { CircuitBreaker } from "../circuitBreaker.js";

// ---------------------------------------------------------------------------
// Circuit breakers — one per source, keyed by source name (not tool name).
// All tools for a source hit the same upstream; a failure on search_eurlex
// circuit-breaks retrieve_eurlex too.
//
// Threshold: 1 (a 504 from a public endpoint is an outage, not a flap).
// Reset: 60s passive half-open probe — the next real request after 60s tests
// the circuit. If it succeeds, circuit closes. If it fails, circuit re-opens
// with exponential backoff. The user whose request lands during half-open
// absorbs the full timeout on a failed probe; this is acceptable because
// (a) the timeout is 15s, not minutes, and (b) the alternative (active
// background pinging) adds infra complexity for marginal gain on a source
// that is already known-flaky.
// ---------------------------------------------------------------------------
const sourceCircuits: Map<string, CircuitBreaker> = new Map();

function getCircuit(serverName: string): CircuitBreaker {
    let cb = sourceCircuits.get(serverName);
    if (!cb) {
        cb = new CircuitBreaker({ failureThreshold: 1, windowMs: 60_000, baseResetMs: 60_000, maxResetMs: 300_000 });
        sourceCircuits.set(serverName, cb);
    }
    return cb;
}

const PORTABLE_SOURCES: Record<string, {
    displayName: string;
    dbFile?: string;
    tools: McpToolDefinition[];
}> = {
    icsid: {
        displayName: "ICSID",
        dbFile: "icsid.db",
        tools: [
            {
                name: "search_icsid",
                description:
                    "Search ICSID arbitration cases and awards by keyword. Returns case name, case number, proceeding type, year, and excerpt.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search query (keywords, case name, party, etc.)" },
                        limit: { type: "integer", description: "Max results (default 10)" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "retrieve_icsid",
                description:
                    "Retrieve a specific ICSID case by its ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "The ICSID case record ID" },
                    },
                    required: ["id"],
                },
            },
        ],
    },
    italaw: {
        displayName: "italaw",
        dbFile: "italaw.db",
        tools: [
            {
                name: "search_italaw",
                description:
                    "Search italaw international investment arbitration awards and documents by keyword.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search query" },
                        limit: { type: "integer", description: "Max results (default 10)" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "retrieve_italaw",
                description: "Retrieve a specific italaw document by its ID.",
                inputSchema: {
                    type: "object",
                    properties: {
                        id: { type: "string", description: "The italaw record ID" },
                    },
                    required: ["id"],
                },
            },
        ],
    },
    eurlex: {
        displayName: "EUR-Lex",
        tools: [
            {
                name: "search_eurlex",
                description:
                    "Search EU legislation, directives, regulations, and court decisions on EUR-Lex. Returns CELEX number, title, date, and official EUR-Lex URL for each result. Use this to find relevant EU law on any topic.",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: { type: "string", description: "Search keywords (e.g. 'data protection', 'arbitration directive', 'consumer rights')" },
                        limit: { type: "integer", description: "Max results (default 10, max 25)" },
                    },
                    required: ["query"],
                },
            },
            {
                name: "retrieve_eurlex",
                description:
                    "Retrieve a specific EU legal document by its CELEX number from EUR-Lex. Returns the document title, date, and official URL.",
                inputSchema: {
                    type: "object",
                    properties: {
                        celex: { type: "string", description: "The CELEX document number (e.g. '32016R0679' for GDPR)" },
                    },
                    required: ["celex"],
                },
            },
        ],
    },
};

function getDbDir(): string {
    return process.env.MCP_DB_DIR ?? path.join(process.cwd(), "data", "mcp");
}

export async function getEnabledPortableTools(
    userId: string,
): Promise<Array<{ serverName: string; displayName: string; tools: McpToolDefinition[] }>> {
    const db = createServerSupabase();
    const { data: connections } = await db
        .from("mcp_connections")
        .select("server_id, enabled, mcp_servers!inner(name)")
        .eq("user_id", userId)
        .eq("enabled", true);

    if (!connections?.length) return [];

    const result: Array<{ serverName: string; displayName: string; tools: McpToolDefinition[] }> = [];
    for (const conn of connections) {
        const serverName = (conn as unknown as { mcp_servers: { name: string } }).mcp_servers.name;
        const config = PORTABLE_SOURCES[serverName];
        if (config) {
            result.push({
                serverName,
                displayName: config.displayName,
                tools: config.tools,
            });
        }
    }
    return result;
}

function makeUnavailableEnvelope(source: string, reason: string): string {
    const displayName = PORTABLE_SOURCES[source]?.displayName ?? source;
    return JSON.stringify({
        content: [{
            type: "text",
            text: `${displayName} is temporarily unreachable (${reason}). This search cannot be completed right now. Do not retry this source — inform the user that ${displayName} is currently unavailable and answer from your training data if possible.`,
        }],
    });
}

export async function handlePortableToolCall(
    serverName: string,
    toolName: string,
    args: Record<string, unknown>,
): Promise<string> {
    const config = PORTABLE_SOURCES[serverName];
    if (!config) {
        console.log("[portable-tool] unknown source", { serverName, toolName });
        return JSON.stringify({ error: "Unknown portable source" });
    }

    const circuit = getCircuit(serverName);
    const startTime = Date.now();

    console.log("[portable-tool] dispatch", { serverName, toolName, args, circuitState: circuit.getState() });

    if (circuit.isOpen()) {
        const envelope = makeUnavailableEnvelope(serverName, "circuit open — recent failures");
        console.log("[portable-tool] rejected by circuit breaker", {
            serverName, toolName, circuitState: "open", latencyMs: Date.now() - startTime,
        });
        return envelope;
    }

    if (serverName === "eurlex") {
        const cacheQuery = `${toolName}:${String(args.query ?? args.celex ?? "")}`;
        const cached = cacheManager.get("eurlex", cacheQuery);
        if (cached) {
            console.log("[portable-tool] cache hit", { serverName, toolName, latencyMs: Date.now() - startTime });
            circuit.recordSuccess();
            return cached;
        }

        try {
            const { searchEurLex, retrieveEurLex } = await import("./eurlex/client.js");

            if (toolName === "search_eurlex") {
                const results = await searchEurLex(
                    args.query as string,
                    Math.min((args.limit as number) ?? 10, 25),
                );
                const resultStr = JSON.stringify({
                    content: [{ type: "text", text: JSON.stringify({ results }, null, 2) }],
                });
                cacheManager.set("eurlex", cacheQuery, resultStr);
                circuit.recordSuccess();
                console.log("[portable-tool] success", {
                    serverName, toolName, resultCount: results.length,
                    latencyMs: Date.now() - startTime, circuitState: circuit.getState(),
                });
                return resultStr;
            }
            if (toolName === "retrieve_eurlex") {
                const result = await retrieveEurLex(args.celex as string);
                if (!result) {
                    circuit.recordSuccess();
                    console.log("[portable-tool] success (not found)", {
                        serverName, toolName, latencyMs: Date.now() - startTime,
                    });
                    return JSON.stringify({
                        content: [{ type: "text", text: "No document found for that CELEX number." }],
                    });
                }
                const resultStr = JSON.stringify({
                    content: [{ type: "text", text: JSON.stringify({ results: [result] }, null, 2) }],
                });
                cacheManager.set("eurlex", cacheQuery, resultStr);
                circuit.recordSuccess();
                console.log("[portable-tool] success", {
                    serverName, toolName, resultCount: 1,
                    latencyMs: Date.now() - startTime, circuitState: circuit.getState(),
                });
                return resultStr;
            }
        } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            const prevState = circuit.getState();
            circuit.recordFailure();
            const newState = circuit.getState();
            console.error("[portable-tool] failure", {
                serverName, toolName, reason, latencyMs: Date.now() - startTime,
                circuitTransition: prevState !== newState ? `${prevState}→${newState}` : prevState,
                failureTimestamp: new Date().toISOString(),
            });
            return makeUnavailableEnvelope(serverName, reason);
        }
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }

    const dbFile = config.dbFile;
    if (!dbFile) {
        console.log("[portable-tool] no database configured", { serverName, toolName });
        return makeUnavailableEnvelope(serverName, "no database configured");
    }
    const dbPath = path.join(getDbDir(), dbFile);

    try {
        const ServerClass = serverName === "icsid" ? IcsidMcpServer : ItalawMcpServer;
        const server = new ServerClass(dbPath);
        try {
            const searchTool = `search_${serverName}`;
            const retrieveTool = `retrieve_${serverName}`;
            if (toolName === searchTool) {
                const results = server.search(args.query as string, (args.limit as number) ?? 10);
                circuit.recordSuccess();
                console.log("[portable-tool] success", {
                    serverName, toolName, resultCount: Array.isArray(results) ? results.length : 1,
                    latencyMs: Date.now() - startTime,
                });
                return JSON.stringify({ content: [{ type: "text", text: JSON.stringify(results, null, 2) }] });
            }
            if (toolName === retrieveTool) {
                const result = server.retrieve(args.id as string);
                if (!result) {
                    circuit.recordSuccess();
                    console.log("[portable-tool] success (not found)", { serverName, toolName, latencyMs: Date.now() - startTime });
                    return JSON.stringify({ content: [{ type: "text", text: "Not found" }] });
                }
                circuit.recordSuccess();
                console.log("[portable-tool] success", { serverName, toolName, latencyMs: Date.now() - startTime });
                return JSON.stringify({ content: [{ type: "text", text: JSON.stringify(result, null, 2) }] });
            }
        } finally {
            server.close();
        }
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        const prevState = circuit.getState();
        circuit.recordFailure();
        const newState = circuit.getState();
        console.error("[portable-tool] failure", {
            serverName, toolName, reason, latencyMs: Date.now() - startTime,
            circuitTransition: prevState !== newState ? `${prevState}→${newState}` : prevState,
            failureTimestamp: new Date().toISOString(),
        });
        return makeUnavailableEnvelope(serverName, reason);
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
}

export function isPortableSource(serverName: string): boolean {
    return serverName in PORTABLE_SOURCES;
}

export function isSourceCircuitOpen(serverName: string): boolean {
    if (!sourceCircuits.has(serverName)) return false;
    return getCircuit(serverName).isOpen();
}
