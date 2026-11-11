// R08, N04 — exportul conține exact lista filtrată (aceeași interogare și același scope ca ecranul).
import { getSession } from "@/server/auth/session";
import { listDocuments } from "@/server/queries/registry";
import { toRomanianCsv } from "@/domain/csv";
import { DIRECTION_LABEL, DOC_STATUS_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { fmtDate, todayIso } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await getSession();
  if (!s || s.session.stage !== "active") return new Response("Neautentificat", { status: 401 });
  const user = { id: s.user.id, username: s.user.username, displayName: s.user.displayName, role: s.user.role };
  const f = Object.fromEntries(new URL(req.url).searchParams);
  const { rows } = await listDocuments(user, f, { all: true });
  const csv = toRomanianCsv(
    ["Număr", "Data înregistrării", "Sens", "Corespondent", "Număr extern", "Obiect", "Tip cerere", "Stare", "Responsabil", "Termen", "Dosar"],
    rows.map((r) => [
      r.number ? `${r.number}/${r.year}` : "ciornă", fmtDate(r.registeredAt), DIRECTION_LABEL[r.direction], r.correspondentName,
      r.externalRef, r.subject, REQUEST_TYPE_LABEL[r.requestType], DOC_STATUS_LABEL[r.status], r.assigneeName, fmtDate(r.deadline), r.dossierCode,
    ]),
  );
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="registru_${todayIso()}.csv"` },
  });
}
