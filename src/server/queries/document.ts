import "server-only";
import { asc, desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { attachments, auditEvents, dispatches, documents, dossiers, users } from "@/db/schema";
import { can, type CurrentUser } from "@/server/auth/rbac";

const assignee = alias(users, "assignee");

/** R07 — un document din afara scopului întoarce 404, ca existența lui să nu fie dezvăluită. */
export async function getDocument(user: CurrentUser, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db
    .select({ doc: documents, assigneeName: assignee.displayName, dossier: dossiers })
    .from(documents)
    .leftJoin(assignee, eq(assignee.id, documents.assigneeId))
    .leftJoin(dossiers, eq(dossiers.id, documents.dossierId))
    .where(eq(documents.id, id));
  if (!row) notFound();
  if (!can(user.role, "registry.read_all") && row.doc.assigneeId !== user.id) notFound();
  if (row.doc.status === "draft" && !can(user.role, "document.create")) notFound();

  const linked = row.doc.linkedDocumentId
    ? (await db.select().from(documents).where(eq(documents.id, row.doc.linkedDocumentId)))[0] ?? null
    : null;
  const ids = [row.doc.id, ...(linked ? [linked.id] : [])];
  const [files, sent, history] = await Promise.all([
    db.select().from(attachments).where(eq(attachments.documentId, row.doc.id)).orderBy(asc(attachments.uploadedAt)),
    db.select().from(dispatches).where(or(...ids.map((i) => eq(dispatches.documentId, i)))).orderBy(desc(dispatches.dispatchedOn)),
    db
      .select({ e: auditEvents, actor: users.displayName })
      .from(auditEvents)
      .leftJoin(users, eq(users.id, auditEvents.actorId))
      .where(eq(auditEvents.entityId, row.doc.id))
      .orderBy(asc(auditEvents.occurredAt), asc(auditEvents.id)),
  ]);
  const linkedVisible = linked && (can(user.role, "registry.read_all") || linked.assigneeId === user.id) ? linked : null;
  return { ...row, linked: linkedVisible, files, sent, history };
}
