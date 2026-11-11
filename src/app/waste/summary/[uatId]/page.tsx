// D08, D5 — deschiderea unui total: lunile → cursele → tichetul.
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { uats, wasteRows } from "@/db/schema";
import { requireUser } from "@/server/auth/rbac";
import { availableYears, monthsForUat, rowsList, VALIDATED, wasteWhere, type WasteFilters } from "@/server/queries/waste";
import { Crumbs, PageTitle, th, td } from "@/components/ui";
import { RowStatusBadge } from "@/components/badges";
import { qsOf } from "../../WasteFilterForm";
import { DESTINATION_LABEL, FRACTION_LABEL } from "@/lib/labels";
import { currentYear, fmtDateTime, fmtInt, fmtPeriod, fmtT } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function UatDrillPage({ params, searchParams }: { params: Promise<{ uatId: string }>; searchParams: Promise<WasteFilters & { period?: string }> }) {
  await requireUser("waste.summary.read");
  const { uatId } = await params;
  const f = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(uatId)) notFound();
  const [uat] = await db.select().from(uats).where(eq(uats.id, uatId));
  if (!uat) notFound();
  const years = await availableYears();
  const year = Number(f.year) || currentYear();
  const base = qsOf({ ...f, period: undefined, uat: undefined, year: String(year) });
  const months = await monthsForUat(uatId, f, year);
  const period = f.period && /^\d{4}-\d{2}$/.test(f.period) ? f.period : null;
  const rows = period
    ? await rowsList(and(wasteWhere({ ...f, uat: uatId, from: undefined, to: undefined }, year), eq(wasteRows.period, `${period}-01`), inArray(wasteRows.status, [...VALIDATED])))
    : [];
  void years;

  return (
    <>
      <Crumbs items={[
        { href: `/waste/summary?${base}`, label: `Situație pe UAT ${year}` },
        period ? { href: `/waste/summary/${uatId}?${base}`, label: uat.name } : { label: uat.name },
        ...(period ? [{ label: fmtPeriod(period) }] : []),
      ]} />
      <PageTitle>{uat.name}{period ? ` — ${fmtPeriod(period)}` : ` — ${year}`}</PageTitle>
      {!period ? (
        <table className="w-full max-w-xl border-collapse">
          <caption className="mb-2 text-left text-sm">Totaluri validate pe luni. Selectați o lună pentru curse.</caption>
          <thead><tr><th scope="col" className={th}>Luna</th><th scope="col" className={`${th} text-right`}>Curse</th><th scope="col" className={`${th} text-right`}>Total</th></tr></thead>
          <tbody>
            {months.map((m) => (
              <tr key={m.period}><th scope="row" className={`${td} text-left`}><Link className="underline" href={`/waste/summary/${uatId}?${base}&period=${m.period}`}>{fmtPeriod(m.period)}</Link></th>
                <td className={`${td} text-right`}>{fmtInt(m.n)}</td><td className={`${td} text-right`}>{fmtT(m.kg)}</td></tr>
            ))}
            <tr><th scope="row" className={`${td} text-left font-semibold`}>Total</th><td className={`${td} text-right`}>{fmtInt(months.reduce((s, m) => s + m.n, 0))}</td><td className={`${td} text-right font-semibold`}>{fmtT(months.reduce((s, m) => s + m.kg, 0))}</td></tr>
          </tbody>
        </table>
      ) : (
        <table className="w-full border-collapse">
          <caption className="mb-2 text-left text-sm">{rows.length} curse validate, {fmtT(rows.reduce((s, r) => s + r.reportedKg, 0))}. Selectați un tichet.</caption>
          <thead><tr><th scope="col" className={th}>Tichet</th><th scope="col" className={th}>Data cântăririi</th><th scope="col" className={th}>Cod LER</th><th scope="col" className={th}>Fracție</th><th scope="col" className={th}>Destinație</th><th scope="col" className={th}>Instalație</th><th scope="col" className={`${th} text-right`}>Cantitate</th><th scope="col" className={th}>Stare</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td className={td}><Link className="underline" href={`/waste/rows/${r.id}`}>{r.ticketNo}</Link></td><td className={td}>{fmtDateTime(r.weighedAt)}</td><td className={td}>{r.lerCode}</td>
              <td className={td}>{FRACTION_LABEL[r.fraction]}</td><td className={td}>{DESTINATION_LABEL[r.destination]}</td><td className={td}>{r.facility}</td>
              <td className={`${td} text-right`}>{fmtT(r.reportedKg)}</td><td className={td}><RowStatusBadge status={r.status} /></td></tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
