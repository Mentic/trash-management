// Sec. 10 — documentele, istoricul, anexele, expedierile, cursele și aprobările 2025, cu datele mutate.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
  annualApprovals, attachments, auditEvents, dispatches, documents, dossiers, facilities, imports, operators, uats, users, wasteRows,
} from "@/db/schema";
import {
  CSV_DESTINATION, CSV_FRACTION, SEED_DIRECTION, SEED_DOC_STATUS, SEED_INTAKE_CHANNEL, SEED_REQUEST_TYPE, SEED_WASTE_STATUS,
  type DispatchChannel,
} from "@/domain/codes";
import { parseTonnesToKg } from "@/domain/quantity";
import { shiftDate, shiftPeriod, shiftWeighing } from "@/domain/seedShift";
import { localDateTime, MONTHS, parseLocalDateTime } from "@/lib/format";
import { demoPdf, storeFile } from "@/storage/files";

type AnyDb = PostgresJsDatabase<Record<string, unknown>>;
const SEED_DIR = path.join(process.cwd(), "seed");

interface SeedDoc {
  nr: number; an: number; numar: string; data_inregistrare: string; sens: string; tip_cerere: string;
  corespondent: string; adresa_corespondent?: string; nr_extern: string; obiect: string; canal: string;
  dosar: string | null; termen?: string | null; anexe: { nume: string; dimensiune_kb: number }[];
  istoric: { data: string; utilizator: string; actiune: string; detalii: string }[];
  responsabil?: string; legat_de?: string; stare: string;
}

const DISPATCH: Record<string, DispatchChannel> = { "e-mail": "email", "poștă": "post", curier: "courier", "predare directă": "hand_delivery" };

