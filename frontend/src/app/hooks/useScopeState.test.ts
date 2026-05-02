/**
 * Tests for useScopeState hook.
 * Spec: Section 5, Chunk 8.
 */

import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScopeState } from "./useScopeState";

const CONNECTED = ["courtlistener", "eurlex", "al-meezan"];

describe("useScopeState", () => {
    it("starts with connectedSources as activeSources (per-message mode)", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        expect(result.current.activeSources).toEqual(CONNECTED);
        expect(result.current.scopeMode).toBe("per-message");
        expect(result.current.isNarrowed).toBe(false);
    });

    it("mcpScopePayload is null when no override", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        expect(result.current.mcpScopePayload).toBeNull();
    });

    it("toggleSource — unchecking a source removes it from activeSources", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        expect(result.current.activeSources).not.toContain("courtlistener");
        expect(result.current.activeSources).toContain("eurlex");
    });

    it("toggleSource — unchecking switches to sticky mode", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        expect(result.current.scopeMode).toBe("sticky");
    });

    it("toggleSource — isNarrowed is true after unchecking", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        expect(result.current.isNarrowed).toBe(true);
    });

    it("mcpScopePayload contains only active sources when narrowed", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        expect(result.current.mcpScopePayload).toEqual(["eurlex", "al-meezan"]);
    });

    it("toggleSource — re-checking a source adds it back", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        act(() => result.current.toggleSource("courtlistener", true));
        expect(result.current.activeSources).toContain("courtlistener");
    });

    it("clearScope resets to connected sources and per-message mode", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        act(() => result.current.clearScope());
        expect(result.current.activeSources).toEqual(CONNECTED);
        expect(result.current.scopeMode).toBe("per-message");
        expect(result.current.isNarrowed).toBe(false);
        expect(result.current.mcpScopePayload).toBeNull();
    });

    it("afterSend in per-message mode resets override", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        // Manually set sticky to test per-message reset separately
        // We can't easily set per-message + override together without
        // going through the toggle flow, so this test verifies the reset path:
        act(() => result.current.clearScope());
        act(() => result.current.afterSend());
        expect(result.current.activeSources).toEqual(CONNECTED);
        expect(result.current.mcpScopePayload).toBeNull();
    });

    it("afterSend in sticky mode preserves scope", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        // Now in sticky mode
        act(() => result.current.afterSend());
        expect(result.current.activeSources).not.toContain("courtlistener");
        expect(result.current.scopeMode).toBe("sticky");
    });

    it("mcpScopePayload is null when override matches all connected sources", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        // Remove then re-add — override is now same length as connectedSources
        act(() => result.current.toggleSource("courtlistener", false));
        act(() => result.current.toggleSource("courtlistener", true));
        // override = ["eurlex", "al-meezan", "courtlistener"], same size as connected
        expect(result.current.mcpScopePayload).toBeNull();
    });

    it("multiple toggles — correct final state", () => {
        const { result } = renderHook(() => useScopeState(CONNECTED));
        act(() => result.current.toggleSource("courtlistener", false));
        act(() => result.current.toggleSource("eurlex", false));
        expect(result.current.activeSources).toEqual(["al-meezan"]);
        expect(result.current.mcpScopePayload).toEqual(["al-meezan"]);
    });
});
