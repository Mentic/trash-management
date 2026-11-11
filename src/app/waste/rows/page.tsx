// D08 — cursele din afara totalurilor (nevalidate, neatribuite, excluse), cu filtrele situației.
import Link from "next/link";
import { and, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { wasteRows } from "@/db/schema";
import { requireUser } from "@/server/auth/rbac";
import { rowsList, UNVALIDATED, wasteWhere, type WasteFilters } from "@/server/queries/waste";
import { Crumbs, PageTitle, th, td } from "@/components/ui";
import { RowStatusBadge } from "@/components/badges";
import { qsOf } from "../WasteFilterForm";
import { DESTINATION_LABEL, FRACTION_LABEL } from "@/lib/labels";
import { currentYear, fmtDateTime, fmtT } from "@/lib/format";

export const dynamic = "force-dynamic";

const TITLES = { unvalidated: "Curse nevalidate", unassigned: "Curse neatribuite", excluded: "Curse excluse" } as const;

export default async function RowsPage({ searchParams }: { searchParams: Promise<WasteFilters & { bucket?: keyof typeof TITLES }> }) {
  await requireUser("waste.summary.read");
  const f = await searchParams;
  const year = Number(f.year) || currentYear();
  const bucket = f.bucket && f.bucket in TITLES ? f.bucket : "unvalidated";
  const cond = bucket === "excluded" ? eq(wasteRows.status, "excluded")
    : bucket === "unassigned" ? and(isNull(wasteRows.uatId), ne(wasteRows.status, "excluded"))
    : and(inArray(wasteRows.status, [...UNVALIDATED]), isNotNull(wasteRows.uatId));
  const rows = await rowsList(and(wasteWhere(f, year), cond));
  return (
    <>
      <Crumbs items={[{ href: `/waste/summary?${qsOf({ ...f, bucket: undefined, year: String(year) })}`, label: `Situație pe UAT ${year}` }, { label: TITLES[bucket] }]} />
      <PageTitle>{TITLES[bucket]} — {year}</PageTitle>
      {rows.length === 0 ? <p className="rounded border p-4">Nicio cursă în această categorie pentru filtrele alese.</p> : (
        <table className="w-full border-collapse">
          <caption className="mb-2 text-left text-sm">{rows.length} curse, {fmtT(rows.reduce((s, r) => s + r.reportedKg, 0))} — nu intră în totalurile validate.</caption>
          <thead><tr><th scope="col" className={th}>Tichet</th><th scope="col" className={th}>Data</th><th scope="col" className={th}>UAT</th><th scope="col" className={th}>Fracție / destinație</th><th scope="col" className={`${th} text-right`}>Cantitate</th><th scope="col" className={th}>Stare</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.id}><td className={td}><Link className="underline" href={`/waste/rows/${r.id}`}>{r.ticketNo}</Link></td><td className={td}>{fmtDateTime(r.weighedAt)}</td>
              <td className={td}>{r.uatName ?? (r.sharedRoute ? "rută comună, fără dovadă" : "—")}</td><td className={td}>{FRACTION_LABEL[r.fraction]} / {DESTINATION_LABEL[r.destination]}</td>
              <td className={`${td} text-right`}>{fmtT(r.reportedKg)}</td><td className={td}><RowStatusBadge status={r.status} /></td></tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
