// Fișierele de import din setul demo, cu perioadele mutate ca baza (sec. 10, pasul 10).
import { readFile } from "node:fs/promises";
import path from "node:path";
import { getSession } from "@/server/auth/session";
import { computeShift, shiftPeriod, shiftWeighing, type WasteShiftMode } from "@/domain/seedShift";
import { todayIso } from "@/lib/format";

export const dynamic = "force-dynamic";
const ALLOWED = new Set(["import_2026-10_scenariu_erori.csv", "import_2026-10_restul_uat_curat.csv", "import_2026-10_test_V5_V6.csv"]);

export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const s = await getSession();
  if (!s || s.session.stage !== "active") return new Response("Neautentificat", { status: 401 });
  const { name } = await params;
  if (!ALLOWED.has(name)) return new Response("Nu există", { status: 404 });
  let text = (await readFile(path.join(process.cwd(), "seed", name), "utf-8")).replace(/^﻿/, "");
  const p = JSON.parse(await readFile(path.join(process.cwd(), "seed/parametri.json"), "utf-8")) as { ancora_date: string };
  const { monthShift } = computeShift(p.ancora_date, todayIso(), (process.env.DEMO_WASTE_SHIFT ?? "years") as WasteShiftMode);
  if (monthShift) {
    text = text.split("\n").map((line, i) => {
      if (i === 0 || !line) return line;
      const c = line.split(";");
      if (/^\d{4}-\d{2}$/.test(c[0]!) && !c[0]!.startsWith("2025")) { c[0] = shiftPeriod(c[0]!, monthShift); c[1] = shiftWeighing(c[1]!, monthShift); }
      return c.join(";");
    }).join("\n");
  }
  return new Response(`﻿${text}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` } });
}
