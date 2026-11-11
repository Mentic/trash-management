// Multi-tenant: fiecare primărie (UAT membră) este un tenant cu portal propriu, date izolate și identitate vizuală.

/** Paletă tradițională (culori de broderie / ie), toate cu contrast ≥ 4,5:1 față de textul alb. */
export const TENANT_PALETTE = [
  { name: "Roșu vișiniu", hex: "#8c1c2c" },
  { name: "Verde de brad", hex: "#2e5e3a" },
  { name: "Albastru de cobalt", hex: "#2b4a7e" },
  { name: "Cărămiziu", hex: "#9a3b1b" },
  { name: "Verde-albăstrui", hex: "#1f5f5b" },
  { name: "Prun", hex: "#5e2a5a" },
  { name: "Ocru închis", hex: "#7a5410" },
] as const;

export const DEFAULT_TENANT_COLOR = TENANT_PALETTE[0].hex;

export function slugify(name: string): string {
  return name
    .replace(/^(Municipiul|Orașul|Comuna)\s+/i, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** „Primăria Comunei Berca” → „Comuna Berca” (numele UAT din nomenclator). */
export function uatNameFromTownHall(correspondent: string): string | null {
  const m = /^Primăria\s+(Municipiului|Orașului|Comunei)\s+(.+)$/.exec(correspondent.trim());
  if (!m) return null;
  const kind = { Municipiului: "Municipiul", Orașului: "Orașul", Comunei: "Comuna" }[m[1] as "Municipiului" | "Orașului" | "Comunei"];
  return `${kind} ${m[2]}`;
}

/** „Comuna Berca” → „Primăria Comunei Berca”. */
export function townHallName(uatName: string): string {
  return uatName.replace(/^Municipiul /, "Primăria Municipiului ").replace(/^Orașul /, "Primăria Orașului ").replace(/^Comuna /, "Primăria Comunei ");
}

/** Contrast WCAG între o culoare și alb (pentru validarea culorii alese de ADI). */
export function contrastWithWhite(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  const lum = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return 1.05 / (lum + 0.05);
}

export const isValidBrandColor = (hex: string) => /^#[0-9a-f]{6}$/i.test(hex) && contrastWithWhite(hex) >= 4.5;

/** Numărul de turnuri al coroanei murale, după convenția heraldicii românești: municipiu 5, oraș 3, comună 1. */
export const crownTowers = (kind: string) => (kind === "municipiu" ? 5 : kind === "oraș" ? 3 : 1);
