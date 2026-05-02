/**
 * Tests for Chunk 6: Encryption, mcp-connections API, and getUserApiKeys.
 * Spec: Section 5, Chunk 6.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { encryptApiKey, decryptApiKey } from "./encryption";

// ---------------------------------------------------------------------------
// Encryption unit tests
// ---------------------------------------------------------------------------

describe("encryptApiKey / decryptApiKey", () => {
    const VALID_KEY = "a".repeat(64); // 64-char hex string

    beforeEach(() => {
        process.env.MCP_KEY_ENCRYPTION_KEY = VALID_KEY;
    });

    afterEach(() => {
        delete process.env.MCP_KEY_ENCRYPTION_KEY;
    });

    it("round-trip: encrypt then decrypt returns original value", async () => {
        const original = "test-api-key-12345";
        const { ciphertext, version } = await encryptApiKey(original);
        const recovered = await decryptApiKey(ciphertext, version);
        expect(recovered).toBe(original);
    });

    it("returns version 1 for new keys", async () => {
        const { version } = await encryptApiKey("some-key");
        expect(version).toBe(1);
    });

    it("ciphertext is not equal to the plaintext", async () => {
        const original = "secret-api-key";
        const { ciphertext } = await encryptApiKey(original);
        expect(ciphertext).not.toContain(original);
        expect(ciphertext).not.toBe(original);
    });

    it("ciphertext format contains IV, encrypted, authTag (3 colon-separated parts)", async () => {
        const { ciphertext } = await encryptApiKey("my-key");
        const parts = ciphertext.split(":");
        expect(parts).toHaveLength(3);
        // IV is 12 bytes = 24 hex chars
        expect(parts[0]).toHaveLength(24);
        // Auth tag is 16 bytes = 32 hex chars
        expect(parts[2]).toHaveLength(32);
    });

    it("two encryptions of same key produce different ciphertexts (random IV)", async () => {
        const key = "same-key";
        const { ciphertext: c1 } = await encryptApiKey(key);
        const { ciphertext: c2 } = await encryptApiKey(key);
        expect(c1).not.toBe(c2);
    });

    it("throws when MCP_KEY_ENCRYPTION_KEY is not set", async () => {
        delete process.env.MCP_KEY_ENCRYPTION_KEY;
        await expect(encryptApiKey("key")).rejects.toThrow(
            "MCP_KEY_ENCRYPTION_KEY",
        );
    });

    it("throws when MCP_KEY_ENCRYPTION_KEY is wrong length", async () => {
        process.env.MCP_KEY_ENCRYPTION_KEY = "short";
        await expect(encryptApiKey("key")).rejects.toThrow(
            "MCP_KEY_ENCRYPTION_KEY",
        );
    });

    it("decryptApiKey throws on tampered ciphertext", async () => {
        const { version } = await encryptApiKey("real-key");
        await expect(decryptApiKey("bad:data:here", version)).rejects.toThrow();
    });

    it("decryptApiKey throws on invalid format (wrong separator count)", async () => {
        await expect(decryptApiKey("onlyone", 1)).rejects.toThrow(
            "Invalid ciphertext format",
        );
    });

    it("round-trip works for long keys (256 chars)", async () => {
        const longKey = "x".repeat(256);
        const { ciphertext, version } = await encryptApiKey(longKey);
        const recovered = await decryptApiKey(ciphertext, version);
        expect(recovered).toBe(longKey);
    });

    it("round-trip works for keys with special characters", async () => {
        const specialKey = "key-with-sp3c!@l-chars_and=+/";
        const { ciphertext, version } = await encryptApiKey(specialKey);
        const recovered = await decryptApiKey(ciphertext, version);
        expect(recovered).toBe(specialKey);
    });
});

// ---------------------------------------------------------------------------
// getUserApiKeys — MCP key fallback tests
// ---------------------------------------------------------------------------

describe("getUserApiKeys — MCP env fallback", () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("includes courtlistener and govinfo keys from env when no user keys set", async () => {
        process.env.COURTLISTENER_API_KEY = "cl-env-key";
        process.env.GOVINFO_API_KEY = "gov-env-key";

        // Mock supabase to return no user profile keys
        vi.doMock("../../lib/supabase", () => ({
            createServerSupabase: () => ({
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: {
                                    claude_api_key: null,
                                    gemini_api_key: null,
                                    courtlistener_api_key: null,
                                    govinfo_api_key: null,
                                },
                            }),
                        }),
                    }),
                }),
            }),
        }));

        // Dynamic import to pick up mocks
        const { getUserApiKeys } = await import("../userSettings");
        const keys = await getUserApiKeys("user-123");
        expect(keys.courtlistener).toBe("cl-env-key");
        expect(keys.govinfo).toBe("gov-env-key");

        delete process.env.COURTLISTENER_API_KEY;
        delete process.env.GOVINFO_API_KEY;
    });

    it("user-specific keys in user_profiles override env fallback", async () => {
        process.env.COURTLISTENER_API_KEY = "cl-env-key";

        vi.doMock("../../lib/supabase", () => ({
            createServerSupabase: () => ({
                from: () => ({
                    select: () => ({
                        eq: () => ({
                            single: async () => ({
                                data: {
                                    claude_api_key: null,
                                    gemini_api_key: null,
                                    courtlistener_api_key: "cl-user-key",
                                    govinfo_api_key: null,
                                },
                            }),
                        }),
                    }),
                }),
            }),
        }));

        const { getUserApiKeys } = await import("../userSettings");
        const keys = await getUserApiKeys("user-123");
        expect(keys.courtlistener).toBe("cl-user-key");

        delete process.env.COURTLISTENER_API_KEY;
    });
});
