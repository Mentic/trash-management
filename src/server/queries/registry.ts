// R07, R08 — lista registrului: aceeași interogare pentru ecran, căutare și export CSV (sec. 7, 9).
import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { documents, dossiers, users } from "@/db/schema";
import type { CurrentUser } from "@/server/auth/rbac";
import { can } from "@/server/auth/rbac";
import { DOC_STATUSES, DIRECTIONS, type DocStatus } from "@/domain/codes";
import { todayIso } from "@/lib/format";

/** R07 — filtrul pe rând: Mihai vede doar lucrările repartizate lui. */
export function scopeDocuments(user: CurrentUser): SQL | undefined {
  return can(user.role, "registry.read_all") ? undefined : eq(documents.assigneeId, user.id);
}

export const OPEN_FOR_DEADLINE: DocStatus[] = ["registered", "assigned", "drafting", "in_approval", "approved"];

export interface RegistryFilters {
  q?: string; direction?: string; status?: string; assignee?: string; deadline?: string; dossier?: string; page?: string;
}

function where(user: CurrentUser, f: RegistryFilters): SQL | undefined {
  const parts: (SQL | undefined)[] = [scopeDocuments(user)];
  if (!can(user.role, "document.create")) parts.push(sql`${documents.status} <> 'draft'`);
  const q = f.q?.trim();
  if (q) {
    const num = /^(\d+)(?:\/(\d{4}))?$/.exec(q);
    const like = `%${q}%`;
    parts.push(or(
      num ? and(eq(documents.number, Number(num[1])), num[2] ? eq(documents.year, Number(num[2])) : undefined) : undefined,
      ilike(documents.externalRef, like), ilike(documents.subject, like), ilike(documents.correspondentName, like),
      // R7: căutarea după numărul extern găsește și răspunsul legat de intrare
      sql`exists (select 1 from documents d2 where d2.id = ${documents.linkedDocumentId} and d2.external_ref ilike ${like})`,
    ));
  }
  if (f.direction && (DIRECTIONS as readonly string[]).includes(f.direction)) parts.push(eq(documents.direction, f.direction as never));
  if (f.status && (DOC_STATUSES as readonly string[]).includes(f.status)) parts.push(eq(documents.status, f.status as never));
  if (f.assignee === "none") parts.push(isNull(documents.assigneeId));
  else if (f.assignee) parts.push(eq(documents.assigneeId, f.assignee));
  if (f.dossier) parts.push(eq(documents.dossierId, f.dossier));
  const today = todayIso();
  if (f.deadline === "overdue")
    parts.push(and(inArray(documents.status, OPEN_FOR_DEADLINE), sql`${documents.deadline} < ${today}::date`));
  if (f.deadline === "near")
    parts.push(and(inArray(documents.status, OPEN_FOR_DEADLINE), sql`${documents.deadline} between ${today}::date and ${today}::date + 5`));
  if (f.deadline === "none") parts.push(isNull(documents.deadline));
  return and(...parts);
}

const assignee = alias(users, "assignee");

export async function listDocuments(user: CurrentUser, f: RegistryFilters, opts: { all?: boolean } = {}) {
  const page = Math.max(1, Number(f.page) || 1);
  const w = where(user, f);
  const base = db
    .select({
      id: documents.id, year: documents.year, number: documents.number, direction: documents.direction, status: documents.status,
      registeredAt: documents.registeredAt, correspondentName: documents.correspondentName, externalRef: documents.externalRef,
      subject: documents.subject, requestType: documents.requestType, deadline: documents.deadline,
      assigneeName: assignee.displayName, dossierCode: dossiers.code, createdAt: documents.createdAt,
    })
    .from(documents)
    .leftJoin(assignee, eq(assignee.id, documents.assigneeId))
    .leftJoin(dossiers, eq(dossiers.id, documents.dossierId))
    .where(w)
    .orderBy(sql`${documents.number} is not null`, desc(documents.year), desc(documents.number), desc(documents.createdAt));
  const rows = opts.all ? await base : await base.limit(50).offset((page - 1) * 50);
  const [{ n } = { n: 0 }] = await db.select({ n: sql<number>`count(*)::int` }).from(documents).where(w);
  return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / 50)) };
}

export const officers = () =>
  db.select({ id: users.id, name: users.displayName }).from(users).where(eq(users.role, "officer")).orderBy(asc(users.displayName));
export const allDossiers = () => db.select().from(dossiers).orderBy(asc(dossiers.code));

