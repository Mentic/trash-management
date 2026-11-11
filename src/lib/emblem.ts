// Stemă stilizată (demo), generată: scut în culoarea primăriei, chenar auriu, inițiala și coroana murală
// de argint cu turnuri după rangul UAT-ului. Primăria își poate încărca stema reală din „Primării”.
import { crownTowers } from "@/domain/tenants";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function emblemSvg(o: { name: string; kind: string; color: string }): string {
  const towers = crownTowers(o.kind);
  const initial = o.name.replace(/^(Municipiul|Orașul|Comuna)\s+/, "").slice(0, 1).toUpperCase();
  // Coroana murală: o bază zidită și n turnuri cu creneluri, centrate.
  const tw = 14, gap = 4, total = towers * tw + (towers - 1) * gap, x0 = 60 - total / 2;
  const towersSvg = Array.from({ length: towers }, (_, i) => {
    const x = x0 + i * (tw + gap);
    return `<path d="M${x} 30 v-12 h3 v-3 h3 v3 h2 v-3 h3 v3 h3 v12 z"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150" role="img" aria-label="Stemă stilizată ${esc(o.name)}">
  <g fill="#d9dde3" stroke="#6b7280" stroke-width="1">${towersSvg}<rect x="${x0 - 6}" y="30" width="${total + 12}" height="8" rx="1"/></g>
  <path d="M14 44 h92 v46 c0 28 -22 44 -46 52 c-24 -8 -46 -24 -46 -52 z" fill="${esc(o.color)}" stroke="#c9a227" stroke-width="4"/>
  <path d="M24 54 h72 v36 c0 21 -16 34 -36 41 c-20 -7 -36 -20 -36 -41 z" fill="none" stroke="#c9a227" stroke-width="1" stroke-dasharray="3 3" opacity=".8"/>
  <text x="60" y="104" text-anchor="middle" font-family="Georgia, 'Noto Serif', serif" font-size="44" font-weight="700" fill="#f5e6b8">${esc(initial)}</text>
</svg>`;
}
