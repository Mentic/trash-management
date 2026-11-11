// S02, A08 — înrolarea 2FA: cod QR + cheia în text, contul devine activ doar după un cod valid.
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/server/auth/session";
import { pendingSecretFor } from "@/server/auth/enrolment";
import { otpauthUri } from "@/domain/totp";
import { EnrolForm } from "./EnrolForm";

export const dynamic = "force-dynamic";

export default async function EnrolPage() {
  const s = await getSession();
  if (s?.session.stage === "active") redirect("/registry");
  if (!s || s.session.stage !== "enrolling") redirect("/login");
  const secret = await pendingSecretFor(s.session.id);
  const svg = await QRCode.toString(otpauthUri(secret, s.user.username), { type: "svg", margin: 1, width: 220 });
  const grouped = secret.match(/.{1,4}/g)!.join(" ");

  return (
    <section aria-labelledby="enrol-title" className="max-w-lg">
      <h1 id="enrol-title" className="mb-2 text-xl font-semibold">Activați autentificarea în doi pași</h1>
      <p className="mb-4 text-sm">Utilizator: <strong>{s.user.displayName}</strong></p>
      <ol className="list-decimal space-y-4 pl-5">
        <li>
          Deschideți aplicația de autentificare de pe telefon (Google Authenticator, Microsoft Authenticator) și scanați codul QR.
          <div role="img" aria-label={`Cod QR pentru contul ${s.user.username}`} className="mt-2 w-[220px]" dangerouslySetInnerHTML={{ __html: svg }} />
        </li>
        <li>
          Dacă nu puteți scana, introduceți manual cheia:
          <EnrolForm secret={grouped} />
        </li>
      </ol>
    </section>
  );
}
