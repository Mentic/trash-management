// N04, I10 — CSV pentru Excel cu setări românești: BOM, „;”, CRLF, virgulă zecimală.
export type Cell = string | number | null | undefined;

function escape(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@]/.test(s)) s = `'${s}`; // protecție la injecție de formule
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toRomanianCsv(header: readonly string[], rows: readonly (readonly Cell[])[]): string {
  const lines = [header, ...rows].map((r) => r.map(escape).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}
