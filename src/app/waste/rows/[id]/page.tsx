// D04, D08 — tichetul de cântar din spatele unui total: toate câmpurile, semnalările, importul și raportul legat.
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditEvents, documents, facilities, imports, uats, users, wasteFlags, wasteRowRouteUats, wasteRows } from "@/db/schema";
import { requireUser, can } from "@/server/auth/rbac";
import { Badge, Card, PageTitle, th, td } from "@/components/ui";
import { RowStatusBadge } from "@/components/badges";
import { DESTINATION_LABEL, FRACTION_LABEL, RULE_LABEL } from "@/lib/labels";
import { fmtDateTime, fmtPeriod, fmtT } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function RowPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!can(user.role, "waste.summary.read")) notFound();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [row] = await db.select({ r: wasteRows, uat: uats.name, facility: facilities.name, imp: imports, docNumber: documents.number, docYear: documents.year, docId: documents.id })
    .from(wasteRows).leftJoin(uats, eq(uats.id, wasteRows.uatId)).innerJoin(facilities, eq(facilities.id, wasteRows.facilityId))
    .innerJoin(imports, eq(imports.id, wasteRows.importId)).leftJoin(documents, eq(documents.id, imports.documentId)).where(eq(wasteRows.id, id));
  if (!row) notFound();
  const [flags, route, history] = await Promise.all([
    db.select().from(wasteFlags).where(eq(wasteFlags.rowId, id)),
    db.select({ name: uats.name }).from(wasteRowRouteUats).innerJoin(uats, eq(uats.id, wasteRowRouteUats.uatId)).where(eq(wasteRowRouteUats.rowId, id)),
    db.select({ e: auditEvents, actor: users.displayName }).from(auditEvents).leftJoin(users, eq(users.id, auditEvents.actorId)).where(eq(auditEvents.entityId, id)).orderBy(asc(auditEvents.occurredAt)),
  ]);
  const r = row.r;
  const diff = r.ticketKg === null ? null : r.reportedKg - r.ticketKg;
  return (
    <>
      <nav aria-label="Firimituri" className="mb-2 text-sm">
        <Link className="text-[var(--accent)] hover:underline" href="/waste/summary">Situație pe UAT</Link>
        {r.uatId && <> › <Link className="text-[var(--accent)] hover:underline" href={`/waste/summary/${r.uatId}?year=${r.year}`}>{row.uat}</Link> › <Link className="text-[var(--accent)] hover:underline" href={`/waste/summary/${r.uatId}?year=${r.year}&period=${r.period.slice(0, 7)}`}>{fmtPeriod(r.period.slice(0, 7))}</Link></>}
        {" › "}<span aria-current="page">Tichet {r.ticketNo}</span>
      </nav>
      <PageTitle>Tichet de cântar {r.ticketNo}</PageTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Cursa">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Stare</dt><dd><RowStatusBadge status={r.status} />{r.statusReason && ` — ${r.statusReason}`}</dd>
            <dt className="font-medium">Perioada</dt><dd>{fmtPeriod(r.period.slice(0, 7))}</dd>
            <dt className="font-medium">Data cântăririi</dt><dd>{fmtDateTime(r.weighedAt)}</dd>
            <dt className="font-medium">Nr. auto</dt><dd>{r.vehicleNo}</dd>
            <dt className="font-medium">Operator (CUI)</dt><dd>{r.operatorCui}</dd>
            <dt className="font-medium">UAT</dt><dd>{row.uat ?? <Badge tone="amber" icon="?">neatribuit</Badge>}</dd>
            <dt className="font-medium">Rută comună</dt><dd>{r.sharedRoute ? `Da: ${route.map((x) => x.name).join(", ")}` : "Nu"}</dd>
            <dt className="font-medium">Cod LER</dt><dd>{r.lerCode}</dd>
            <dt className="font-medium">Fracție</dt><dd>{FRACTION_LABEL[r.fraction]}</dd>
            <dt className="font-medium">Destinație</dt><dd>{DESTINATION_LABEL[r.destinationType]} — {row.facility}</dd>
          </dl>
        </Card>
        <Card title="Cantitate și dovezi">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="font-medium">Raportat de operator</dt><dd className="font-semibold">{fmtT(r.reportedKg)}</dd>
            <dt className="font-medium">Pe tichetul de cântar</dt><dd>{r.ticketKg === null ? "—" : fmtT(r.ticketKg)}</dd>
            <dt className="font-medium">Diferență</dt><dd>{diff === null ? "—" : fmtT(diff)}</dd>
            <dt className="font-medium">Document justificativ</dt><dd>{r.supportingDoc ?? "—"}</dd>
            <dt className="font-medium">Import</dt><dd>{row.imp.fileName}, linia {r.lineNo}</dd>
            <dt className="font-medium">Raportul în registratură</dt>
            <dd>{row.docId ? <Link className="text-[var(--accent)] hover:underline" href={`/registry/${row.docId}`}>intrarea {row.docNumber}/{row.docYear}</Link> : "raport 2025 (set demo, fără intrare)"}</dd>
          </dl>
          <p className="mt-2 text-xs text-[var(--ink-2)]">Atașarea scanării tichetului ca dovadă (D04) este în Etapa 2.</p>
        </Card>
      </div>
      {(flags.length > 0 || history.length > 0) && (
        <Card title="Semnalări și istoric" className="mt-4">
          <table className="w-full border-collapse">
            <thead><tr><th scope="col" className={th}>Regula / acțiunea</th><th scope="col" className={th}>Stare</th><th scope="col" className={th}>Motiv</th></tr></thead>
            <tbody>
              {flags.map((f) => <tr key={f.id}><td className={td}>{f.rule} {RULE_LABEL[f.rule]}</td><td className={td}>{f.resolvedAt ? `rezolvată ${fmtDateTime(f.resolvedAt)}` : <Badge tone="red" icon="⚑">deschisă</Badge>}</td><td className={td}>{f.resolutionReason ?? ""}</td></tr>)}
              {history.map(({ e, actor }) => <tr key={e.id}><td className={td}>{e.action}</td><td className={td}>{fmtDateTime(e.occurredAt)} · {actor}</td><td className={td}>{e.reason ?? ""}</td></tr>)}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
