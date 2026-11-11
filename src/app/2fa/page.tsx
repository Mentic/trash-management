// S03, S04, S05, A08 — codul de 6 cifre sau un cod de recuperare.
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { MfaForm } from "./MfaForm";

export const dynamic = "force-dynamic";

export default async function MfaPage() {
  const s = await getSession();
  if (!s || s.session.stage !== "password_ok") redirect("/login");
  return (
    <section aria-labelledby="mfa-title" className="max-w-sm">
      <h1 id="mfa-title" className="mb-2 text-xl font-semibold">Cod de autentificare</h1>
      <p className="mb-4 text-sm">Introduceți codul de 6 cifre din aplicația de pe telefon pentru <strong>{s.user.displayName}</strong>.</p>
      <MfaForm />
    </section>
  );
}
