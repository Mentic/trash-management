import { describe, expect, it } from "vitest";
import { dupKey, evaluateImport, missingHeaders, summarize, CSV_HEADER, type ImportContext } from "@/domain/waste/importRules";
import { readCsv, readJson } from "./seed";

// Context construit ca în aplicație după încărcarea setului demo: 2025 aprobat pentru toate UAT-urile.
const uats = readJson<{ siruta_demo: string }[]>("uat.json").map((u) => u.siruta_demo);
const seedRows = readCsv("seed_deseuri_2025_2026-09.csv");
const ctx: ImportContext = {
  memberSiruta: new Set(uats),
  approvedYears: new Map(uats.map((s) => [s, new Set([2025])])),
  existingKeys: new Set(seedRows.map((r) => dupKey(r.operator_cui!, r.nr_tichet!, r.data_cantaririi!))),
  toleranceKg: 20,
};
const expected = readJson<Record<string, unknown>[]>("rezultate_asteptate_import.json");

describe("import V1–V6 pe fișierele setului demo (D2–D3)", () => {
  it("scenariu erori: 1 V1, 1 V2, 1 V3, 1 V4, 22 curate", () => {
    const e = expected[0]!;
    const s = summarize(evaluateImport(readCsv("import_2026-10_scenariu_erori.csv"), ctx));
    expect(s.total).toBe(e.randuri_total);
    expect(s.tickets("V1")).toEqual(e.respinse_V1);
    expect(s.tickets("V2")).toEqual(e.duplicat_V2);
    expect(s.tickets("V3")).toEqual(e.diferenta_V3);
    expect(s.tickets("V4")).toEqual(e.neatribuit_V4);
    expect(s.clean).toBe(e.importate_fara_semnalari);
  });

  it("V5 și V6", () => {
    const e = expected[1]!;
    const s = summarize(evaluateImport(readCsv("import_2026-10_test_V5_V6.csv"), ctx));
    expect(s.tickets("V5")).toEqual(e.uat_necunoscut_V5);
    expect(s.tickets("V6")).toEqual(e.respinse_V6);
    expect(s.clean).toBe(e.importate_fara_semnalari);
  });

  it("fișierul curat nu are semnalări", () => {
    const s = summarize(evaluateImport(readCsv("import_2026-10_restul_uat_curat.csv"), ctx));
    expect(s.total).toBe(220);
    expect(s.clean).toBe(220);
  });

  it("antetul complet este acceptat", () => {
    expect(missingHeaders([...CSV_HEADER, "extra"])).toEqual([]);
    expect(missingHeaders(CSV_HEADER.slice(1))).toEqual(["perioada"]);
  });
});

describe("reguli individuale", () => {
  const base = readCsv("import_2026-10_restul_uat_curat.csv")[0]!;
  const one = (patch: Record<string, string>) => evaluateImport([{ ...base, ...patch }], { ...ctx, existingKeys: new Set() })[0]!;

  it("V1 adună toate motivele", () => {
    const o = one({ cod_ler: "200301", cantitate_raportata_t: "0" });
    expect(o.kind).toBe("rejected");
    if (o.kind === "rejected") expect(o.reasons).toHaveLength(2);
  });
  it("V1 refuză punctul zecimal și 4 zecimale", () => {
    expect(one({ cantitate_raportata_t: "7.240" }).kind).toBe("rejected");
    expect(one({ cantitate_raportata_t: "7,2401" }).kind).toBe("rejected");
  });
  it("V1 refuză o cântărire în afara perioadei", () => {
    expect(one({ data_cantaririi: "2026-11-01 07:00" }).kind).toBe("rejected");
  });
  it("V3: 20 kg nu se semnalează, 21 kg da", () => {
    const flags = (t: string) => {
      const o = one({ cantitate_raportata_t: "1,000", cantitate_tichet_t: t });
      return o.kind === "accepted" ? o.flags.map((f) => f.rule) : [];
    };
    expect(flags("1,020")).toEqual([]);
    expect(flags("1,021")).toEqual(["V3"]);
  });
  it("V3 și V4 pe același rând; V5 doar fără V4", () => {
    const o = one({ uat_siruta: "", ruta_comuna: "Da", uat_ruta: "900004|900006", cantitate_tichet_t: "9,999" });
    expect(o.kind === "accepted" && o.flags.map((f) => f.rule)).toEqual(["V3", "V4"]);
  });
  it("V6 înaintea lui V2", () => {
    const row = { ...base, perioada: "2025-10", data_cantaririi: "2025-10-01 06:20" };
    const o = evaluateImport([row, row], ctx);
    expect(o.map((x) => (x.kind === "rejected" ? x.rule : "ok"))).toEqual(["V6", "V6"]);
  });
});
