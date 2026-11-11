"use server";
// D05–D07 — acțiunile responsabilului pe import și pe rânduri (sec. 5.5, 7). Doar Mihai (officer).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, type Tx } from "@/db/client";
import { uats, wasteFlags, wasteRows } from "@/db/schema";
import { parseTonnesToKg } from "@/domain/quantity";
import { audit } from "@/server/audit";
import { requireUser, type CurrentUser } from "@/server/auth/rbac";
import { ImportError, recheckRow, runImport } from "@/server/waste/importer";
import type { ActionResult } from "@/components/ActionForm";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
class UserError extends Error {}

export async function importCsv(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("waste.import");
  const file = fd.get("file") as File | null;
  const documentId = str(fd, "documentId");
  if (!documentId) return { error: "Alegeți intrarea din registratură a raportului (D05)." };
  if (!file?.size) return { error: "Alegeți fișierul CSV." };
  let id: string;
  try {
    id = await runImport(user, documentId, file.name, Buffer.from(await file.arrayBuffer()));
  } catch (e) {
    if (e instanceof ImportError) return { error: e.message };
    throw e;
  }
  revalidatePath("/waste");
  redirect(`/waste/imports/${id}`);
}

async function rowAction(fd: FormData, ok: string, fn: (tx: Tx, user: CurrentUser, row: typeof wasteRows.$inferSelect, reason: string) => Promise<void>, needReason = true): Promise<ActionResult> {
  const user = await requireUser("waste.row.edit");
  const reason = str(fd, "reason");
  if (needReason && !reason) return { error: "Completați motivul." };
  let importId = "";
  try {
    await db.transaction(async (tx) => {
      const [row] = await tx.select().from(wasteRows).where(eq(wasteRows.id, str(fd, "rowId"))).for("update");
      if (!row) throw new UserError("Rândul nu există.");
      if (row.status === "approved") throw new UserError("Rândul face parte dintr-un an aprobat și nu se mai poate modifica (D07).");
      importId = row.importId;
      await fn(tx, user, row, reason);
    });
  } catch (e) {
    if (e instanceof UserError) return { error: e.message };
    throw e;
  }
  revalidatePath("/waste", "layout");
  redirect(`/waste/imports/${importId}?ok=${ok}`);
}

async function resolveOpenFlags(tx: Tx, user: CurrentUser, rowId: string, reason: string, keep: string[] = []) {
  const open = await tx.select().from(wasteFlags).where(and(eq(wasteFlags.rowId, rowId), isNull(wasteFlags.resolvedAt)));
  for (const f of open) if (!keep.includes(f.rule))
    await tx.update(wasteFlags).set({ resolvedAt: new Date(), resolvedBy: user.id, resolutionReason: reason }).where(eq(wasteFlags.id, f.id));
  return open.filter((f) => keep.includes(f.rule)).map((f) => f.rule);
}

/** Corectat → verificările se reiau: Importat sau Semnalat (5.5). */
async function recheckAndSet(tx: Tx, user: CurrentUser, row: typeof wasteRows.$inferSelect, reason: string, action: string, oldValues: unknown, newValues: unknown) {
  await tx.update(wasteRows).set({ status: "corrected", statusReason: reason, version: row.version + 1 }).where(eq(wasteRows.id, row.id));
  await audit(tx, { category: "waste", action, entityType: "waste_row", entityId: row.id, actorId: user.id, reason, oldValues, newValues });
  const rules = await recheckRow(tx, row.id);
  const stillOpen = await resolveOpenFlags(tx, user, row.id, reason, rules.map((r) => r.rule));
  for (const r of rules) if (!stillOpen.includes(r.rule))
    await tx.insert(wasteFlags).values({ rowId: row.id, rule: r.rule, details: r.details, duplicateOf: r.duplicateOf ?? null });
  await tx.update(wasteRows).set({ status: rules.length ? "flagged" : "imported" }).where(eq(wasteRows.id, row.id));
}

