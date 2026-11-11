"use server";
// S01–S05, S08 — pașii de autentificare (sec. 6.2, 7). Toate verificările se fac pe server.
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { recoveryCodes, sessions, users } from "@/db/schema";
import { registerFailure, verifyTotp } from "@/domain/totp";
import { audit } from "@/server/audit";
import { decryptSecret, encryptSecret, newRecoveryCode, normalizeRecoveryCode } from "@/server/auth/crypto";
import { hashSecret, verifySecret } from "@/server/auth/password";
import { clientIp, endSession, getSession, promoteToActive, startSession } from "@/server/auth/session";

export type FormState = { error?: string; recoveryCodes?: string[] } | undefined;

const fmtTime = (d: Date) =>
  d.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" });
const lockedMessage = (d: Date) => `Contul este blocat până la ${fmtTime(d)}, după 5 coduri greșite. Încercați din nou atunci.`;

const loginSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });

export async function loginWithPassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ username: form.get("username"), password: form.get("password") });
  if (!parsed.success) return { error: "Completați utilizatorul și parola." };
  const { username, password } = parsed.data;
  const ip = await clientIp();

  const [user] = await db.select().from(users).where(eq(users.username, username));
  const ok = await verifySecret(user?.passwordHash, password);
  if (!user || !ok) {
    await audit(db, { category: "security", action: "auth.password_failed", entityType: "user", entityId: username, actorId: user?.id ?? null, ip });
    return { error: "Utilizatorul sau parola nu sunt corecte. Verificați datele și încercați din nou." };
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) return { error: lockedMessage(user.lockedUntil) };

  await audit(db, { category: "security", action: "auth.password_ok", entityType: "user", entityId: user.id, actorId: user.id, ip });
  const enrolled = user.totpSecretEnc !== null;
  await startSession(user.id, enrolled ? "password_ok" : "enrolling");
  redirect(enrolled ? "/2fa" : "/enrol");
}

/** S05: un cod greșit crește contorul; la 5, blocare 5 minute. Întoarce mesajul de eroare. */
async function failCode(userId: string, failedCount: number, ip: string | null): Promise<string> {
  const next = registerFailure(failedCount, Date.now());
  await db.update(users).set({ failedMfaCount: next.failedCount, lockedUntil: next.lockedUntil }).where(eq(users.id, userId));
  await audit(db, { category: "security", action: "auth.mfa_failed", entityType: "user", entityId: userId, actorId: userId, ip });
  if (next.lockedUntil) {
    await audit(db, { category: "security", action: "auth.locked", entityType: "user", entityId: userId, actorId: userId, ip });
    return lockedMessage(next.lockedUntil);
  }
  const left = 5 - next.failedCount;
  return `Codul nu este valid. Verificați ora telefonului și introduceți codul curent. Mai aveți ${left} ${left === 1 ? "încercare" : "încercări"}.`;
}

export async function confirmEnrolment(_: FormState, form: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s || s.session.stage !== "enrolling" || !s.session.pendingTotpSecretEnc) redirect("/login");
  const ip = await clientIp();
  const { user } = s;
  if (user.lockedUntil && user.lockedUntil > new Date()) return { error: lockedMessage(user.lockedUntil) };

  const secret = decryptSecret(s.session.pendingTotpSecretEnc);
  const check = verifyTotp(secret, String(form.get("code") ?? ""), Date.now(), null);
  if (!check.ok) return { error: await failCode(user.id, user.failedMfaCount, ip) };

  const codes = Array.from({ length: 10 }, newRecoveryCode);
  const hashes = await Promise.all(codes.map((c) => hashSecret(normalizeRecoveryCode(c))));
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ totpSecretEnc: encryptSecret(secret), totpKeyVersion: 1, totpEnrolledAt: new Date(), totpLastStep: check.step, failedMfaCount: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
    await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, user.id));
    await tx.insert(recoveryCodes).values(hashes.map((codeHash) => ({ userId: user.id, codeHash })));
    await audit(tx, { category: "security", action: "auth.mfa_enrolled", entityType: "user", entityId: user.id, actorId: user.id, ip });
  });
  // Aceeași sesiune devine activă fără cookie nou: schimbarea cookie-ului ar reîmprospăta pagina și
  // codurile de recuperare (afișate o singură dată) s-ar pierde. Sesiunea a fost creată după parolă.
  await db.update(sessions).set({ stage: "active", pendingTotpSecretEnc: null }).where(eq(sessions.id, s.session.id));
  return { recoveryCodes: codes };
}

export async function verifyMfa(_: FormState, form: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s || s.session.stage !== "password_ok") redirect("/login");
  const ip = await clientIp();
  const input = String(form.get("code") ?? "").trim();

  const result = await db.transaction(async (tx) => {
    // Blocare pe rând: două cereri simultane cu același cod nu trec amândouă (anti-replay).
    const [user] = await tx.select().from(users).where(eq(users.id, s.user.id)).for("update");
    if (!user?.totpSecretEnc) return { kind: "fail" as const, failed: 0 };
    if (user.lockedUntil && user.lockedUntil > new Date()) return { kind: "locked" as const, until: user.lockedUntil };

    if (/^\d[\d\s]*$/.test(input)) {
      const check = verifyTotp(decryptSecret(user.totpSecretEnc), input, Date.now(), user.totpLastStep);
      if (!check.ok) return { kind: "fail" as const, failed: user.failedMfaCount };
      await tx.update(users).set({ totpLastStep: check.step, failedMfaCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
      await audit(tx, { category: "security", action: "auth.mfa_ok", entityType: "user", entityId: user.id, actorId: user.id, ip });
      return { kind: "ok" as const };
    }

    // S04: cod de recuperare, de unică folosință.
    const candidates = await tx.select().from(recoveryCodes).where(and(eq(recoveryCodes.userId, user.id), isNull(recoveryCodes.usedAt)));
    const normalized = normalizeRecoveryCode(input);
    for (const c of candidates) {
      if (await verifySecret(c.codeHash, normalized)) {
        await tx.update(recoveryCodes).set({ usedAt: new Date() }).where(eq(recoveryCodes.id, c.id));
        await tx.update(users).set({ failedMfaCount: 0, lockedUntil: null }).where(eq(users.id, user.id));
        await audit(tx, { category: "security", action: "auth.recovery_used", entityType: "user", entityId: user.id, actorId: user.id, ip });
        return { kind: "ok" as const };
      }
    }
    return { kind: "fail" as const, failed: user.failedMfaCount };
  });

  if (result.kind === "locked") return { error: lockedMessage(result.until) };
  if (result.kind === "fail") return { error: await failCode(s.user.id, result.failed, ip) };
  await promoteToActive(s.user.id);
  redirect("/registry");
}

export async function logout() {
  const s = await getSession();
  if (s) await audit(db, { category: "security", action: "auth.logout", entityType: "user", entityId: s.user.id, actorId: s.user.id, ip: await clientIp() });
  await endSession();
  redirect("/login");
}
