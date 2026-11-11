// Sec. 5.4 — pipeline-ul de import V1–V6 (D05, D06), funcție pură.
// Ordinea: V1 (respins) → V6 (respins) → V2 → V3, V4/V5 (semnalate).
import { CSV_DESTINATION, CSV_FRACTION, type Destination, type Fraction } from "../codes";
import { parseTonnesToKg } from "../quantity";

export const CSV_HEADER = [
  "perioada", "data_cantaririi", "nr_tichet", "nr_auto", "operator_cui", "uat_siruta", "ruta_comuna",
  "uat_ruta", "cod_ler", "fractie", "destinatie_tip", "instalatie_destinatie", "cantitate_raportata_t",
  "cantitate_tichet_t", "document_justificativ",
] as const;

const REQUIRED = [
  "perioada", "data_cantaririi", "nr_tichet", "nr_auto", "operator_cui", "ruta_comuna", "cod_ler",
  "fractie", "destinatie_tip", "instalatie_destinatie", "cantitate_raportata_t",
] as const;

export type RawRow = Record<string, string | undefined>;

export interface ParsedRow {
  lineNo: number;
  period: string; // AAAA-LL
  year: number;
  weighedAt: string; // AAAA-LL-ZZ HH:MM, ora României
  ticketNo: string;
  vehicleNo: string;
  operatorCui: string;
  uatSiruta: string | null;
  sharedRoute: boolean;
  routeSiruta: string[];
  lerCode: string;
  fraction: Fraction;
  destination: Destination;
  facility: string;
  reportedKg: number;
  ticketKg: number | null;
  supportingDoc: string | null;
}

export type Flag =
  | { rule: "V2"; duplicateKey: string }
  | { rule: "V3"; reportedKg: number; ticketKg: number }
  | { rule: "V4"; reason: "no_uat" | "shared_route" }
  | { rule: "V5"; siruta: string };

export type RowOutcome =
  | { kind: "rejected"; lineNo: number; ticketNo: string; rule: "V1" | "V6"; reasons: string[] }
  | { kind: "accepted"; row: ParsedRow; flags: Flag[] };

export interface ImportContext {
  memberSiruta: ReadonlySet<string>;
  /** UAT (SIRUTA) → anii cu aprobare anuală activă (V6). */
  approvedYears: ReadonlyMap<string, ReadonlySet<number>>;
  /** Cheile V2 deja în baza de date: operator_cui|nr_tichet|data_cantaririi. */
  existingKeys: ReadonlySet<string>;
  toleranceKg: number; // I08
}

export function missingHeaders(header: readonly string[]): string[] {
  return CSV_HEADER.filter((h) => !header.includes(h));
}

export const dupKey = (cui: string, ticket: string, weighedAt: string) => `${cui}|${ticket}|${weighedAt}`;