export async function correctRow(_: ActionResult, fd: FormData) {
  return rowAction(fd, "corrected", async (tx, user, row, reason) => {
    if (!["flagged", "validated", "imported"].includes(row.status)) throw new UserError("Rândul nu poate fi corectat în starea curentă.");
    const rep = parseTonnesToKg(str(fd, "reportedT"));
    const tic = str(fd, "ticketT") ? parseTonnesToKg(str(fd, "ticketT")) : null;
    if (rep === null || rep <= 0) throw new UserError("Cantitatea raportată: număr > 0 cu virgulă și cel mult 3 zecimale (ex. 0,537).");
    if (str(fd, "ticketT") && tic === null) throw new UserError("Cantitatea de pe tichet: cel mult 3 zecimale, cu virgulă.");
    await tx.update(wasteRows).set({ reportedKg: rep, ticketKg: tic }).where(eq(wasteRows.id, row.id));
    await recheckAndSet(tx, user, row, reason, "waste.row.corrected",
      { reportedKg: row.reportedKg, ticketKg: row.ticketKg }, { reportedKg: rep, ticketKg: tic });
  });
}

export async function assignRowUat(_: ActionResult, fd: FormData) {
  return rowAction(fd, "assigned", async (tx, user, row, reason) => {
    const evidence = str(fd, "evidenceRef");
    if (!evidence) throw new UserError("Rutele comune se atribuie doar pe bază de dovadă sau de regulă aprobată de director (I09).");
    const [u] = await tx.select().from(uats).where(eq(uats.id, str(fd, "uatId")));
    if (!u) throw new UserError("Alegeți UAT-ul.");
    await tx.update(wasteRows).set({ uatId: u.id, supportingDoc: evidence }).where(eq(wasteRows.id, row.id));
    await recheckAndSet(tx, user, row, reason, "waste.row.attributed", { uat: null }, { uat: u.name, dovada: evidence });
  });
}

export async function excludeRow(_: ActionResult, fd: FormData) {
  return rowAction(fd, "excluded", async (tx, user, row, reason) => {
    if (!["imported", "flagged"].includes(row.status)) throw new UserError("Doar rândurile importate sau semnalate se pot exclude.");
    await tx.update(wasteRows).set({ status: "excluded", statusReason: reason, version: row.version + 1 }).where(eq(wasteRows.id, row.id));
    await resolveOpenFlags(tx, user, row.id, reason);
    await audit(tx, { category: "waste", action: "waste.row.excluded", entityType: "waste_row", entityId: row.id, actorId: user.id, reason, oldValues: { status: row.status } });
  });
}

export async function reactivateRow(_: ActionResult, fd: FormData) {
  return rowAction(fd, "reactivated", async (tx, user, row, reason) => {
    if (row.status !== "excluded") throw new UserError("Rândul nu este exclus.");
    await recheckAndSet(tx, user, row, reason, "waste.row.reactivated", { status: "excluded" }, null);
  });
}

export async function validateRows(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const user = await requireUser("waste.row.edit");
  const importId = str(fd, "importId");
  const ids = fd.getAll("rowId").map(String).filter(Boolean);
  const where = ids.length ? and(inArray(wasteRows.id, ids), eq(wasteRows.status, "imported")) : and(eq(wasteRows.importId, importId), eq(wasteRows.status, "imported"));
  const done = await db.transaction(async (tx) => {
    const rows = await tx.update(wasteRows).set({ status: "validated" }).where(where).returning({ id: wasteRows.id });
    if (rows.length)
      await audit(tx, { category: "waste", action: "waste.rows.validated", entityType: "import", entityId: importId || null, actorId: user.id, newValues: { randuri: rows.length } });
    return rows.length;
  });
  if (!done) return { error: "Niciun rând curat de validat. Rândurile semnalate se rezolvă întâi." };
  revalidatePath("/waste", "layout");
  if (importId) redirect(`/waste/imports/${importId}?ok=validated&n=${done}`);
  return { ok: `${done} ${done === 1 ? "rând validat" : "rânduri validate"}.` };
}
