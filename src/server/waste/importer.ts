// D05, D06 — importul unui CSV: verificări pe fișier, V1–V6 (domain), scriere într-o tranzacție (sec. 5.4, 9).
import "server-only";
import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db, type Tx } from "@/db/client";
import { annualApprovals, documents, facilities, importRejections, imports, uats, wasteFlags, wasteRowRouteUats, wasteRows } from "@/db/schema";
import { dupKey, evaluateImport, missingHeaders, summarize, type RawRow } from "@/domain/waste/importRules";
import { parseLocalDateTime } from "@/lib/format";
import { audit } from "@/server/audit";
import type { CurrentUser } from "@/server/auth/rbac";

export class ImportError extends Error {}
export const MAX_ROWS = 10_000;

export async function runImport(user: CurrentUser, documentId: string, fileName: string, bytes: Buffer): Promise<string> {
  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));
  if (!doc || doc.direction !== "incoming" || doc.number === null || doc.status === "cancelled")
    throw new ImportError("Alegeți intrarea din registratură a raportului operatorului (D05).");
  if (bytes.length > 10 * 1024 * 1024) throw new ImportError("Fișierul depășește 10 MB.");

  let table: string[][];
  try {
    table = parse(bytes, { delimiter: ";", bom: true, trim: true, skip_empty_lines: true, relax_column_count: true }) as string[][];
  } catch {
    throw new ImportError("Fișierul nu poate fi citit ca CSV UTF-8 cu separator „;” (I10).");
  }
  const [header = [], ...body] = table;
  const missing = missingHeaders(header);
  if (missing.length) throw new ImportError(`Antet incomplet. Lipsesc coloanele: ${missing.join(", ")}.`);
  if (body.length === 0) throw new ImportError("Fișierul nu conține rânduri.");
  if (body.length > MAX_ROWS) throw new ImportError(`Fișierul are ${body.length} rânduri; maximum ${MAX_ROWS}.`);
  const rows: RawRow[] = body.map((cells) => Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""])));

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext('waste_import'))`);
    const uatRows = await tx.select().from(uats);
    const uatId = new Map(uatRows.map((u) => [u.siruta, u.id]));
    const approvals = await tx.select({ siruta: uats.siruta, year: annualApprovals.year }).from(annualApprovals)
      .innerJoin(uats, eq(uats.id, annualApprovals.uatId)).where(isNull(annualApprovals.reopenedAt));
    const approvedYears = new Map<string, Set<number>>();
    for (const a of approvals) approvedYears.set(a.siruta, (approvedYears.get(a.siruta) ?? new Set()).add(a.year));
    const periods = [...new Set(rows.map((r) => r.perioada).filter((p): p is string => /^\d{4}-\d{2}$/.test(p ?? "")).map((p) => `${p}-01`))];
    const existing = periods.length
      ? await tx.select({
          id: wasteRows.id, cui: wasteRows.operatorCui, ticket: wasteRows.ticketNo,
          at: sql<string>`to_char(${wasteRows.weighedAt} at time zone 'Europe/Bucharest', 'YYYY-MM-DD HH24:MI')`,
        }).from(wasteRows).where(inArray(wasteRows.period, periods))
      : [];
    const existingId = new Map(existing.map((e) => [dupKey(e.cui, e.ticket, e.at), e.id]));

    const outcomes = evaluateImport(rows, { memberSiruta: new Set(uatId.keys()), approvedYears, existingKeys: new Set(existingId.keys()), toleranceKg: 20 });
    const sum = summarize(outcomes);
    const [imp] = await tx.insert(imports).values({
      documentId, fileName, sha256: createHash("sha256").update(bytes).digest("hex"), uploadedBy: user.id,
      totalRows: sum.total, rejectedRows: sum.rejected, flaggedRows: sum.flagged, cleanRows: sum.clean,
    }).returning();

    const facilityId = new Map((await tx.select().from(facilities)).map((f) => [f.name, f.id]));
    const insertedByKey = new Map<string, string>();
    for (const o of outcomes) {
      if (o.kind === "rejected") {
        await tx.insert(importRejections).values({ importId: imp!.id, lineNo: o.lineNo, rule: o.rule, ticketNo: o.ticketNo || null, reasons: o.reasons, raw: rows[o.lineNo - 2]! });
        continue;
      }
      const r = o.row;
      let fac = facilityId.get(r.facility);
      if (!fac) {
        const [f] = await tx.insert(facilities).values({ name: r.facility, destinationType: r.destination }).returning();
        fac = f!.id;
        facilityId.set(r.facility, fac);
      }
      const attributed = !r.sharedRoute && r.uatSiruta ? uatId.get(r.uatSiruta) ?? null : null;
      const [row] = await tx.insert(wasteRows).values({
        importId: imp!.id, lineNo: r.lineNo, period: `${r.period}-01`, weighedAt: parseLocalDateTime(r.weighedAt), ticketNo: r.ticketNo,
        vehicleNo: r.vehicleNo, operatorCui: r.operatorCui, uatId: attributed, sharedRoute: r.sharedRoute, lerCode: r.lerCode,
        fraction: r.fraction, destinationType: r.destination, facilityId: fac, reportedKg: r.reportedKg, ticketKg: r.ticketKg,
        supportingDoc: r.supportingDoc, status: o.flags.length ? "flagged" : "imported",
      }).returning({ id: wasteRows.id });
      const key = dupKey(r.operatorCui, r.ticketNo, r.weighedAt);
      const firstInFile = insertedByKey.get(key);
      if (!firstInFile) insertedByKey.set(key, row!.id);
      for (const s of r.routeSiruta) {
        const id = uatId.get(s);
        if (id) await tx.insert(wasteRowRouteUats).values({ rowId: row!.id, uatId: id }).onConflictDoNothing();
      }
      for (const f of o.flags) {
        await tx.insert(wasteFlags).values({
          rowId: row!.id, rule: f.rule, details: f,
          duplicateOf: f.rule === "V2" ? existingId.get(key) ?? firstInFile ?? null : null,
        });
      }
    }
    await audit(tx, {
      category: "waste", action: "waste.import", entityType: "import", entityId: imp!.id, actorId: user.id,
      newValues: { fisier: fileName, intrare: `${doc.number}/${doc.year}`, total: sum.total, respinse: sum.rejected, semnalate: sum.flagged, curate: sum.clean },
    });
    return imp!.id;
  });
}

/** Re-verificarea V2–V4 a unui rând după corecție / atribuire (sec. 5.5). V5 dispare: UAT-ul atribuit e membru. */
export async function recheckRow(tx: Tx, rowId: string, toleranceKg = 20) {
  const [r] = await tx.select().from(wasteRows).where(eq(wasteRows.id, rowId));
  if (!r) return [];
  const rules: { rule: "V2" | "V3" | "V4" | "V5"; details: unknown; duplicateOf?: string }[] = [];
  const [dup] = await tx.select({ id: wasteRows.id }).from(wasteRows).where(and(
    eq(wasteRows.operatorCui, r.operatorCui), eq(wasteRows.ticketNo, r.ticketNo), eq(wasteRows.weighedAt, r.weighedAt),
    sql`${wasteRows.id} <> ${r.id}`, sql`${wasteRows.status} <> 'excluded'`,
    sql`(${wasteRows.createdAt} < ${r.createdAt.toISOString()}::timestamptz or (${wasteRows.importId} = ${r.importId} and ${wasteRows.lineNo} < ${r.lineNo}))`,
  ));
  if (dup) rules.push({ rule: "V2", details: { rule: "V2" }, duplicateOf: dup.id });
  if (r.ticketKg !== null && Math.abs(r.reportedKg - r.ticketKg) > toleranceKg)
    rules.push({ rule: "V3", details: { rule: "V3", reportedKg: r.reportedKg, ticketKg: r.ticketKg } });
  if (!r.uatId) rules.push({ rule: "V4", details: { rule: "V4", reason: r.sharedRoute ? "shared_route" : "no_uat" } });
  return rules;
}
