// R01, R04, R07, R08 — registrul: listă filtrată pe rol, căutare, filtre, export CSV.
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, can } from "@/server/auth/rbac";
import { allDossiers, listDocuments, officers, workItems, type RegistryFilters } from "@/server/queries/registry";
import { PageTitle, btn, btnPrimary, input, th, td } from "@/components/ui";
import { DocStatusBadge, Deadline } from "@/components/badges";
import { DIRECTION_LABEL, DOC_STATUS_LABEL } from "@/lib/labels";
import { DOC_STATUSES } from "@/domain/codes";
import { fmtDate } from "@/lib/format";

export const dynamic = "force-dynamic";


export default async function RegistryPage({ searchParams }: { searchParams: Promise<RegistryFilters> }) {
  const me = await requireUser();
  if (me.role === "mayor") redirect("/portal"); // multi-tenant: primăria are doar portalul
  const user = await requireUser("registry.read");
  const f = await searchParams;
  const [{ rows, total, page, pages }, offs, dos, work] = await Promise.all([listDocuments(user, f), officers(), allDossiers(), workItems(user)]);
  const qs = new URLSearchParams(Object.entries(f).filter(([k, v]) => v && k !== "page") as [string, string][]).toString();
  const hasFilters = qs.length > 0;
  const seeAll = can(user.role, "registry.read_all");

  return (
    <>
      <PageTitle actions={<>
        {can(user.role, "document.create") && <Link href="/registry/new" className={btnPrimary}>Document nou</Link>}
        <a href={`/api/registry/export.csv?${qs}`} className={btn}>Export CSV</a>
      </>}>Registrul documentelor</PageTitle>

      {(() => {
        const todo = work.filter((w) => w.count > 0);
        return (
          <section aria-labelledby="work-title" className="mb-8">
            <h2 id="work-title" className="mb-3 text-[13px] text-[var(--ink-2)]">De lucru</h2>
            {todo.length === 0 ? <p className="text-[15px]">Nimic de făcut acum.</p> : (
              <ul className="flex flex-wrap gap-x-10 gap-y-4">
                {todo.map((w) => (
                  <li key={w.label}>
                    <Link href={w.href} className="group block">
                      <span className={`block text-[28px] font-semibold leading-none tabular-nums ${w.tone === "red" ? "text-[var(--red)]" : "text-[var(--ink)]"}`}>{w.count}</span>
                      <span className="mt-1.5 block text-[13px] text-[var(--accent)] group-hover:underline">{w.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })()}

      <form role="search" aria-label="Căutare și filtre" className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="q" className="sr-only">Căutare (nr. intern, nr. extern, obiect, corespondent)</label>
          <input id="q" name="q" defaultValue={f.q} className="h-10 w-full max-w-md px-4" placeholder="Caută: număr, nr. expeditor, obiect, corespondent" />
          <button className={btnPrimary}>Caută</button>
          {hasFilters && <Link href="/registry" className={btn}>Resetează</Link>}
        </div>
        <details className="mt-3" open={!!(f.direction || f.status || f.assignee || f.deadline || f.dossier)}>
          <summary className="cursor-pointer text-[13px] text-[var(--accent)]">Filtre</summary>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
            <div><label htmlFor="direction" className="text-[12px] text-[var(--ink-2)]">Sens</label>
              <select id="direction" name="direction" defaultValue={f.direction ?? ""} className={input}>
                <option value="">Toate</option>{Object.entries(DIRECTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div><label htmlFor="status" className="text-[12px] text-[var(--ink-2)]">Stare</label>
              <select id="status" name="status" defaultValue={f.status ?? ""} className={input}>
                <option value="">Toate</option>{DOC_STATUSES.map((k) => <option key={k} value={k}>{DOC_STATUS_LABEL[k]}</option>)}
              </select></div>
            {seeAll && <div><label htmlFor="assignee" className="text-[12px] text-[var(--ink-2)]">Responsabil</label>
              <select id="assignee" name="assignee" defaultValue={f.assignee ?? ""} className={input}>
                <option value="">Toți</option><option value="none">Nerepartizat</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select></div>}
            <div><label htmlFor="deadline" className="text-[12px] text-[var(--ink-2)]">Termen</label>
              <select id="deadline" name="deadline" defaultValue={f.deadline ?? ""} className={input}>
                <option value="">Oricare</option><option value="overdue">Depășit</option><option value="near">În ≤ 5 zile</option><option value="none">Fără termen</option>
              </select></div>
            <div><label htmlFor="dossier" className="text-[12px] text-[var(--ink-2)]">Dosar</label>
              <select id="dossier" name="dossier" defaultValue={f.dossier ?? ""} className={input}>
                <option value="">Toate</option>{dos.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}
              </select></div>
          </div>
        </details>
      </form>

      <p role="status" className="mb-3 text-[13px] text-[var(--ink-2)]">{total} {total === 1 ? "document" : "documente"}{hasFilters ? " corespund filtrelor" : ""}.</p>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white px-6 py-10 text-center text-[var(--ink-2)] ring-1 ring-[var(--hairline)]">{hasFilters ? "Niciun document nu corespunde filtrelor." : seeAll ? "Registrul este gol." : "Nu aveți lucrări repartizate."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <caption className="sr-only">Registrul documentelor, sortat descrescător după număr</caption>
            <thead><tr>
              <th scope="col" className={th} aria-sort="descending">Număr</th><th scope="col" className={th}>Document</th>
              <th scope="col" className={th}>Stare</th><th scope="col" className={th}>Responsabil</th><th scope="col" className={th}>Termen</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap`}>
                    <Link className="font-medium text-[var(--accent)] hover:underline" href={`/registry/${r.id}`}>{r.number ? `${r.number}/${r.year}` : "Ciornă"}</Link>
                    <div className="text-[12px] text-[var(--ink-2)]">{DIRECTION_LABEL[r.direction]} · {fmtDate(r.registeredAt)}</div>
                  </td>
                  <td className={td}>
                    <div>{r.subject}</div>
                    <div className="text-[13px] text-[var(--ink-2)]">{r.correspondentName}{r.externalRef && ` · nr. ${r.externalRef}`}{r.dossierCode && ` · dosar ${r.dossierCode}`}</div>
                  </td>
                  <td className={td}><DocStatusBadge status={r.status} /></td>
                  <td className={`${td} text-[var(--ink-2)]`}>{r.assigneeName ?? "—"}</td>
                  <td className={td}><Deadline deadline={r.deadline} status={r.status} /></td>
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
