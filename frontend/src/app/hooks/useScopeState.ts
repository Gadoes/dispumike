/**
 * useScopeState — per-query MCP source scope state.
 * Spec: Section 5, Chunk 8.
 *
 * Manages the two persistence modes:
 * - per-message (default): scope resets to persistent connections after each send.
 * - sticky (after user actively narrows scope): scope persists for the thread.
 *
 * Usage:
 *   const scope = useScopeState(connectedSources);
 *   // scope.activeSources — current list of active server names
 *   // scope.scopeMode — 'per-message' | 'sticky'
 *   // scope.toggleSource(name, enabled) — toggle a source
 *   // scope.clearScope() — reset to all connected sources (per-message mode)
 *   // scope.afterSend() — call after each message send (resets if per-message)
 *   // scope.mcpScopePayload — the value to pass in POST /chat as mcpScope
 */

import { useState, useCallback, useMemo } from "react";

export type ScopeMode = "per-message" | "sticky";

export interface ScopeState {
    activeSources: string[];
    scopeMode: ScopeMode;
    isNarrowed: boolean;
    toggleSource: (serverName: string, enabled: boolean) => void;
    clearScope: () => void;
    afterSend: () => void;
    /** The value to send as mcpScope in POST /chat. null = all sources. */
    mcpScopePayload: string[] | null;
}

/**
 * @param connectedSources — list of server names from user's persistent connections
 *   (i.e., servers with connection.enabled === true)
 */
export function useScopeState(connectedSources: string[]): ScopeState {
    // active = connectedSources initially (no override)
    const [overrideSources, setOverrideSources] = useState<string[] | null>(null);
    const [scopeMode, setScopeMode] = useState<ScopeMode>("per-message");

    // When connectedSources changes (e.g. user enables a server in settings),
    // refresh if we haven't narrowed scope yet.
    const activeSources = overrideSources ?? connectedSources;

    // True when the user has explicitly narrowed scope
    const isNarrowed = overrideSources !== null &&
        overrideSources.length < connectedSources.length;

    const toggleSource = useCallback(
        (serverName: string, enabled: boolean) => {
            const base = overrideSources ?? connectedSources;
            let next: string[];
            if (enabled) {
                next = base.includes(serverName) ? base : [...base, serverName];
            } else {
                next = base.filter((s) => s !== serverName);
            }
            setOverrideSources(next);
            // Switching to sticky mode when user narrows scope
            if (next.length < connectedSources.length) {
                setScopeMode("sticky");
            }
        },
        [overrideSources, connectedSources],
    );

    const clearScope = useCallback(() => {
        setOverrideSources(null);
        setScopeMode("per-message");
    }, []);

    const afterSend = useCallback(() => {
        if (scopeMode === "per-message") {
            setOverrideSources(null);
        }
        // sticky mode: leave overrideSources intact
    }, [scopeMode]);

    // mcpScopePayload: only send non-null when scope is narrowed
    const mcpScopePayload = useMemo<string[] | null>(() => {
        if (overrideSources === null) return null;
        if (overrideSources.length === connectedSources.length) return null;
        return overrideSources;
    }, [overrideSources, connectedSources]);

    return {
        activeSources,
        scopeMode,
        isNarrowed,
        toggleSource,
        clearScope,
        afterSend,
        mcpScopePayload,
    };
}
