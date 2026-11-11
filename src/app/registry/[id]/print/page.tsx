// N06 — fișa pe A4, fără navigare; istoricul limitat la ultimele 15 evenimente.
import { requireUser } from "@/server/auth/rbac";
import { getDocument } from "@/server/queries/document";
import { DIRECTION_LABEL, DOC_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { HISTORY_LABEL } from "@/lib/history";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("registry.read");
  const { id } = await params;
  const { doc, assigneeName, dossier, linked, files, history } = await getDocument(user, id);
  const last = history.slice(-15);
  return (
    <article className="mx-auto max-w-[180mm] text-[11pt]">
      <PrintButton />
      <header className="mb-3 border-b pb-2">
        <p className="text-sm">ADI Eco Buzău 2009 — Registratură · <strong>DEMO — date fictive</strong></p>
        <h1 className="text-xl font-semibold">{DIRECTION_LABEL[doc.direction]} nr. {doc.number}/{doc.year}</h1>
      </header>
      <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1">
        <dt className="font-semibold">Data înregistrării</dt><dd>{fmtDateTime(doc.registeredAt)}</dd>
        <dt className="font-semibold">Stare</dt><dd>{DOC_STATUS_LABEL[doc.status]}</dd>
        <dt className="font-semibold">Corespondent</dt><dd>{doc.correspondentName}{doc.correspondentAddress && `, ${doc.correspondentAddress}`}</dd>
        <dt className="font-semibold">Număr extern</dt><dd>{doc.externalRef ?? "—"}</dd>
        <dt className="font-semibold">Obiect</dt><dd>{doc.subject}</dd>
        <dt className="font-semibold">Tip cerere</dt><dd>{REQUEST_TYPE_LABEL[doc.requestType]}</dd>
        <dt className="font-semibold">Responsabil</dt><dd>{assigneeName ?? "—"}</dd>
        <dt className="font-semibold">Termen</dt><dd>{fmtDate(doc.deadline)}</dd>
        <dt className="font-semibold">Dosar</dt><dd>{dossier ? `${dossier.code} — ${dossier.title} (păstrare ${dossier.retention})` : "—"}</dd>
        <dt className="font-semibold">Document legat</dt><dd>{linked ? `${DIRECTION_LABEL[linked.direction]} ${linked.number}/${linked.year}` : "—"}</dd>
        <dt className="font-semibold">Anexe</dt><dd>{files.map((f) => f.fileName).join(", ") || "—"}</dd>
      </dl>
      <h2 className="mt-4 font-semibold">Istoric{history.length > 15 && " (ultimele 15; istoricul complet în aplicație)"}</h2>
      <table className="w-full border-collapse text-[10pt]">
        <thead><tr><th scope="col" className="border-b text-left">Data</th><th scope="col" className="border-b text-left">Utilizator</th><th scope="col" className="border-b text-left">Acțiune</th><th scope="col" className="border-b text-left">Motiv</th></tr></thead>
        <tbody>{last.map(({ e, actor }) => (
          <tr key={e.id}><td>{fmtDateTime(e.occurredAt)}</td><td>{actor ?? "sistem"}</td><td>{HISTORY_LABEL[e.action] ?? e.action}</td><td>{e.reason ?? ""}</td></tr>
        ))}</tbody>
      </table>
      <footer className="mt-6 border-t pt-1 text-[9pt]">Imprimat la {fmtDateTime(new Date())} de {user.displayName}</footer>
    </article>
  );
}
