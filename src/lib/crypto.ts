import "server-only";
import crypto from "node:crypto";

/**
 * AES-256-GCM encryption for sensitive values (GitHub tokens).
 *
 * The key comes from APP_ENCRYPTION_KEY (server-side only, never
 * NEXT_PUBLIC_*). It must be a 64-char hex string (32 bytes) or any
 * passphrase, which is derived to 32 bytes with scrypt.
 */

function getKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("APP_ENCRYPTION_KEY is not set. Add it to .env (server-side only).");
  }
  // Accept a 64-char hex key directly; otherwise derive a 32-byte key.
  if (/^[0-9a-f]{64}$/i.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return crypto.scryptSync(secret, "habit-tracker:salt", 32);
}

export type EncryptedValue = {
  encryptedToken: string; // base64 ciphertext
  iv: string; // base64
  authTag: string; // base64
};

export function encrypt(plaintext: string): EncryptedValue {
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    encryptedToken: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decrypt({ encryptedToken, iv, authTag }: EncryptedValue): string {
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedToken, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
