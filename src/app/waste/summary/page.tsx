// D08 — situația pe UAT: totaluri doar din rânduri validate; restul separat; deschidere până la tichet.
import Link from "next/link";
import { requireUser } from "@/server/auth/rbac";
import { availableYears, summary, type WasteFilters } from "@/server/queries/waste";
import { PageTitle, Stat, btn, th, td } from "@/components/ui";
import { WasteFilterForm, qsOf } from "../WasteFilterForm";
import { currentYear, fmtInt, fmtT } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SummaryPage({ searchParams }: { searchParams: Promise<WasteFilters> }) {
  await requireUser("waste.summary.read");
  const f = await searchParams;
  const years = await availableYears();
  const year = Number(f.year) || (years.includes(currentYear()) ? currentYear() : years[0] ?? currentYear());
  const { byUat, buckets, uatList } = await summary(f, year);
  const qs = qsOf({ ...f, year: String(year) });
  const total = byUat.reduce((s, r) => s + r.kg, 0);
  const shown = uatList.filter((u) => !f.uat || u.id === f.uat);
  const b = (k: string) => buckets[k] ?? { kg: 0, n: 0 };

  return (
    <>
      <PageTitle actions={<a className={btn} href={`/api/waste/summary.csv?${qs}`}>Export CSV</a>}>Situație pe UAT — {year}</PageTitle>
      <WasteFilterForm f={f} years={years} uatList={uatList} year={year} action="/waste/summary" />
      <table className="mb-6 w-full border-collapse">
        <caption className="mb-2 text-left text-sm">Totaluri validate și aprobate pe UAT (t). Selectați un total pentru lunile, cursele și tichetele din spate.</caption>
        <thead><tr><th scope="col" className={th}>UAT</th><th scope="col" className={th}>SIRUTA (demo)</th><th scope="col" className={th}>Mediu</th><th scope="col" className={`${th} text-right`}>Curse</th><th scope="col" className={`${th} text-right`}>Total validat</th></tr></thead>
        <tbody>
          {shown.map((u) => {
            const r = byUat.find((x) => x.uatId === u.id);
            return (
              <tr key={u.id}>
                <th scope="row" className={`${td} text-left font-medium`}>{u.name}</th><td className={td}>{u.siruta}</td><td className={td}>{u.environment}</td>
                <td className={`${td} text-right`}>{fmtInt(r?.n ?? 0)}</td>
                <td className={`${td} text-right`}>{r ? <Link className="font-medium text-[var(--accent)] hover:underline" href={`/waste/summary/${u.id}?${qs}`}>{fmtT(r.kg)}</Link> : "—"}</td>
              </tr>
            );
          })}
          {!f.uat && <tr><th scope="row" className={`${td} text-left font-semibold`}>Total</th><td className={td} colSpan={2} /><td className={`${td} text-right`}>{fmtInt(byUat.reduce((s, r) => s + r.n, 0))}</td><td className={`${td} text-right font-semibold`}>{fmtT(total)}</td></tr>}
        </tbody>
      </table>
      <h2 className="mb-3 mt-10 text-[13px] text-[var(--ink-2)]">În afara totalurilor</h2>
      <div className="grid gap-6 rounded-2xl bg-white p-6 ring-1 ring-[var(--hairline)] md:grid-cols-3">
        <Link href={`/waste/rows?bucket=unvalidated&${qs}`}><Stat label={`Nevalidate (importate, semnalate, corectate) · ${b("unvalidated").n} curse`} value={fmtT(b("unvalidated").kg)} tone={b("unvalidated").n ? "amber" : undefined} /></Link>
        <Link href={`/waste/rows?bucket=unassigned&${qs}`}><Stat label={`Neatribuite (fără UAT) · ${b("unassigned").n} curse`} value={fmtT(b("unassigned").kg)} tone={b("unassigned").n ? "amber" : undefined} /></Link>
        <Link href={`/waste/rows?bucket=excluded&${qs}`}><Stat label={`Excluse · ${b("excluded").n} curse`} value={fmtT(b("excluded").kg)} /></Link>
      </div>
    </>
  );
}
