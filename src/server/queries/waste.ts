import "server-only";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { annualApprovals, annualParameters, documents, facilities, uats, wasteRows } from "@/db/schema";
import { DESTINATIONS, FRACTIONS } from "@/domain/codes";

export interface WasteFilters { year?: string; uat?: string; from?: string; to?: string; fraction?: string; destination?: string }

export const VALIDATED = ["validated", "approved"] as const;
export const UNVALIDATED = ["imported", "flagged", "corrected"] as const;

export function wasteWhere(f: WasteFilters, defaultYear: number): SQL | undefined {
  const year = Number(f.year) || defaultYear;
  const parts: (SQL | undefined)[] = [eq(wasteRows.year, year)];
  if (f.uat) parts.push(eq(wasteRows.uatId, f.uat));
  if (f.from && /^\d{2}$/.test(f.from)) parts.push(gte(wasteRows.period, `${year}-${f.from}-01`));
  if (f.to && /^\d{2}$/.test(f.to)) parts.push(lte(wasteRows.period, `${year}-${f.to}-01`));
  if (f.fraction && (FRACTIONS as readonly string[]).includes(f.fraction)) parts.push(eq(wasteRows.fraction, f.fraction as never));
  if (f.destination && (DESTINATIONS as readonly string[]).includes(f.destination)) parts.push(eq(wasteRows.destinationType, f.destination as never));
  return and(...parts);
}

const kg = sql<number>`coalesce(sum(${wasteRows.reportedKg}), 0)::bigint`.mapWith(Number);
const n = sql<number>`count(*)::int`;

/** D08 — totaluri doar din rânduri validate/aprobate; nevalidate, excluse și neatribuite separat. */
export async function summary(f: WasteFilters, defaultYear: number) {
  const w = wasteWhere(f, defaultYear);
  const [byUat, buckets, uatList] = await Promise.all([
    db.select({ uatId: wasteRows.uatId, kg, n }).from(wasteRows)
      .where(and(w, inArray(wasteRows.status, [...VALIDATED]), isNotNull(wasteRows.uatId))).groupBy(wasteRows.uatId),
    db.select({
      bucket: sql<string>`case when ${wasteRows.status} = 'excluded' then 'excluded' when ${wasteRows.uatId} is null then 'unassigned'
        when ${wasteRows.status} in ('imported','flagged','corrected') then 'unvalidated' else 'validated' end`, kg, n,
    }).from(wasteRows).where(w).groupBy(sql`1`),
    db.select().from(uats).orderBy(asc(uats.name)),
  ]);
  return { byUat, buckets: Object.fromEntries(buckets.map((b) => [b.bucket, b])), uatList };
}

export async function availableYears() {
  const rows = await db.selectDistinct({ y: wasteRows.year }).from(wasteRows).orderBy(desc(wasteRows.year));
  return rows.map((r) => r.y!).filter(Boolean);
}

export async function monthsForUat(uatId: string, f: WasteFilters, defaultYear: number) {
  return db.select({ period: sql<string>`to_char(${wasteRows.period}, 'YYYY-MM')`, kg, n }).from(wasteRows)
    .where(and(wasteWhere({ ...f, uat: uatId }, defaultYear), inArray(wasteRows.status, [...VALIDATED])))
    .groupBy(wasteRows.period).orderBy(asc(wasteRows.period));
}

export async function rowsList(where: SQL | undefined, limit = 500) {
  return db.select({
    id: wasteRows.id, ticketNo: wasteRows.ticketNo, weighedAt: wasteRows.weighedAt, period: wasteRows.period, uatName: uats.name,
    fraction: wasteRows.fraction, destination: wasteRows.destinationType, facility: facilities.name, reportedKg: wasteRows.reportedKg,
    ticketKg: wasteRows.ticketKg, status: wasteRows.status, lerCode: wasteRows.lerCode, lineNo: wasteRows.lineNo, sharedRoute: wasteRows.sharedRoute,
  }).from(wasteRows).leftJoin(uats, eq(uats.id, wasteRows.uatId)).leftJoin(facilities, eq(facilities.id, wasteRows.facilityId))
    .where(where).orderBy(asc(wasteRows.weighedAt)).limit(limit);
}

/** D03 — intrările estimării AFM pe UAT și an: Q_mun și Q_val din rânduri validate/aprobate. */
export async function afmInputs(year: number, eligible: readonly string[]) {
  const rows = await db.select({
    uatId: wasteRows.uatId,
    qmun: kg,
    qval: sql<number>`coalesce(sum(${wasteRows.reportedKg}) filter (where ${inArray(wasteRows.destinationType, eligible as never)}), 0)::bigint`.mapWith(Number),
  }).from(wasteRows).where(and(eq(wasteRows.year, year), inArray(wasteRows.status, [...VALIDATED]), isNotNull(wasteRows.uatId))).groupBy(wasteRows.uatId);
  const approved = await db.select({ uatId: annualApprovals.uatId }).from(annualApprovals).where(and(eq(annualApprovals.year, year), isNull(annualApprovals.reopenedAt)));
  const [params] = await db.select().from(annualParameters).where(eq(annualParameters.year, year));
  return { rows, approved: new Set(approved.map((a) => a.uatId)), params };
}

export async function operatorReports() {
  return db.select({ id: documents.id, number: documents.number, year: documents.year, subject: documents.subject, status: documents.status })
    .from(documents).where(and(eq(documents.direction, "incoming"), eq(documents.requestType, "operator_report"), isNotNull(documents.number), sql`${documents.status} <> 'cancelled'`))
    .orderBy(desc(documents.year), desc(documents.number));
}