export async function loadFull(db: AnyDb, shift: { dayShift: number; monthShift: number }) {
  const docs = JSON.parse(readFileSync(path.join(SEED_DIR, "documente_2026.json"), "utf-8")) as SeedDoc[];
  const userRows = await db.select().from(users);
  const uid = (u: string) => userRows.find((x) => x.username === u)?.id ?? null;
  const ana = uid("ana.registrator")!;
  const elena = uid("elena.director")!;
  const dossierRows = await db.select().from(dossiers);
  const dossierId = (c: string | null) => (c ? dossierRows.find((d) => d.code === c)?.id ?? null : null);
  const d = (iso: string) => shiftDate(iso, shift.dayShift);

  // ── Documente
  const idByNumber = new Map<string, string>();
  for (const s of docs) {
    const filed = s.istoric.find((h) => h.actiune === "clasat" || h.actiune === "clasat_fara_raspuns");
    const cancelled = s.istoric.find((h) => h.actiune === "anulat");
    const reg = d(s.data_inregistrare);
    const [row] = await db.insert(documents).values({
      year: Number(reg.slice(0, 4)),
      number: s.nr,
      direction: SEED_DIRECTION[s.sens]!,
      status: SEED_DOC_STATUS[s.stare]!,
      registeredAt: localDateTime(reg, 9, 0 + Math.min(s.nr, 59)),
      correspondentName: s.corespondent,
      correspondentAddress: s.adresa_corespondent ?? null,
      externalRef: s.nr_extern || null,
      subject: s.obiect,
      requestType: SEED_REQUEST_TYPE[s.tip_cerere]!,
      intakeChannel: SEED_INTAKE_CHANNEL[s.canal] ?? null,
      deadline: s.termen ? d(s.termen) : null,
      assigneeId: s.responsabil ? uid(s.responsabil) : null,
      dossierId: dossierId(s.dosar),
      filedAt: filed ? localDateTime(d(filed.data), 15, 0) : null,
      cancelReason: cancelled ? cancelled.detalii || "Înregistrare anulată" : null,
      createdBy: ana,
    }).returning({ id: documents.id });
    idByNumber.set(s.numar, row!.id);
  }

  for (const s of docs) {
    const id = idByNumber.get(s.numar)!;
    if (s.legat_de) await db.update(documents).set({ linkedDocumentId: idByNumber.get(s.legat_de)! }).where(eq(documents.id, id));

    // Istoric → jurnal (R02, N09)
    await db.insert(auditEvents).values(
      s.istoric.map((h, i) => ({
        occurredAt: localDateTime(d(h.data), 10, i * 5),
        actorId: uid(h.utilizator),
        category: "registry" as const,
        action: `document.${h.actiune}`,
        entityType: "document",
        entityId: id,
        newValues: h.detalii ? { detalii: h.detalii } : null,
        reason: h.actiune === "returnat" || h.actiune === "anulat" ? h.detalii : null,
      })),
    );

    // Expediere (R09) pe documentul de ieșire
    const sent = s.istoric.find((h) => h.actiune === "expediat");
    if (sent && s.sens === "iesire") {
      const m = /canal: ([^;]+); dovadă: (.+)$/.exec(sent.detalii);
      await db.insert(dispatches).values({
        documentId: id,
        channel: DISPATCH[m?.[1]?.trim() ?? ""] ?? "email",
        dispatchedOn: d(sent.data),
        proofRef: m?.[2]?.trim() ?? "confirmare simulată",
      });
    }

    // Anexe fictive (PDF real, SHA-256 real)
    for (const a of s.anexe) {
      const bytes = demoPdf(`${s.numar} - ${a.nume}`);
      const { sha256, storageKey } = await storeFile(bytes);
      await db.insert(attachments).values({
        documentId: id, fileName: a.nume, mimeType: "application/pdf", sizeBytes: bytes.length, sha256, storageKey,
        uploadedBy: ana, uploadedAt: localDateTime(d(s.data_inregistrare), 9, 30),
      });
    }
  }

  // ── Curse de deșeuri (5.321): un import pe lună; ianuarie–septembrie 2026 legate de rapoartele operatorului
  const raw = parse(readFileSync(path.join(SEED_DIR, "seed_deseuri_2025_2026-09.csv")), {
    delimiter: ";", bom: true, columns: true, trim: true,
  }) as Record<string, string>[];
  const uatRows = await db.select().from(uats);
  const uatId = new Map(uatRows.map((u) => [u.siruta, u.id]));
  const [op] = await db.select().from(operators);
  const facilityId = new Map<string, string>();
  for (const r of raw) {
    if (facilityId.has(r.instalatie_destinatie!)) continue;
    const [f] = await db.insert(facilities).values({ name: r.instalatie_destinatie!, destinationType: CSV_DESTINATION[r.destinatie_tip!]! }).returning();
    facilityId.set(f!.name, f!.id);
  }
  void op;

  const byPeriod = new Map<string, Record<string, string>[]>();
  for (const r of raw) {
    const p = r.perioada!;
    if (!byPeriod.has(p)) byPeriod.set(p, []);
    byPeriod.get(p)!.push(r);
  }
  const reportFor = (period: string) => {
    const [y, m] = period.split("-");
    const name = `${MONTHS[Number(m) - 1]} ${y}`;
    const s = docs.find((x) => x.tip_cerere === "raport_operator" && x.obiect.endsWith(name));
    return s ? idByNumber.get(s.numar)! : null;
  };

  for (const [period, rows] of byPeriod) {
    const docId = reportFor(period);
    const shiftedPeriod = shiftPeriod(period, shift.monthShift);
    const [imp] = await db.insert(imports).values({
      documentId: docId, fileName: `raport_operator_${period}.csv`, sha256: "0".repeat(64), uploadedBy: uid("mihai.responsabil")!,
      uploadedAt: localDateTime(`${shiftedPeriod}-28`, 12, 0), totalRows: rows.length, rejectedRows: 0, flaggedRows: 0,
      cleanRows: rows.length, isSeed: docId === null,
    }).returning();
    const values = rows.map((r, i) => ({
      importId: imp!.id,
      lineNo: i + 2,
      period: `${shiftedPeriod}-01`,
      weighedAt: parseLocalDateTime(shiftWeighing(r.data_cantaririi!, shift.monthShift)),
      ticketNo: r.nr_tichet!,
      vehicleNo: r.nr_auto!,
      operatorCui: r.operator_cui!,
      uatId: uatId.get(r.uat_siruta!) ?? null,
      sharedRoute: r.ruta_comuna === "Da",
      lerCode: r.cod_ler!,
      fraction: CSV_FRACTION[r.fractie!]!,
      destinationType: CSV_DESTINATION[r.destinatie_tip!]!,
      facilityId: facilityId.get(r.instalatie_destinatie!)!,
      reportedKg: parseTonnesToKg(r.cantitate_raportata_t!)!,
      ticketKg: r.cantitate_tichet_t ? parseTonnesToKg(r.cantitate_tichet_t) : null,
      supportingDoc: r.document_justificativ || null,
      status: SEED_WASTE_STATUS[r.stare!]!,
    }));
    for (let i = 0; i < values.length; i += 500) await db.insert(wasteRows).values(values.slice(i, i + 500));
  }

  // ── Aprobări anuale (D07): anul aprobat din setul demo, pentru fiecare UAT
  const approvedYear = Number(shiftPeriod("2025-12", shift.monthShift).slice(0, 4));
  for (const u of uatRows) {
    const total = raw
      .filter((r) => r.uat_siruta === u.siruta && r.stare === "aprobat")
      .reduce((s, r) => s + parseTonnesToKg(r.cantitate_raportata_t!)!, 0);
    await db.insert(annualApprovals).values({
      uatId: u.id, year: approvedYear, approvedTotalKg: total, approvedBy: elena, approvedAt: localDateTime(d("2026-01-20"), 11, 0),
    });
  }
}
