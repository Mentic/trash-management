// Multi-tenant: rezolvarea tenantului și citirile portalului. IZOLARE: pentru un cont de primărie, tenantul vine
// EXCLUSIV din sesiune (users.uat_id); parametrii din URL sunt ignorați. Personalul ADI poate previzualiza orice portal.
import "server-only";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { annualApprovals, documents, uats, users, wasteRows } from "@/db/schema";
import { can, type CurrentUser } from "@/server/auth/rbac";
import { DEFAULT_TENANT_COLOR, townHallName } from "@/domain/tenants";

export type Tenant = typeof uats.$inferSelect & { townHall: string; color: string };

const withDerived = (u: typeof uats.$inferSelect): Tenant => ({ ...u, townHall: townHallName(u.name), color: u.brandColor ?? DEFAULT_TENANT_COLOR });

export async function tenantBySlug(slug: string): Promise<Tenant | null> {
  const [u] = await db.select().from(uats).where(eq(uats.slug, slug));
  return u ? withDerived(u) : null;
}

export async function tenantById(id: string): Promise<Tenant | null> {
  const [u] = await db.select().from(uats).where(eq(uats.id, id));
  return u ? withDerived(u) : null;
}

export const allTenants = async () => (await db.select().from(uats).orderBy(asc(uats.name))).map(withDerived);

/** Tenantul pe care îl poate vedea utilizatorul: primăria → a sa (din sesiune); ADI → cel cerut (previzualizare). */
export async function resolveTenant(user: CurrentUser, requestedSlug?: string): Promise<{ tenant: Tenant; preview: boolean }> {
  if (user.role === "mayor") {
    const t = user.uatId ? await tenantById(user.uatId) : null;
    if (!t) notFound();
    return { tenant: t, preview: false };
  }
  if (!can(user.role, "portal.preview") || !requestedSlug) notFound();
  const t = await tenantBySlug(requestedSlug);
  if (!t) notFound();
  return { tenant: t, preview: true };
}

const kg = sql<number>`coalesce(sum(${wasteRows.reportedKg}), 0)::bigint`.mapWith(Number);
const VALIDATED = ["validated", "approved"] as const;

export async function portalData(t: Tenant, year: number) {
  const [months, docs, approvals, accounts] = await Promise.all([
    db.select({ period: sql<string>`to_char(${wasteRows.period}, 'YYYY-MM')`, kg })
      .from(wasteRows).where(and(eq(wasteRows.uatId, t.id), eq(wasteRows.year, year), inArray(wasteRows.status, [...VALIDATED])))
      .groupBy(wasteRows.period).orderBy(asc(wasteRows.period)),
    db.select({ id: documents.id, number: documents.number, year: documents.year, direction: documents.direction, status: documents.status,
        registeredAt: documents.registeredAt, subject: documents.subject, externalRef: documents.externalRef })
      .from(documents).where(and(eq(documents.uatId, t.id), ne(documents.status, "draft")))
      .orderBy(desc(documents.year), desc(documents.number)).limit(50),
    db.select({ year: annualApprovals.year }).from(annualApprovals).where(and(eq(annualApprovals.uatId, t.id), isNull(annualApprovals.reopenedAt))),
    db.select({ username: users.username }).from(users).where(and(eq(users.uatId, t.id), eq(users.role, "mayor"))),
  ]);
  return { months, docs, approvedYears: new Set(approvals.map((a) => a.year)), accounts };
}
