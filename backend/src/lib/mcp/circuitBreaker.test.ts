/**
 * Circuit breaker tests — Chunk 18.
 * Spec: Section 2.7.
 * Uses Vitest fake timers for ALL timing tests.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { CircuitBreaker, withRetry } from "./circuitBreaker.js";

describe("CircuitBreaker — state transitions", () => {
    let cb: CircuitBreaker;

    beforeEach(() => {
        vi.useFakeTimers();
        cb = new CircuitBreaker({ failureThreshold: 3, windowMs: 60_000, baseResetMs: 60_000, maxResetMs: 300_000 });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("starts in closed state", () => {
        expect(cb.getState()).toBe("closed");
    });

    it("stays closed after fewer than threshold failures", () => {
        cb.recordFailure();
        cb.recordFailure();
        expect(cb.getState()).toBe("closed");
    });

    it("opens after 3 consecutive failures", () => {
        cb.recordFailure();
        cb.recordFailure();
        cb.recordFailure();
        expect(cb.getState()).toBe("open");
    });

    it("isOpen() returns true when open", () => {
        cb.recordFailure();
        cb.recordFailure();
        cb.recordFailure();
        expect(cb.isOpen()).toBe(true);
    });

    it("transitions to half-open after reset delay", () => {
        cb.recordFailure();
        cb.recordFailure();
        cb.recordFailure();
        // Advance past first reset delay (60s)
        vi.advanceTimersByTime(61_000);
        expect(cb.getState()).toBe("half-open");
    });

    it("probe success closes the circuit", () => {
        cb.recordFailure();
        cb.recordFailure();
        cb.recordFailure();
        vi.advanceTimersByTime(61_000);
        cb.probeSuccess();
        expect(cb.getState()).toBe("closed");
    });

    it("probe failure re-opens with exponential backoff", () => {
        cb.recordFailure();
        cb.recordFailure();
        cb.recordFailure();
        vi.advanceTimersByTime(61_000); // half-open
        cb.probeFailure();
        expect(cb.getState()).toBe("open");
        // Second open = backoff 120s
        vi.advanceTimersByTime(120_000);
        expect(cb.getState()).toBe("half-open");
    });

    it("backoff caps at maxResetMs (300s)", () => {
        // Force multiple opens to hit the cap
        for (let i = 0; i < 10; i++) {
            cb.recordFailure();
            cb.recordFailure();
            cb.recordFailure();
            vi.advanceTimersByTime(301_000); // always past any backoff
            if (cb.getState() === "half-open") cb.probeFailure();
        }
        // After enough opens, the circuit should be openable still within 300s window
        expect(cb.getState()).toBe("open");
        vi.advanceTimersByTime(301_000);
        expect(cb.getState()).toBe("half-open");
    });

    it("recordSuccess resets the circuit from closed", () => {
        cb.recordFailure();
        cb.recordFailure();
        cb.recordSuccess();
        expect(cb.getState()).toBe("closed");
    });

    it("failures outside window are evicted (don't count toward threshold)", () => {
        cb.recordFailure();
        cb.recordFailure();
        // Advance past window — old failures no longer count
        vi.advanceTimersByTime(61_000);
        cb.recordFailure(); // only 1 fresh failure
        expect(cb.getState()).toBe("closed");
    });
});

describe("withRetry (fake timers)", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it("returns result on first success", async () => {
        const fn = vi.fn().mockResolvedValue("ok");
        const result = await withRetry(fn, { attempts: 2, backoffs: [500] });
        expect(result).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on failure and succeeds on second attempt", async () => {
        let calls = 0;
        const fn = vi.fn().mockImplementation(async () => {
            if (calls++ === 0) throw new Error("fail");
            return "ok";
        });

        const promise = withRetry(fn, { attempts: 2, backoffs: [500] });
        await vi.runAllTimersAsync();
        const result = await promise;
        expect(result).toBe("ok");
        expect(fn).toHaveBeenCalledTimes(2);
    });

    it("uses correct backoff delays", async () => {
        let calls = 0;
        const timestamps: number[] = [];
        const fn = vi.fn().mockImplementation(async () => {
            timestamps.push(Date.now());
            if (calls++ < 1) throw new Error("fail");
            return "ok";
        });

        const promise = withRetry(fn, { attempts: 2, backoffs: [500, 1000] });
        await vi.runAllTimersAsync();
        await promise;
        expect(timestamps[1] - timestamps[0]).toBeGreaterThanOrEqual(500);
    });
});

describe("withRetry (real timers)", () => {
    it("throws after all attempts exhausted", async () => {
        const fn = vi.fn().mockImplementation(async () => {
            throw new Error("always fails");
        });
        await expect(
            withRetry(fn, { attempts: 2, backoffs: [10] })
        ).rejects.toThrow("always fails");
        expect(fn).toHaveBeenCalledTimes(2);
    }, 5000);
});
