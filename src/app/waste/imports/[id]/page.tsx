// D05, D06 — raportul de import și rezolvarea semnalărilor (D2–D4).
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, importRejections, imports, uats, wasteFlags, wasteRows } from "@/db/schema";
import { requireUser } from "@/server/auth/rbac";
import { rowsList } from "@/server/queries/waste";
import { Badge, Crumbs, PageTitle, Stat, btn, input, th, td } from "@/components/ui";
import { RowStatusBadge } from "@/components/badges";
import { ActionForm } from "@/components/ActionForm";
import { assignRowUat, correctRow, excludeRow, reactivateRow, validateRows } from "@/server/actions/waste";
import { DESTINATION_LABEL, FRACTION_LABEL, RULE_LABEL } from "@/lib/labels";
import { fmtDateTime, fmtT } from "@/lib/format";
import { formatKgAsTonnes } from "@/domain/quantity";
import { SuccessBanner } from "@/components/flow";
import { wasteMessage } from "@/lib/messages";

export const dynamic = "force-dynamic";

function flagText(rule: string, d: Record<string, unknown>) {
  if (rule === "V3") return `Diferență ${formatKgAsTonnes(Math.abs(Number(d.reportedKg) - Number(d.ticketKg)))} t (raport ${formatKgAsTonnes(Number(d.reportedKg))} / tichet ${formatKgAsTonnes(Number(d.ticketKg))})`;
  if (rule === "V4") return d.reason === "shared_route" ? "Neatribuit: rută comună fără dovadă" : "Neatribuit: UAT lipsă";
  if (rule === "V5") return `UAT necunoscut (SIRUTA ${String(d.siruta)})`;
  return RULE_LABEL[rule as keyof typeof RULE_LABEL];
}

