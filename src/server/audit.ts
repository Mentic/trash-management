// N09, S08 — jurnal append-only; se scrie în aceeași tranzacție cu modificarea.
import { auditEvents } from "@/db/schema";
import type { Db, Tx } from "@/db/client";

export type AuditInput = typeof auditEvents.$inferInsert;

export async function audit(tx: Db | Tx, e: AuditInput) {
  await tx.insert(auditEvents).values(e);
}
