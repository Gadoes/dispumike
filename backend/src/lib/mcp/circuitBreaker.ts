/**
 * CircuitBreaker — per-source fault isolation.
 * Spec: Section 2.7, Chunk 18.
 *
 * States: closed → open → half-open
 * Opens after 3 consecutive failures within a 60s window.
 * Reset: exponential backoff 60s → 120s → 240s → 300s (cap).
 * Retry wrapper: 2 attempts (500ms, 1000ms backoff) before recording failure.
 */

export type CircuitState = "closed" | "open" | "half-open";

export interface CircuitBreakerOptions {
    failureThreshold?: number;   // default: 3
    windowMs?: number;           // default: 60000
    baseResetMs?: number;        // default: 60000
    maxResetMs?: number;         // default: 300000
}

interface FailureRecord {
    at: number; // timestamp ms
}

export class CircuitBreaker {
    private state: CircuitState = "closed";
    private failures: FailureRecord[] = [];
    private openCount = 0;           // how many times we've opened
    private nextResetAt: number | null = null;

    private readonly failureThreshold: number;
    private readonly windowMs: number;
    private readonly baseResetMs: number;
    private readonly maxResetMs: number;

    constructor(opts: CircuitBreakerOptions = {}) {
        this.failureThreshold = opts.failureThreshold ?? 3;
        this.windowMs = opts.windowMs ?? 60_000;
        this.baseResetMs = opts.baseResetMs ?? 60_000;
        this.maxResetMs = opts.maxResetMs ?? 300_000;
    }

    getState(): CircuitState {
        this.maybeTransitionToHalfOpen();
        return this.state;
    }

    /** Record a successful call — resets the circuit. */
    recordSuccess(): void {
        this.state = "closed";
        this.failures = [];
        this.openCount = 0;
        this.nextResetAt = null;
    }

    /** Record a failed call. Opens the circuit if threshold exceeded. */
    recordFailure(): void {
        const now = Date.now();
        this.failures.push({ at: now });
        // Evict failures outside the window
        this.failures = this.failures.filter(f => now - f.at < this.windowMs);

        if (this.failures.length >= this.failureThreshold && this.state === "closed") {
            this.open();
        }
    }

    /** Returns true if the circuit is open and requests should be rejected. */
    isOpen(): boolean {
        return this.getState() === "open";
    }

    private open(): void {
        this.state = "open";
        this.openCount++;
        const backoffMs = Math.min(
            this.baseResetMs * Math.pow(2, this.openCount - 1),
            this.maxResetMs,
        );
        this.nextResetAt = Date.now() + backoffMs;
    }

    private maybeTransitionToHalfOpen(): void {
        if (this.state === "open" && this.nextResetAt !== null && Date.now() >= this.nextResetAt) {
            this.state = "half-open";
        }
    }

    /** Attempt half-open probe: success closes, failure re-opens. */
    probeSuccess(): void {
        this.recordSuccess();
    }

    probeFailure(): void {
        this.open();
    }
}

// ---------------------------------------------------------------------------
// Retry wrapper
// ---------------------------------------------------------------------------

export interface RetryOptions {
    attempts?: number;           // default: 2
    backoffs?: number[];         // default: [500, 1000]
}

/**
 * Execute fn with retry. On each failure, waits backoff[i] ms before retrying.
 * After all attempts are exhausted, throws the last error.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    opts: RetryOptions = {},
): Promise<T> {
    const attempts = opts.attempts ?? 2;
    const backoffs = opts.backoffs ?? [500, 1000];

    let lastError: unknown;
    for (let i = 0; i < attempts; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;
            if (i < attempts - 1) {
                await delay(backoffs[i] ?? backoffs[backoffs.length - 1]);
            }
        }
    }
    throw lastError;
}

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}
