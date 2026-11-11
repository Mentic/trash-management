"use server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema";
import { getSession, IDLE_MINUTES } from "@/server/auth/session";

export async function touchSession() {
  const s = await getSession();
  if (!s || s.session.stage !== "active") return { ok: false };
  const now = new Date();
  await db.update(sessions).set({ lastSeenAt: now, expiresAt: new Date(now.getTime() + IDLE_MINUTES * 60_000) }).where(eq(sessions.id, s.session.id));
  return { ok: true };
}
