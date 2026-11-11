import { describe, expect, it } from "vitest";
import * as OTPAuth from "otpauth";
import { generateCode, registerFailure, verifyTotp, currentStep, newSecret, otpauthUri } from "@/domain/totp";

// Vectorul RFC 6238 pentru SHA-1: secret ASCII „12345678901234567890”.
const RFC = OTPAuth.Secret.fromLatin1("12345678901234567890").base32;

describe("TOTP (S02, S03, S05)", () => {
  it("vectorii RFC 6238 (ultimele 6 cifre)", () => {
    expect(generateCode(RFC, 59_000)).toBe("287082");
    expect(generateCode(RFC, 1_111_111_109_000)).toBe("081804");
  });
  it("acceptă ±1 pas, refuză ±2", () => {
    const now = 1_800_000_000_000;
    expect(verifyTotp(RFC, generateCode(RFC, now - 30_000), now, null).ok).toBe(true);
    expect(verifyTotp(RFC, generateCode(RFC, now + 30_000), now, null).ok).toBe(true);
    expect(verifyTotp(RFC, generateCode(RFC, now - 60_000), now, null).ok).toBe(false);
  });
  it("refuză reutilizarea unui cod și un cod mai vechi decât ultimul folosit", () => {
    const now = 1_800_000_000_000;
    const first = verifyTotp(RFC, generateCode(RFC, now), now, null);
    expect(first.ok).toBe(true);
    const last = first.ok ? first.step : 0;
    expect(verifyTotp(RFC, generateCode(RFC, now), now, last)).toEqual({ ok: false, reason: "replay" });
    expect(verifyTotp(RFC, generateCode(RFC, now - 30_000), now, last)).toEqual({ ok: false, reason: "replay" });
    expect(verifyTotp(RFC, generateCode(RFC, now + 30_000), now + 30_000, last).ok).toBe(true);
    expect(currentStep(now)).toBe(last);
  });
  it("acceptă spații în cod (lipire)", () => {
    const now = 1_800_000_000_000;
    const c = generateCode(RFC, now);
    expect(verifyTotp(RFC, `${c.slice(0, 3)} ${c.slice(3)}`, now, null).ok).toBe(true);
  });
  it("secret de 160 de biți și URI otpauth", () => {
    const s = newSecret();
    expect(s).toHaveLength(32);
    expect(otpauthUri(s, "ana.registrator")).toMatch(/^otpauth:\/\/totp\/ADI%20Demo:ana\.registrator\?/);
  });
  it("blocare după 5 eșecuri, 5 minute", () => {
    let st = { failedCount: 0, lockedUntil: null as Date | null };
    for (let i = 0; i < 4; i++) st = registerFailure(st.failedCount, 0);
    expect(st.lockedUntil).toBeNull();
    st = registerFailure(st.failedCount, 0);
    expect(st.lockedUntil?.getTime()).toBe(5 * 60_000);
    expect(st.failedCount).toBe(0);
  });
});
