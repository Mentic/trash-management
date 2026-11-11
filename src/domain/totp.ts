// S02, S03 — TOTP RFC 6238: SHA-1, 6 cifre, 30 s, ±1 pas, anti-replay pe pasul folosit.
import * as OTPAuth from "otpauth";

export const TOTP_PERIOD = 30;
export const ISSUER = "ADI Demo";

function totp(secretBase32: string, username: string) {
  return new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: "SHA1",
    digits: 6,
    period: TOTP_PERIOD,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

/** Secret aleator de 160 de biți, în Base32. */
export const newSecret = () => new OTPAuth.Secret({ size: 20 }).base32;

export const otpauthUri = (secretBase32: string, username: string) => totp(secretBase32, username).toString();

export const currentStep = (nowMs: number) => Math.floor(nowMs / 1000 / TOTP_PERIOD);

export type TotpCheck = { ok: true; step: number } | { ok: false; reason: "invalid" | "replay" };

/** Acceptă pașii step−1, step, step+1, doar dacă pasul găsit > ultimul pas folosit. */
export function verifyTotp(secretBase32: string, code: string, nowMs: number, lastStep: number | null): TotpCheck {
  const token = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(token)) return { ok: false, reason: "invalid" };
  const delta = totp(secretBase32, "x").validate({ token, timestamp: nowMs, window: 1 });
  if (delta === null) return { ok: false, reason: "invalid" };
  const step = currentStep(nowMs) + delta;
  if (lastStep !== null && step <= lastStep) return { ok: false, reason: "replay" };
  return { ok: true, step };
}

export const generateCode = (secretBase32: string, nowMs: number) => totp(secretBase32, "x").generate({ timestamp: nowMs });

/** S05 — după 5 eșecuri consecutive, blocare 5 minute. */
export const LOCKOUT = { maxFailures: 5, minutes: 5 } as const;

export function registerFailure(failedCount: number, nowMs: number) {
  const next = failedCount + 1;
  if (next >= LOCKOUT.maxFailures) return { failedCount: 0, lockedUntil: new Date(nowMs + LOCKOUT.minutes * 60_000) };
  return { failedCount: next, lockedUntil: null };
}
