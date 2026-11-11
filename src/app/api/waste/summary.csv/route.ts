// D08, N04 — exportul situației filtrate, cu categoriile din afara totalurilor separat.
import { getSession } from "@/server/auth/session";
import { can } from "@/server/auth/rbac";
import { summary, type WasteFilters } from "@/server/queries/waste";
import { toRomanianCsv } from "@/domain/csv";
import { formatKgAsTonnes } from "@/domain/quantity";
import { currentYear, todayIso } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.session.stage !== "active" || !can(s.user.role, "waste.summary.read")) return new Response("Nu există", { status: 404 });
  const f = Object.fromEntries(new URL(req.url).searchParams) as WasteFilters;
  const year = Number(f.year) || currentYear();
  const { byUat, buckets, uatList } = await summary(f, year);
  const per = f.from || f.to ? `${year}-${f.from ?? "01"} – ${year}-${f.to ?? "12"}` : String(year);
  const rows: (string | number)[][] = [["DEMO — date fictive", "", "", "", ""]];
  for (const u of uatList.filter((x) => !f.uat || x.id === f.uat)) {
    const r = byUat.find((x) => x.uatId === u.id);
    rows.push([u.name, u.siruta, per, r?.n ?? 0, formatKgAsTonnes(r?.kg ?? 0)]);
  }
  rows.push(["Total validat", "", per, byUat.reduce((a, r) => a + r.n, 0), formatKgAsTonnes(byUat.reduce((a, r) => a + r.kg, 0))]);
  for (const [k, label] of [["unvalidated", "Nevalidate (în afara totalurilor)"], ["unassigned", "Neatribuite (în afara totalurilor)"], ["excluded", "Excluse"]] as const)
    rows.push([label, "", per, buckets[k]?.n ?? 0, formatKgAsTonnes(buckets[k]?.kg ?? 0)]);
  const filt = [f.fraction && `fracție=${f.fraction}`, f.destination && `destinație=${f.destination}`].filter(Boolean).join("; ");
  if (filt) rows.push([`Filtre: ${filt}`, "", "", "", ""]);
  const csv = toRomanianCsv(["UAT", "SIRUTA (demo)", "Perioada", "Curse", "Total (t)"], rows);
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="situatie_uat_${todayIso()}.csv"` } });
}
