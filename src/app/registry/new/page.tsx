// R01, R04, R05 — înregistrarea unui document (fără câmp CNP).
import { requireUser } from "@/server/auth/rbac";
import { PageTitle, Crumbs } from "@/components/ui";
import { NewDocumentForm } from "./NewDocumentForm";
import { fmtDate, todayIso } from "@/lib/format";

export default async function NewDocumentPage() {
  await requireUser("document.create");
  return (
    <>
      <Crumbs items={[{ href: "/registry", label: "Registru" }, { label: "Document nou" }]} />
      <PageTitle>Înregistrare document</PageTitle>
      <p className="mb-4 text-sm">Data înregistrării: <strong>{fmtDate(todayIso())}</strong>. Numărul se atribuie la confirmare.</p>
      <NewDocumentForm today={todayIso()} />
    </>
  );
}
