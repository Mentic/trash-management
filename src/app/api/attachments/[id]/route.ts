// R02, R07 — descărcarea unei anexe, cu același control de acces ca fișa (404 în afara scopului).
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { attachments, documents } from "@/db/schema";
import { getSession } from "@/server/auth/session";
import { readStoredFile } from "@/storage/files";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s || s.session.stage !== "active") return new Response("Neautentificat", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Nu există", { status: 404 });
  const [row] = await db.select({ a: attachments, assigneeId: documents.assigneeId }).from(attachments)
    .leftJoin(documents, eq(documents.id, attachments.documentId)).where(eq(attachments.id, id));
  if (!row) return new Response("Nu există", { status: 404 });
  const officerScoped = s.user.role === "officer";
  if (officerScoped && row.a.documentId && row.assigneeId !== s.user.id) return new Response("Nu există", { status: 404 });
  const bytes = await readStoredFile(row.a.storageKey);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": row.a.mimeType,
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.a.fileName)}`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
