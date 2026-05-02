/**
 * API key encryption/decryption for mcp_connections.api_key.
 * Spec: Section 5, Chunk 6.
 *
 * Uses AES-256-GCM with a server-side master key from env (MCP_KEY_ENCRYPTION_KEY).
 * The master key must be a 64-char hex string (32 bytes).
 *
 * The ciphertext format stored in the DB is:
 *   <iv_hex>:<ciphertext_hex>:<auth_tag_hex>
 *
 * key_version is stored alongside the ciphertext and incremented on key rotation.
 * Raw keys are NEVER stored in the DB — only encrypted ciphertext.
 */

import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getMasterKey(): Buffer {
    const hex = process.env.MCP_KEY_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error(
            "MCP_KEY_ENCRYPTION_KEY must be a 64-char hex string (32 bytes). " +
            "Generate with: openssl rand -hex 32",
        );
    }
    return Buffer.from(hex, "hex");
}

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const AUTH_TAG_BYTES = 16;
const SEPARATOR = ":";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encrypt an API key using AES-256-GCM.
 * Returns a ciphertext string and the current key version (always 1 for new keys).
 *
 * @throws if MCP_KEY_ENCRYPTION_KEY is not set or invalid
 */
export async function encryptApiKey(
    key: string,
): Promise<{ ciphertext: string; version: number }> {
    const masterKey = getMasterKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, masterKey, iv);
    const encrypted = Buffer.concat([
        cipher.update(key, "utf8"),
        cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();
    const ciphertext = [
        iv.toString("hex"),
        encrypted.toString("hex"),
        authTag.toString("hex"),
    ].join(SEPARATOR);
    return { ciphertext, version: 1 };
}

/**
 * Decrypt an API key using AES-256-GCM.
 * The version parameter is reserved for future key rotation support.
 *
 * @throws if decryption fails (wrong key, tampered ciphertext, etc.)
 */
export async function decryptApiKey(
    ciphertext: string,
    _version: number,
): Promise<string> {
    const masterKey = getMasterKey();
    const parts = ciphertext.split(SEPARATOR);
    if (parts.length !== 3) {
        throw new Error("Invalid ciphertext format");
    }
    const [ivHex, encryptedHex, authTagHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const encrypted = Buffer.from(encryptedHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    if (iv.length !== IV_BYTES) throw new Error("Invalid IV length");
    if (authTag.length !== AUTH_TAG_BYTES) throw new Error("Invalid auth tag length");

    const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);
    return decrypted.toString("utf8");
}
