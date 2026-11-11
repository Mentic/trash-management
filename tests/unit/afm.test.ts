import { describe, expect, it } from "vitest";
import { estimateAfm, estimateAfmUnorganized, DEMO_ELIGIBLE } from "@/domain/waste/afm";
import { CSV_DESTINATION } from "@/domain/codes";
import { parseTonnesToKg } from "@/domain/quantity";
import { readCsv } from "./seed";

describe("estimare AFM (D03)", () => {
  it("exemplul din BRD: 120 t, 45 t, p = 45% → 450 lei", () => {
    expect(estimateAfm({ qmunKg: 120_000, qvalKg: 45_000, annex6Pct: 45, rateLeiPerT: 50 }).contributionLei).toBe(450);
  });

  it("nu scade sub zero", () => {
    expect(estimateAfm({ qmunKg: 100_000, qvalKg: 90_000, annex6Pct: 45, rateLeiPerT: 50 }).contributionLei).toBe(0);
  });

  it("I11: UAT fără serviciu organizat", () => {
    expect(estimateAfmUnorganized(1000, "rural", { urban: 233, rural: 105 }, 50).contributionLei).toBe(5250);
  });

  it("oracolul 2025 din setul demo, pentru toate cele 7 UAT-uri (D7)", () => {
    const oracle: Record<string, number> = {
      "900001": 93793, "900002": 33518, "900003": 22758, "900004": 14923,
      "900005": 13868, "900006": 8216, "900007": 3745,
    };
    const qmun = new Map<string, number>();
    const qval = new Map<string, number>();
    for (const r of readCsv("seed_deseuri_2025_2026-09.csv")) {
      if (!r.perioada!.startsWith("2025") || r.stare !== "aprobat") continue;
      const kg = parseTonnesToKg(r.cantitate_raportata_t!)!;
      const s = r.uat_siruta!;
      qmun.set(s, (qmun.get(s) ?? 0) + kg);
      if (DEMO_ELIGIBLE.includes(CSV_DESTINATION[r.destinatie_tip!]!)) qval.set(s, (qval.get(s) ?? 0) + kg);
    }
    for (const [s, lei] of Object.entries(oracle)) {
      const res = estimateAfm({ qmunKg: qmun.get(s)!, qvalKg: qval.get(s) ?? 0, annex6Pct: 45, rateLeiPerT: 50 });
      expect(res.contributionLei, s).toBe(lei);
    }
  });
});
