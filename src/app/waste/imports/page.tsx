// D05 — importul raportului operatorului, legat obligatoriu de intrarea din registratură.
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, imports } from "@/db/schema";
import { requireUser } from "@/server/auth/rbac";
import { operatorReports } from "@/server/queries/waste";
import { PageTitle, Card, input, th, td } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { importCsv } from "@/server/actions/waste";
import { fmtDateTime } from "@/lib/format";
import { FileInput } from "@/components/FileInput";

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  await requireUser("waste.import");
  const [reports, recent] = await Promise.all([
    operatorReports(),
    db.select({ i: imports, number: documents.number, year: documents.year }).from(imports).leftJoin(documents, eq(documents.id, imports.documentId))
      .where(eq(imports.isSeed, false)).orderBy(desc(imports.uploadedAt)).limit(30),
  ]);
  return (
    <>
      <PageTitle>Import și verificare</PageTitle>
      <Card title="Import nou" className="mb-6">
        {reports.length === 0 ? (
          <p className="text-sm">Nu există niciun raport al operatorului înregistrat ca intrare. Registratorul îl înregistrează întâi (tip „Raport operator”).</p>
        ) : (
          <ActionForm action={importCsv} submit="Importă și verifică" className="grid max-w-2xl gap-3">
            <div>
              <label htmlFor="documentId" className="block text-sm font-medium">1. Intrarea din registratură a raportului (obligatoriu)</label>
              <select id="documentId" name="documentId" className={input} required defaultValue="">
                <option value="">Alegeți</option>
                {reports.map((r) => <option key={r.id} value={r.id}>{r.number}/{r.year} — {r.subject}</option>)}
              </select>
            </div>
            <FileInput id="file" name="file" label="2. Fișierul CSV primit de la operator (UTF-8, separator „;”, zecimale cu virgulă; maximum 10 MB)" accept=".csv,text/csv" required />
          </ActionForm>
        )}
      </Card>
      <h2 className="mb-2 font-semibold">Importuri recente</h2>
      {recent.length === 0 ? <p className="text-sm">Niciun import încă.</p> : (
        <table className="w-full border-collapse">
          <thead><tr><th scope="col" className={th}>Data</th><th scope="col" className={th}>Fișier</th><th scope="col" className={th}>Intrare</th><th scope="col" className={th}>Total</th><th scope="col" className={th}>Respinse</th><th scope="col" className={th}>Semnalate</th><th scope="col" className={th}>Curate</th></tr></thead>
          <tbody>{recent.map(({ i, number, year }) => (
            <tr key={i.id}><td className={td}><Link className="underline" href={`/waste/imports/${i.id}`}>{fmtDateTime(i.uploadedAt)}</Link></td><td className={td}>{i.fileName}</td>
              <td className={td}>{number}/{year}</td><td className={td}>{i.totalRows}</td><td className={td}>{i.rejectedRows}</td><td className={td}>{i.flaggedRows}</td><td className={td}>{i.cleanRows}</td></tr>
          ))}</tbody>
        </table>
      )}
    </>
  );
}