export default async function ImportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ filter?: string; ok?: string; n?: string }> }) {
  await requireUser("waste.import");
  const { id } = await params;
  const { filter, ok: okKey, n: okN } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db.select({ i: imports, number: documents.number, year: documents.year, docId: documents.id }).from(imports).leftJoin(documents, eq(documents.id, imports.documentId)).where(eq(imports.id, id));
  if (!row) notFound();
  const [rejected, flags, rows, uatList] = await Promise.all([
    db.select().from(importRejections).where(eq(importRejections.importId, id)).orderBy(asc(importRejections.lineNo)),
    db.select({ f: wasteFlags }).from(wasteFlags).innerJoin(wasteRows, eq(wasteRows.id, wasteFlags.rowId)).where(and(eq(wasteRows.importId, id), isNull(wasteFlags.resolvedAt))),
    rowsList(and(eq(wasteRows.importId, id), filter === "flagged" ? eq(wasteRows.status, "flagged") : undefined), 10_000),
    db.select().from(uats).orderBy(asc(uats.name)),
  ]);
  const flagsByRow = new Map<string, { rule: string; details: Record<string, unknown> }[]>();
  for (const { f } of flags) flagsByRow.set(f.rowId, [...(flagsByRow.get(f.rowId) ?? []), { rule: f.rule, details: f.details as Record<string, unknown> }]);
  const count = (rule: string) => flags.filter((x) => x.f.rule === rule).length;
  const statusCount = (s: string) => rows.filter((r) => r.status === s).length;
  const sorted = [...rows].sort((a, b) => Number(flagsByRow.has(b.id)) - Number(flagsByRow.has(a.id)) || a.lineNo - b.lineNo);

  return (
    <>
      <Crumbs items={[{ href: "/waste/imports", label: "Import și verificare" }, { label: row.i.fileName }]} />
      <PageTitle actions={<ActionForm action={validateRows} submit="Validează rândurile curate" confirm="Validați toate rândurile importate fără semnalări?"><input type="hidden" name="importId" value={id} /></ActionForm>}>
        Raport de import: {row.i.fileName}
      </PageTitle>
      <SuccessBanner text={wasteMessage(okKey, okN)} />
      <p className="mb-3 text-sm">Legat de intrarea <Link className="underline" href={`/registry/${row.docId}`}>{row.number}/{row.year}</Link> · {fmtDateTime(row.i.uploadedAt)}</p>

      <section aria-live="polite" aria-label="Rezumatul importului" className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-7">
        <Stat label="Rânduri în fișier" value={row.i.totalRows} />
        <Stat label="Respinse (V1, V6)" value={row.i.rejectedRows} tone={row.i.rejectedRows ? "red" : undefined} />
        <Stat label="Duplicat (V2)" value={count("V2")} tone={count("V2") ? "amber" : undefined} />
        <Stat label="Diferență (V3)" value={count("V3")} tone={count("V3") ? "amber" : undefined} />
        <Stat label="Neatribuit (V4)" value={count("V4")} tone={count("V4") ? "amber" : undefined} />
        <Stat label="UAT necunoscut (V5)" value={count("V5")} tone={count("V5") ? "amber" : undefined} />
        <Stat label="Importate fără semnalări" value={row.i.cleanRows} tone="green" />
      </section>
      <div role="note" className="mb-3 rounded border-l-4 border-[var(--accent)] bg-blue-50 p-3 text-sm">
        <p className="font-semibold">Pasul următor</p>
        <p>{statusCount("flagged") > 0
          ? `Rezolvați cele ${statusCount("flagged")} rânduri semnalate (sus în tabel): excludeți duplicatul, corectați diferența după tichet sau atribuiți UAT-ul cu dovadă. Apoi validați rândurile curate.`
          : statusCount("imported") > 0 ? "Validați rândurile curate cu butonul „Validează rândurile curate”." : "Importul este verificat. Totalurile apar în Situație pe UAT."}</p>
      </div>
      <p className="mb-4 text-sm">Stare acum: {statusCount("validated")} validate · {statusCount("imported")} importate · {statusCount("flagged")} semnalate · {statusCount("excluded")} excluse.</p>

      {rejected.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 font-semibold">Rânduri respinse (nu au fost importate)</h2>
          <table className="w-full border-collapse">
            <thead><tr><th scope="col" className={th}>Linia</th><th scope="col" className={th}>Tichet</th><th scope="col" className={th}>Regula</th><th scope="col" className={th}>Motiv</th></tr></thead>
            <tbody>{rejected.map((r) => (
              <tr key={r.id}><td className={td}>{r.lineNo}</td><td className={td}>{r.ticketNo}</td><td className={td}><Badge tone="red" icon="✕">{r.rule} {RULE_LABEL[r.rule]}</Badge></td><td className={td}>{r.reasons.join("; ")}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}

      <div className="mb-2 flex items-center gap-2">
        <h2 className="font-semibold">Rânduri importate</h2>
        <Link className={btn} href={`/waste/imports/${id}`}>Toate</Link>
        <Link className={btn} href={`/waste/imports/${id}?filter=flagged`}>Doar semnalate</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <caption className="sr-only">Rândurile importului; semnalările primele</caption>
          <thead><tr>
            <th scope="col" className={th}>Linia</th><th scope="col" className={th}>Tichet</th><th scope="col" className={th}>Data</th><th scope="col" className={th}>UAT</th>
            <th scope="col" className={th}>Fracție / destinație</th><th scope="col" className={th}>Raportat</th><th scope="col" className={th}>Tichet</th>
            <th scope="col" className={th}>Stare</th><th scope="col" className={th}>Semnalări și acțiuni</th>
          </tr></thead>
          <tbody>{sorted.map((r) => {
            const fl = flagsByRow.get(r.id) ?? [];
            return (
              <tr key={r.id} className={fl.length ? "bg-amber-50/40" : undefined}>
                <td className={td}>{r.lineNo}</td>
                <td className={td}><Link className="underline" href={`/waste/rows/${r.id}`}>{r.ticketNo}</Link></td>
                <td className={td}>{fmtDateTime(r.weighedAt)}</td>
                <td className={td}>{r.uatName ?? <Badge tone="amber" icon="?">neatribuit</Badge>}</td>
                <td className={td}>{FRACTION_LABEL[r.fraction]} / {DESTINATION_LABEL[r.destination]}</td>
                <td className={td}>{fmtT(r.reportedKg)}</td>
                <td className={td}>{r.ticketKg === null ? "—" : fmtT(r.ticketKg)}</td>
                <td className={td}><RowStatusBadge status={r.status} /></td>
                <td className={td}>
                  <div className="flex flex-wrap gap-1">{fl.map((f, i) => <Badge key={i} tone="red" icon="⚑">{f.rule} {flagText(f.rule, f.details)}</Badge>)}</div>
                  {r.status === "flagged" && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      <details className="rounded border p-1"><summary className="cursor-pointer text-xs">Corectează</summary>
                        <ActionForm action={correctRow} submit="Salvează corecția" className="mt-1 space-y-1">
                          <input type="hidden" name="rowId" value={r.id} />
                          <label className="block text-xs" htmlFor={`rep-${r.id}`}>Cantitate raportată (t)</label>
                          <input id={`rep-${r.id}`} name="reportedT" className={input} defaultValue={formatKgAsTonnes(r.ticketKg ?? r.reportedKg)} />
                          <label className="block text-xs" htmlFor={`tic-${r.id}`}>Cantitate tichet (t)</label>
                          <input id={`tic-${r.id}`} name="ticketT" className={input} defaultValue={r.ticketKg === null ? "" : formatKgAsTonnes(r.ticketKg)} />
                          <label className="block text-xs" htmlFor={`rr-${r.id}`}>Motiv (obligatoriu)</label>
                          <input id={`rr-${r.id}`} name="reason" className={input} required defaultValue={fl.some((f) => f.rule === "V3") ? "Corectat pe baza tichetului de cântar" : ""} />
                        </ActionForm>
                      </details>
                      {!r.uatName && (
                        <details className="rounded border p-1"><summary className="cursor-pointer text-xs">Atribuie UAT</summary>
                          <ActionForm action={assignRowUat} submit="Atribuie" className="mt-1 space-y-1">
                            <input type="hidden" name="rowId" value={r.id} />
                            <label className="block text-xs" htmlFor={`uat-${r.id}`}>UAT (obligatoriu)</label>
                            <select id={`uat-${r.id}`} name="uatId" className={input} required defaultValue="">
                              <option value="">Alegeți</option>{uatList.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                            <label className="block text-xs" htmlFor={`ev-${r.id}`}>Dovadă sau regulă aprobată (obligatoriu, I09)</label>
                            <input id={`ev-${r.id}`} name="evidenceRef" className={input} required />
                            <label className="block text-xs" htmlFor={`ar-${r.id}`}>Motiv (obligatoriu)</label>
                            <input id={`ar-${r.id}`} name="reason" className={input} required />
                          </ActionForm>
                        </details>
                      )}
                      <details className="rounded border p-1"><summary className="cursor-pointer text-xs">Exclude</summary>
                        <ActionForm action={excludeRow} submit="Exclude din calcul" className="mt-1 space-y-1">
                          <input type="hidden" name="rowId" value={r.id} />
                          <label className="block text-xs" htmlFor={`er-${r.id}`}>Motiv (obligatoriu)</label>
                          <input id={`er-${r.id}`} name="reason" className={input} required defaultValue={fl.some((f) => f.rule === "V2") ? "Duplicat confirmat" : ""} />
                        </ActionForm>
                      </details>
                    </div>
                  )}
                  {(r.status === "imported" || r.status === "validated") && <span className="text-xs text-gray-600">{r.status === "imported" ? "Fără semnalări — se validează cu butonul de sus" : "Validat"}</span>}
                  {r.status === "excluded" && (
                    <details className="mt-1 rounded border p-1"><summary className="cursor-pointer text-xs">Reactivează</summary>
                      <ActionForm action={reactivateRow} submit="Reactivează" className="mt-1 space-y-1">
                        <input type="hidden" name="rowId" value={r.id} />
                        <label className="block text-xs" htmlFor={`ra-${r.id}`}>Motiv (obligatoriu)</label>
                        <input id={`ra-${r.id}`} name="reason" className={input} required />
                      </ActionForm>
                    </details>
                  )}
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </div>
    </>
  );
}
