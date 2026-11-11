// Cantitățile se stochează în kilograme întregi (sec. 2): 0,020 t = 20 kg, fără virgulă mobilă.

const TONNES_RE = /^\d+(,\d{1,3})?$/;

/** „7,240” → 7240 kg. Întoarce null dacă formatul nu respectă dicționarul (I10). */
export function parseTonnesToKg(value: string): number | null {
  const v = value.trim();
  if (!TONNES_RE.test(v)) return null;
  const [whole, frac = ""] = v.split(",");
  return Number(whole) * 1000 + Number(frac.padEnd(3, "0"));
}

/** 7240 → „7,240” (fără separator de mii, pentru CSV — N04). */
export function formatKgAsTonnes(kg: number): string {
  const sign = kg < 0 ? "-" : "";
  const abs = Math.abs(Math.round(kg));
  return `${sign}${Math.floor(abs / 1000)},${String(abs % 1000).padStart(3, "0")}`;
}