function checkFormat(raw: RawRow, lineNo: number): { row?: ParsedRow; reasons: string[] } {
  const v = (k: string) => (raw[k] ?? "").trim();
  const reasons: string[] = [];
  for (const k of REQUIRED) if (!v(k)) reasons.push(`${k}: câmp obligatoriu lipsă`);

  const period = v("perioada");
  if (period && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) reasons.push("perioada: format AAAA-LL");
  const weighedAt = v("data_cantaririi");
  if (weighedAt && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(weighedAt))
    reasons.push("data_cantaririi: format AAAA-LL-ZZ HH:MM");
  else if (weighedAt && period && !weighedAt.startsWith(period))
    reasons.push("data_cantaririi: în afara perioadei raportate");
  if (v("nr_tichet").length > 30) reasons.push("nr_tichet: maximum 30 de caractere");
  const cui = v("operator_cui");
  if (cui && !/^\d+$/.test(cui)) reasons.push("operator_cui: doar cifre, fără RO");
  const shared = v("ruta_comuna");
  if (shared && shared !== "Da" && shared !== "Nu") reasons.push("ruta_comuna: Da sau Nu");
  const route = v("uat_ruta");
  if (shared === "Da" && !/^\d+(\|\d+)+$/.test(route)) reasons.push("uat_ruta: coduri SIRUTA separate prin |");
  const ler = v("cod_ler");
  if (ler && !/^\d{2} \d{2} \d{2}$/.test(ler)) reasons.push("cod_ler: format NN NN NN");
  const fraction = CSV_FRACTION[v("fractie")];
  if (v("fractie") && !fraction) reasons.push("fractie: valoare în afara listei");
  const destination = CSV_DESTINATION[v("destinatie_tip")];
  if (v("destinatie_tip") && !destination) reasons.push("destinatie_tip: valoare în afara listei");
  const reportedKg = parseTonnesToKg(v("cantitate_raportata_t"));
  if (v("cantitate_raportata_t") && (reportedKg === null || reportedKg <= 0))
    reasons.push("cantitate_raportata_t: număr > 0, cel mult 3 zecimale, virgulă zecimală");
  const ticketKg = v("cantitate_tichet_t") ? parseTonnesToKg(v("cantitate_tichet_t")) : null;
  if (v("cantitate_tichet_t") && ticketKg === null)
    reasons.push("cantitate_tichet_t: cel mult 3 zecimale, virgulă zecimală");

  if (reasons.length) return { reasons };
  return {
    reasons,
    row: {
      lineNo,
      period,
      year: Number(period.slice(0, 4)),
      weighedAt,
      ticketNo: v("nr_tichet"),
      vehicleNo: v("nr_auto"),
      operatorCui: cui,
      uatSiruta: v("uat_siruta") || null,
      sharedRoute: shared === "Da",
      routeSiruta: shared === "Da" ? route.split("|") : [],
      lerCode: ler,
      fraction: fraction!,
      destination: destination!,
      facility: v("instalatie_destinatie"),
      reportedKg: reportedKg!,
      ticketKg,
      supportingDoc: v("document_justificativ") || null,
    },
  };
}

/** Evaluează rândurile unui fișier, în ordine. `lineNo` = linia din fișier (antetul este linia 1). */
export function evaluateImport(rows: readonly RawRow[], ctx: ImportContext): RowOutcome[] {
  const seen = new Set(ctx.existingKeys);
  return rows.map((raw, i): RowOutcome => {
    const lineNo = i + 2;
    const ticketNo = (raw.nr_tichet ?? "").trim();
    const { row, reasons } = checkFormat(raw, lineNo);
    if (!row) return { kind: "rejected", lineNo, ticketNo, rule: "V1", reasons };

    const uats = row.uatSiruta ? [row.uatSiruta] : row.routeSiruta;
    if (uats.some((s) => ctx.approvedYears.get(s)?.has(row.year)))
      return { kind: "rejected", lineNo, ticketNo, rule: "V6", reasons: [`anul ${row.year} este aprobat pentru UAT`] };

    const flags: Flag[] = [];
    const key = dupKey(row.operatorCui, row.ticketNo, row.weighedAt);
    if (seen.has(key)) flags.push({ rule: "V2", duplicateKey: key });
    else seen.add(key);

    if (row.ticketKg !== null && Math.abs(row.reportedKg - row.ticketKg) > ctx.toleranceKg)
      flags.push({ rule: "V3", reportedKg: row.reportedKg, ticketKg: row.ticketKg });

    if (!row.uatSiruta || row.sharedRoute) flags.push({ rule: "V4", reason: row.sharedRoute ? "shared_route" : "no_uat" });
    else if (!ctx.memberSiruta.has(row.uatSiruta)) flags.push({ rule: "V5", siruta: row.uatSiruta });

    return { kind: "accepted", row, flags };
  });
}

export function summarize(outcomes: readonly RowOutcome[]) {
  const by = (rule: string) =>
    outcomes.filter((o) => (o.kind === "rejected" ? o.rule === rule : o.flags.some((f) => f.rule === rule)));
  return {
    total: outcomes.length,
    rejected: outcomes.filter((o) => o.kind === "rejected").length,
    flagged: outcomes.filter((o) => o.kind === "accepted" && o.flags.length > 0).length,
    clean: outcomes.filter((o) => o.kind === "accepted" && o.flags.length === 0).length,
    tickets: (rule: string) => by(rule).map((o) => (o.kind === "rejected" ? o.ticketNo : o.row.ticketNo)),
  };
}
