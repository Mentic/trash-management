// S02 — secretul de înrolare: generat la prima afișare a paginii /enrol, păstrat criptat în sesiune.
import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema";
import { newSecret } from "@/domain/totp";
import { decryptSecret, encryptSecret } from "./crypto";

export async function pendingSecretFor(sessionId: string): Promise<string> {
  await db
    .update(sessions)
    .set({ pendingTotpSecretEnc: encryptSecret(newSecret()) })
    .where(and(eq(sessions.id, sessionId), isNull(sessions.pendingTotpSecretEnc)));
  const [row] = await db.select({ enc: sessions.pendingTotpSecretEnc }).from(sessions).where(eq(sessions.id, sessionId));
  if (!row?.enc) throw new Error("sesiune de înrolare inexistentă");
  return decryptSecret(row.enc);
}
