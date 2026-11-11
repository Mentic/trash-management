// R02, R03, R06, R09 — fișa documentului cu acțiunile permise de stare × rol (sec. 5.1, 8).
import Link from "next/link";
import { requireUser, can } from "@/server/auth/rbac";
import { getDocument } from "@/server/queries/document";
import { allDossiers, officers } from "@/server/queries/registry";
import { canTransition, type DocAction } from "@/domain/documentStateMachine";
import { Card, Crumbs, PageTitle, btn, input, th, td } from "@/components/ui";
import { DocStatusBadge, Deadline } from "@/components/badges";
import { ActionForm } from "@/components/ActionForm";
import {
  addAttachments, approveReply, updateDraft, assignDocument, cancelDocument, confirmDraft, correctMetadata, deleteDraft, extendDeadline,
  fileDocument, recordDispatch, registerOutgoing, returnReply, saveReply,
} from "@/server/actions/registry";
import { DIRECTION_LABEL, DISPATCH_LABEL, INTAKE_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { CORRESPONDENT_LABEL, REQUEST_TYPES_BY_DIRECTION } from "@/lib/directions";
import { fmtDate, fmtDateTime, todayIso } from "@/lib/format";
import { HISTORY_LABEL, fieldLabel } from "@/lib/history";
import { Stepper, SuccessBanner, nextStep } from "@/components/flow";
import { FileInput } from "@/components/FileInput";
import { docMessage } from "@/lib/messages";
import { db } from "@/db/client";
import { users } from "@/db/schema";

export const dynamic = "force-dynamic";

const fmtVal = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? fmtDate(v) : String(v));

function Hidden({ id, version }: { id: string; version: number }) {
  return <><input type="hidden" name="id" value={id} /><input type="hidden" name="version" value={version} /></>;
}

