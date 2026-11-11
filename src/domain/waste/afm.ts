// D03 — estimarea contribuției AFM (sec. 5.6). Calcule în kg; rotunjire o singură dată, la leu (Q3).
import type { Destination } from "../codes";

export const DEMO_ELIGIBLE: readonly Destination[] = ["sorting", "recycling", "composting", "other_recovery"]; // I12

export interface AfmInput {
  qmunKg: number;
  qvalKg: number;
  annex6Pct: number; // I05
  rateLeiPerT: number; // 50
}

export interface AfmResult {
  qobKg: number;
  gapKg: number;
  contributionLei: number;
}

export function estimateAfm({ qmunKg, qvalKg, annex6Pct, rateLeiPerT }: AfmInput): AfmResult {
  const qobKg = (annex6Pct / 100) * qmunKg;
  const gapKg = Math.max(0, qobKg - qvalKg);
  return { qobKg, gapKg, contributionLei: Math.round((gapKg * rateLeiPerT) / 1000) };
}

/** I11 — UAT fără serviciu organizat: contribuție pe întreaga cantitate estimată. */
export function estimateAfmUnorganized(population: number, environment: "urban" | "rural", kgPerCapita: { urban: number; rural: number }, rateLeiPerT: number) {
  const qestKg = population * kgPerCapita[environment];
  return { qestKg, contributionLei: Math.round((qestKg * rateLeiPerT) / 1000) };
}
