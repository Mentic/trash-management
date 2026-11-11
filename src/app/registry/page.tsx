// R01, R04, R07, R08 — registrul: listă filtrată pe rol, căutare, filtre, export CSV.
import Link from "next/link";
import { requireUser, can } from "@/server/auth/rbac";
import { allDossiers, listDocuments, officers, type RegistryFilters } from "@/server/queries/registry";
import { PageTitle, btn, btnPrimary, input, th, td } from "@/components/ui";
import { DocStatusBadge, Deadline } from "@/components/badges";
import { DIRECTION_LABEL, DOC_STATUS_LABEL } from "@/lib/labels";
import { DOC_STATUSES } from "@/domain/codes";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RegistryPage({ searchParams }: { searchParams: Promise<RegistryFilters> }) {
  const user = await requireUser("registry.read");
  const f = await searchParams;
  const [{ rows, total, page, pages }, offs, dos] = await Promise.all([listDocuments(user, f), officers(), allDossiers()]);
  const qs = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();
  const hasFilters = qs.length > 0;
  const seeAll = can(user.role, "registry.read_all");

  return (
    <>
      <PageTitle actions={<>
        {can(user.role, "document.create") && <Link href="/registry/new" className={btnPrimary}>Document nou</Link>}
        <a href={`/api/registry/export.csv?${qs}`} className={btn}>Export CSV</a>
      </>}>Registrul documentelor</PageTitle>

      <form role="search" className="mb-4 grid grid-cols-2 gap-2 rounded border p-3 md:grid-cols-7" aria-label="Căutare și filtre">
        <div className="col-span-2">
          <label htmlFor="q" className="text-xs font-medium">Căutare (nr. intern, nr. extern, obiect, corespondent)</label>
          <input id="q" name="q" defaultValue={f.q} className={input} placeholder="ex. 438/2026" />
        </div>
        <div><label htmlFor="direction" className="text-xs font-medium">Sens</label>
          <select id="direction" name="direction" defaultValue={f.direction ?? ""} className={input}>
            <option value="">Toate</option>{Object.entries(DIRECTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label htmlFor="status" className="text-xs font-medium">Stare</label>
          <select id="status" name="status" defaultValue={f.status ?? ""} className={input}>
            <option value="">Toate</option>{DOC_STATUSES.map((k) => <option key={k} value={k}>{DOC_STATUS_LABEL[k]}</option>)}
          </select></div>
        {seeAll && <div><label htmlFor="assignee" className="text-xs font-medium">Responsabil</label>
          <select id="assignee" name="assignee" defaultValue={f.assignee ?? ""} className={input}>
            <option value="">Toți</option><option value="none">Nerepartizat</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select></div>}
        <div><label htmlFor="deadline" className="text-xs font-medium">Termen</label>
          <select id="deadline" name="deadline" defaultValue={f.deadline ?? ""} className={input}>
            <option value="">Oricare</option><option value="overdue">Depășit</option><option value="near">În ≤ 5 zile</option><option value="none">Fără termen</option>
          </select></div>
        <div><label htmlFor="dossier" className="text-xs font-medium">Dosar</label>
          <select id="dossier" name="dossier" defaultValue={f.dossier ?? ""} className={input}>
            <option value="">Toate</option>{dos.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}
          </select></div>
        <div className="col-span-2 flex items-end gap-2 md:col-span-7">
          <button className={btnPrimary}>Caută</button>
          {hasFilters && <Link href="/registry" className={btn}>Resetează filtrele</Link>}
        </div>
      </form>

      <p role="status" className="mb-2 text-sm">{total} {total === 1 ? "document" : "documente"}{hasFilters ? " corespund filtrelor" : ""}.</p>
      {rows.length === 0 ? (
        <p className="rounded border p-4">{hasFilters ? "Niciun document nu corespunde filtrelor." : seeAll ? "Registrul este gol." : "Nu aveți lucrări repartizate."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">Registrul documentelor, sortat descrescător după număr</caption>
            <thead><tr>
              <th scope="col" className={th} aria-sort="descending">Număr</th><th scope="col" className={th}>Data</th><th scope="col" className={th}>Sens</th>
              <th scope="col" className={th}>Corespondent</th><th scope="col" className={th}>Obiect</th><th scope="col" className={th}>Stare</th>
              <th scope="col" className={th}>Responsabil</th><th scope="col" className={th}>Termen</th><th scope="col" className={th}>Dosar</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className={td}><Link className="font-medium underline" href={`/registry/${r.id}`}>{r.number ? `${r.number}/${r.year}` : "Ciornă"}</Link>
                    {r.externalRef && <div className="text-xs text-gray-600">ext. {r.externalRef}</div>}</td>
                  <td className={td}>{fmtDate(r.registeredAt)}</td>
                  <td className={td}>{DIRECTION_LABEL[r.direction]}</td>
                  <td className={td}>{r.correspondentName}</td>
                  <td className={td}>{r.subject}</td>
                  <td className={td}><DocStatusBadge status={r.status} /></td>
                  <td className={td}>{r.assigneeName ?? "—"}</td>
                  <td className={td}><Deadline deadline={r.deadline} status={r.status} /></td>
                  <td className={td}>{r.dossierCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Paginare" className="mt-3 flex gap-2 text-sm">
          {page > 1 && <Link className={btn} href={`/registry?${qs}&page=${page - 1}`}>← Anterioara</Link>}
          <span className="py-1.5">Pagina {page} din {pages}</span>
          {page < pages && <Link className={btn} href={`/registry?${qs}&page=${page + 1}`}>Următoarea →</Link>}
        </nav>
      )}
    </>
  );
}
