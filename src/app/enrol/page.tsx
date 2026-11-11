// S02, A08 — înrolarea 2FA: cod QR + cheia în text, contul devine activ doar după un cod valid.
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { getSession } from "@/server/auth/session";
import { pendingSecretFor } from "@/server/auth/enrolment";
import { otpauthUri } from "@/domain/totp";
import { EnrolFlow } from "./EnrolForm";

export const dynamic = "force-dynamic";

export default async function EnrolPage() {
  const s = await getSession();
  if (s?.session.stage === "active") redirect("/registry");
  if (!s || s.session.stage !== "enrolling") redirect("/login");
  const secret = await pendingSecretFor(s.session.id);
  const svg = await QRCode.toString(otpauthUri(secret, s.user.username), { type: "svg", margin: 1, width: 220 });
  return <EnrolFlow secret={secret.match(/.{1,4}/g)!.join(" ")} qrSvg={svg} username={s.user.username} displayName={s.user.displayName} />;
}
