// Ecran temporar după autentificare; registrul complet vine în săptămâna 2 (R01–R09).
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/session";
import { logout } from "@/server/actions/auth";

export const dynamic = "force-dynamic";

const ROLE_LABEL = { registrar: "Registrator", officer: "Responsabil ADI", director: "Director" } as const;

export default async function RegistryPage() {
  const s = await getSession();
  if (!s || s.session.stage !== "active") redirect("/login");
  return (
    <section aria-labelledby="reg-title">
      <div className="mb-4 flex items-center justify-between">
        <h1 id="reg-title" className="text-xl font-semibold">Registrul documentelor</h1>
        <form action={logout}><button className="rounded border px-3 py-1 text-sm">Deconectare</button></form>
      </div>
      <p>Autentificat ca <strong>{s.user.displayName}</strong> — {ROLE_LABEL[s.user.role]}.</p>
      <p className="mt-2 text-sm">Registrul, fișa documentului și modulul de deșeuri urmează (plan, săptămânile 2–3).</p>
    </section>
  );
}
