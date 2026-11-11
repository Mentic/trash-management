// S02, S07 — criptarea secretului TOTP (AES-256-GCM) și amprenta token-ului de sesiune (HMAC-SHA256).
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

function key(name: "TOTP_ENC_KEY" | "SESSION_PEPPER"): Buffer {
  const v = process.env[name];
  if (!v) throw new Error(`${name} lipsește (rulați scripts/init-env.sh)`);
  const k = Buffer.from(v, "base64");
  if (k.length < 32) throw new Error(`${name} trebuie să aibă 32 de octeți (base64)`);
  return k.subarray(0, 32);
}

export function encryptSecret(plain: string): Buffer {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key("TOTP_ENC_KEY"), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, ct, c.getAuthTag()]);
}

export function decryptSecret(blob: Buffer): string {
  const iv = blob.subarray(0, 12);
  const tag = blob.subarray(blob.length - 16);
  const d = createDecipheriv("aes-256-gcm", key("TOTP_ENC_KEY"), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(blob.subarray(12, blob.length - 16)), d.final()]).toString("utf8");
}

export const newToken = () => randomBytes(32).toString("base64url");
export const sessionIdFor = (token: string) => createHmac("sha256", key("SESSION_PEPPER")).update(token).digest("hex");

// S04 — coduri de recuperare: 10 caractere Crockford Base32, afișate XXXXX-XXXXX.
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function newRecoveryCode(): string {
  const b = randomBytes(10);
  const s = Array.from(b, (x) => CROCKFORD[x % 32]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}
export const normalizeRecoveryCode = (c: string) => c.toUpperCase().replace(/[^0-9A-Z]/g, "");