/** Acțiune cu motiv obligatoriu, deschisă la cerere (A07). */
function ReasonAction({ label, action, id, version, confirm, extra }: {
  label: string; action: Parameters<typeof ActionForm>[0]["action"]; id: string; version: number; confirm?: string; extra?: React.ReactNode;
}) {
  const fid = `${label.replace(/\W/g, "")}-${id.slice(0, 4)}`;
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <summary className="cursor-pointer text-sm font-medium">{label}</summary>
      <ActionForm action={action} confirm={confirm} submit={label} className="mt-2 space-y-2">
        <Hidden id={id} version={version} />
        {extra}
        <label htmlFor={fid} className="block text-sm">Motiv (obligatoriu)</label>
        <textarea id={fid} name="reason" required rows={2} className={input} />
      </ActionForm>
    </details>
  );
}

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string }> }) {
  const user = await requireUser("registry.read");
  const { id } = await params;
  const { ok: okKey } = await searchParams;
  const { doc, assigneeName, dossier, linked, files, sent, history } = await getDocument(user, id);
  const [offs, dos, people] = await Promise.all([officers(), allDossiers(), db.select({ u: users.username, n: users.displayName }).from(users)]);
  const display = new Map(people.map((p) => [p.u, p.n]));
  const show = (v: unknown) => fmtVal(typeof v === "string" && display.has(v) ? display.get(v) : v);
  const ok = (action: DocAction, reason?: string) =>
    canTransition({ action, doc: { status: doc.status, direction: doc.direction, assigneeId: doc.assigneeId }, actor: user, reason: reason ?? "x" });
  const v = doc.version;
  const num = doc.number ? `${doc.number}/${doc.year}` : "Ciornă";
  const canEditReply = (doc.status === "assigned" || doc.status === "drafting") && doc.assigneeId === user.id && user.role === "officer";
  const canFile = ok("file") || ok("fileWithoutReply");
  const withoutReply = history.some(({ e }) => e.action === "document.clasat_fara_raspuns");
  const banner = docMessage(okKey, { num, assignee: assigneeName, linked: linked?.number ? `${linked.number}/${linked.year}` : null, dossier: dossier?.code });
  const hint = nextStep({ status: doc.status, direction: doc.direction, role: user.role, isAssignee: doc.assigneeId === user.id, assignee: assigneeName });
  // O singură acțiune principală pe stare; clasarea fără răspuns e secundară (închide lucrarea).
  const fileIsPrimary = ok("file");
  const anyAction = doc.status === "draft" || canFile || (["assign", "submitForApproval", "approve", "return", "registerOutgoing", "recordDispatch", "extendDeadline", "correctMetadata", "cancel"] as const).some((a) => ok(a));

  return (
    <>
      <Crumbs items={[{ href: "/registry", label: "Registru" }, { label: num }]} />
      <PageTitle actions={doc.number ? <Link className={btn} href={`/registry/${doc.id}/print`}>Imprimă fișa</Link> : null}>
        {DIRECTION_LABEL[doc.direction]} {num}
      </PageTitle>

      <SuccessBanner text={banner} />
      <Stepper direction={doc.direction} status={doc.status} filedWithoutReply={withoutReply} />
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <DocStatusBadge status={doc.status} />
        <span>Responsabil: <strong>{assigneeName ?? "—"}</strong></span>
        <span>Termen: <Deadline deadline={doc.deadline} status={doc.status} />{doc.deadlineExtensionDays > 0 && ` (prelungit cu ${doc.deadlineExtensionDays} zile)`}</span>
        <span>Dosar: <strong>{dossier ? `${dossier.code} — ${dossier.title}` : "—"}</strong>{dossier && ` · păstrare ${dossier.retention}`}</span>
      </div>
      {doc.status === "cancelled" && <p role="note" className="mb-4 rounded border border-red-400 bg-red-50 p-2 text-sm">Anulat: {doc.cancelReason}. Numărul rămâne în registru.</p>}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {doc.status === "draft" && user.role === "registrar" && (
            <Card title="Editare ciornă">
              <ActionForm action={updateDraft} submit="Salvează ciorna" className="grid gap-3 md:grid-cols-2">
                <Hidden id={doc.id} version={v} />
                <div>
                  <label htmlFor="d-type" className="block text-sm font-medium">Tip document (obligatoriu)</label>
                  <select id="d-type" name="requestType" className={input} defaultValue={doc.requestType}>
                    {REQUEST_TYPES_BY_DIRECTION[doc.direction].map((k) => <option key={k} value={k}>{REQUEST_TYPE_LABEL[k]}</option>)}
                  </select>
                </div>
                {doc.direction === "incoming" && (
                  <div>
                    <label htmlFor="d-intake" className="block text-sm font-medium">Canal de primire</label>
                    <select id="d-intake" name="intakeChannel" className={input} defaultValue={doc.intakeChannel ?? ""}>
                      <option value="">—</option>{Object.entries(INTAKE_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  </div>
                )}
                {doc.direction !== "internal" && (
                  <>
                    <div>
                      <label htmlFor="d-corr" className="block text-sm font-medium">{CORRESPONDENT_LABEL[doc.direction]} (obligatoriu)</label>
                      <input id="d-corr" name="correspondentName" className={input} defaultValue={doc.correspondentName} required />
                    </div>
                    <div>
                      <label htmlFor="d-addr" className="block text-sm font-medium">Adresa corespondentului</label>
                      <input id="d-addr" name="correspondentAddress" className={input} defaultValue={doc.correspondentAddress ?? ""} />
                    </div>
                  </>
                )}
                {doc.direction === "incoming" && (
                  <div>
                    <label htmlFor="d-ext" className="block text-sm font-medium">Numărul expeditorului</label>
                    <input id="d-ext" name="externalRef" className={input} defaultValue={doc.externalRef ?? ""} />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label htmlFor="d-subject" className="block text-sm font-medium">Obiect (obligatoriu)</label>
                  <textarea id="d-subject" name="subject" rows={2} className={input} defaultValue={doc.subject} required />
                </div>
                <div className="md:col-span-2"><FileInput id="d-files" name="files" label="Adăugați anexe" multiple /></div>
              </ActionForm>
            </Card>
          )}
          <Card title="Date">
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="font-medium">Data înregistrării</dt><dd>{fmtDateTime(doc.registeredAt)}</dd>
              <dt className="font-medium">Corespondent</dt><dd>{doc.correspondentName}</dd>
              <dt className="font-medium">Adresă</dt><dd>{doc.correspondentAddress ?? "—"}</dd>
              <dt className="font-medium">Număr extern</dt><dd>{doc.externalRef ?? "—"}</dd>
              <dt className="font-medium">Obiect</dt><dd>{doc.subject}</dd>
              <dt className="font-medium">Tip cerere</dt><dd>{REQUEST_TYPE_LABEL[doc.requestType]}{doc.redirected && " (redirecționat)"}</dd>
              <dt className="font-medium">Canal de primire</dt><dd>{doc.intakeChannel ? INTAKE_LABEL[doc.intakeChannel] : "—"}</dd>
              <dt className="font-medium">Document legat</dt>
              <dd>{linked ? <Link className="underline" href={`/registry/${linked.id}`}>{DIRECTION_LABEL[linked.direction]} {linked.number}/{linked.year}</Link> : "—"}</dd>
            </dl>
          </Card>

          {(doc.replyDraft || canEditReply) && (
            <Card title="Răspuns">
              {canEditReply ? (
                <ActionForm action={saveReply} submit="Salvează" className="space-y-2">
                  <Hidden id={doc.id} version={v} />
                  <label htmlFor="replyDraft" className="block text-sm font-medium">Textul răspunsului (obligatoriu)</label>
                  <textarea id="replyDraft" name="replyDraft" rows={6} className={input} defaultValue={doc.replyDraft ?? ""} required />
                  <FileInput id="replyFiles" name="files" label="Anexe la răspuns" multiple />
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="intent" value="submit" /> Trimite la aprobare după salvare</label>
                </ActionForm>
              ) : <p className="whitespace-pre-wrap text-sm">{doc.replyDraft}</p>}
            </Card>
          )}

          <Card title={`Anexe (${files.length})`}>
            {files.length === 0 ? <p className="text-sm">Nicio anexă.</p> : (
              <ul className="space-y-1 text-sm">
                {files.map((f) => (
                  <li key={f.id}>
                    <a className="underline" href={`/api/attachments/${f.id}`}>{f.fileName}</a>{" "}
                    <span className="text-gray-600">· {Math.ceil(f.sizeBytes / 1024)} KB · SHA-256 <code title={f.sha256}>{f.sha256.slice(0, 12)}…</code> · {fmtDate(f.uploadedAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            {can(user.role, "document.create") && doc.status !== "filed" && doc.status !== "cancelled" && (
              <ActionForm action={addAttachments} submit="Adaugă anexe" className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={doc.id} />
                <FileInput id="moreFiles" name="files" label="Adăugați anexe" multiple />
              </ActionForm>
            )}
            <p className="mt-2 text-xs text-gray-600">Anexele nu se modifică după încărcare (R02).</p>
          </Card>

          {sent.length > 0 && (
            <Card title="Expediere">
              {sent.map((s) => (
                <p key={s.id} className="text-sm">{DISPATCH_LABEL[s.channel]} · {fmtDate(s.dispatchedOn)} · dovadă:{" "}
                  {s.proofRef}{s.proofRef && s.proofAttachmentId && " + "}
                  {s.proofAttachmentId && (() => {
                    const f = files.find((x) => x.id === s.proofAttachmentId);
                    return f ? <a className="underline" href={`/api/attachments/${f.id}`}>{f.fileName}</a> : "fișier atașat";
                  })()}
                </p>
              ))}
            </Card>
          )}

          <Card title="Istoric">
            <table className="w-full border-collapse">
              <caption className="sr-only">Istoricul documentului, în ordine cronologică</caption>
              <thead><tr><th scope="col" className={th}>Data</th><th scope="col" className={th}>Utilizator</th><th scope="col" className={th}>Acțiune</th><th scope="col" className={th}>Detalii</th></tr></thead>
              <tbody>
                {history.map(({ e, actor }) => {
                  const nv = (e.newValues ?? {}) as Record<string, unknown>;
                  const ov = (e.oldValues ?? {}) as Record<string, unknown>;
                  return (
                    <tr key={e.id}>
                      <td className={td}>{fmtDateTime(e.occurredAt)}</td>
                      <td className={td}>{actor ?? "sistem"}</td>
                      <td className={td}>{HISTORY_LABEL[e.action] ?? e.action}</td>
                      <td className={td}>
                        {e.reason && <div><strong>Motiv:</strong> {e.reason}</div>}
                        {Object.keys(nv).filter((k) => !(e.reason && k === "detalii")).map((k) => (
                          <div key={k}>{fieldLabel(k)}: {k in ov && <><del>{show(ov[k])}</del> → </>}{show(nv[k])}</div>
                        ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>

        <aside aria-label="Acțiuni" className="space-y-3">
          <div className="rounded border-l-4 border-[var(--accent)] bg-blue-50 p-3 text-sm" role="note">
            <p className="font-semibold">Pasul următor</p>
            <p>{hint}</p>
          </div>
          {anyAction && <h2 className="font-semibold">Acțiuni</h2>}
          {doc.status === "draft" && can(user.role, "document.create") && (
            <>
              <ActionForm action={confirmDraft} submit="Confirmă și atribuie număr" confirm="Numărul se atribuie definitiv. Continuați?"><Hidden id={doc.id} version={v} /></ActionForm>
              <ActionForm action={deleteDraft} submit="Șterge ciorna" submitClass={btn} confirm="Ștergeți ciorna?"><input type="hidden" name="id" value={doc.id} /></ActionForm>
            </>
          )}
          {ok("assign") && (
            <ActionForm action={assignDocument} submit={doc.assigneeId ? "Reasignează" : "Repartizează"} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Hidden id={doc.id} version={v} />
              <label htmlFor="assigneeId" className="block text-sm font-medium">Responsabil (obligatoriu)</label>
              <select id="assigneeId" name="assigneeId" className={input} defaultValue={doc.assigneeId ?? ""} required>
                <option value="">Alegeți</option>{offs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </ActionForm>
          )}
          {ok("submitForApproval") && (
            <ActionForm action={saveReply} submit="Trimite la aprobare">
              <Hidden id={doc.id} version={v} /><input type="hidden" name="replyDraft" value={doc.replyDraft ?? ""} /><input type="hidden" name="intent" value="submit" />
            </ActionForm>
          )}
          {ok("approve") && <ActionForm action={approveReply} submit="Aprobă răspunsul" confirm="Aprobați răspunsul?"><Hidden id={doc.id} version={v} /></ActionForm>}
          {ok("return") && <ReasonAction label="Returnează cu motiv" action={returnReply} id={doc.id} version={v} />}
          {ok("registerOutgoing") && (
            <ActionForm action={registerOutgoing} submit="Înregistrează ieșirea" confirm="Se atribuie un număr nou de ieșire, legat de această intrare. Continuați?"><Hidden id={doc.id} version={v} /></ActionForm>
          )}
          {ok("recordDispatch") && (
            <ActionForm action={recordDispatch} submit="Consemnează expedierea" className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Hidden id={doc.id} version={v} />
              <label htmlFor="channel" className="block text-sm font-medium">Canal (obligatoriu)</label>
              <select id="channel" name="channel" className={input} required defaultValue="email">
                {Object.entries(DISPATCH_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <label htmlFor="date" className="block text-sm font-medium">Data (obligatoriu)</label>
              <input id="date" name="date" type="date" className={input} defaultValue={todayIso()} required />
              <label htmlFor="proofRef" className="block text-sm font-medium">Dovadă: număr de confirmare</label>
              <input id="proofRef" name="proofRef" className={input} placeholder="ex. confirmare e-mail (simulată)" />
              <FileInput id="proofFile" name="proofFile" label="sau fișierul dovezii" />
            </ActionForm>
          )}
          {canFile && (
            <ActionForm action={fileDocument} submit={fileIsPrimary ? "Clasează la dosar" : "Clasează fără răspuns"} submitClass={fileIsPrimary ? undefined : btn} className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <Hidden id={doc.id} version={v} />
              <label htmlFor="dossierId" className="block text-sm font-medium">Dosar (obligatoriu)</label>
              <select id="dossierId" name="dossierId" className={input} defaultValue={doc.dossierId ?? ""} required>
                <option value="">Alegeți</option>{dos.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.title}</option>)}
              </select>
            </ActionForm>
          )}
          {(ok("extendDeadline") || ok("correctMetadata") || ok("cancel")) && <h3 className="pt-2 text-sm font-semibold text-gray-700">Alte acțiuni</h3>}
          {ok("extendDeadline") && doc.deadline && (
            <ReasonAction label="Prelungește termenul" action={extendDeadline} id={doc.id} version={v} extra={<>
              <label htmlFor="days" className="block text-sm">Zile (obligatoriu{doc.requestType === "petition" ? "; petiții: maximum 15 în total" : ""})</label>
              <input id="days" name="days" type="number" min={1} className={input} required />
            </>} />
          )}
          {ok("correctMetadata") && (
            <ReasonAction label="Corectează metadatele" action={correctMetadata} id={doc.id} version={v} extra={<>
              <label htmlFor="c-subject" className="block text-sm">Obiect</label>
              <textarea id="c-subject" name="subject" rows={2} className={input} defaultValue={doc.subject} />
              <label htmlFor="c-corr" className="block text-sm">Corespondent</label>
              <input id="c-corr" name="correspondentName" className={input} defaultValue={doc.correspondentName} />
              <label htmlFor="c-addr" className="block text-sm">Adresă</label>
              <input id="c-addr" name="correspondentAddress" className={input} defaultValue={doc.correspondentAddress ?? ""} />
              <label htmlFor="c-ext" className="block text-sm">Număr extern</label>
              <input id="c-ext" name="externalRef" className={input} defaultValue={doc.externalRef ?? ""} />
            </>} />
          )}
          {ok("cancel") && <ReasonAction label="Anulează înregistrarea" action={cancelDocument} id={doc.id} version={v} confirm="Anularea este definitivă; numărul rămâne în registru marcat Anulat. Continuați?" />}
          {doc.status === "filed" && <p className="text-sm">Documentul este închis.</p>}
        </aside>
      </div>
    </>
  );
}
