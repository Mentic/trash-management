// S07 — sesiuni în baza de date, cookie opac; expirare la 30 min de inactivitate, maximum 12 h.
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions, users } from "@/db/schema";
import { newToken, sessionIdFor } from "./crypto";

export const IDLE_MINUTES = 30;
const PENDING_MINUTES = 10;
const COOKIE = "adi_session";

export type Stage = "password_ok" | "enrolling" | "active";

async function isHttps() {
  const h = await headers();
  return h.get("x-forwarded-proto") === "https";
}

export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip");
  return ip && /^[0-9a-fA-F:.]+$/.test(ip) ? ip : null;
}

export async function startSession(userId: string, stage: Stage) {
  const token = newToken();
  const now = new Date();
  const minutes = stage === "active" ? IDLE_MINUTES : PENDING_MINUTES;
  const h = await headers();
  await db.insert(sessions).values({
    id: sessionIdFor(token),
    userId,
    stage,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + minutes * 60_000),
    ip: await clientIp(),
    userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
  });
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: await isHttps(),
    sameSite: "lax",
    path: "/",
    maxAge: 12 * 3600,
  });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const id = sessionIdFor(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date())));
  if (!row) return null;
  if (row.session.stage === "active" && Date.now() - row.session.lastSeenAt.getTime() > 60_000) {
    const now = new Date();
    await db
      .update(sessions)
      .set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + IDLE_MINUTES * 60_000) })
      .where(eq(sessions.id, id));
  }
  return row;
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sessionIdFor(token)));
  jar.delete(COOKIE);
}

/** După 2FA: sesiune nouă (anti-fixare), cea veche se șterge. */
export async function promoteToActive(userId: string) {
  await endSession();
  await startSession(userId, "active");
}
