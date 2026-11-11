// S01, A07, A08 — ecranul de autentificare; în modul demo, conturile se aleg cu un click.
import { FileText, ShieldCheck, Truck } from "lucide-react";
import { LoginForm } from "./LoginForm";

const DEMO_ACCOUNTS = [
  { user: "ana.registrator", role: "Ana — Registrator", password: "Registru!2026" },
  { user: "mihai.responsabil", role: "Mihai — Responsabil ADI", password: "Deseuri!2026" },
  { user: "elena.director", role: "Elena — Director", password: "Aprobare!2026" },
];

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  const isDemo = (process.env.APP_MODE ?? "demo") === "demo";
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-gradient-to-br from-teal-700 via-teal-800 to-emerald-900 p-10 text-white md:flex">
        <div>
          <p className="text-sm font-medium text-teal-100">ADI Eco Buzău 2009</p>
          <p className="mt-2 text-3xl font-semibold leading-tight">Registratură și evidența deșeurilor</p>
          <p className="mt-3 text-sm text-teal-100">Documentele asociației și controlul raportului operatorului, într-un singur loc.</p>
        </div>
        <ul className="space-y-4 text-sm">
          <li className="flex gap-3"><FileText className="size-5 shrink-0" aria-hidden />Registru unic, termene calculate, istoric complet</li>
          <li className="flex gap-3"><Truck className="size-5 shrink-0" aria-hidden />Raportul operatorului verificat față de tichetele de cântar</li>
          <li className="flex gap-3"><ShieldCheck className="size-5 shrink-0" aria-hidden />Autentificare în doi pași, găzduire în UE</li>
        </ul>
      </div>
      <section aria-labelledby="login-title" className="p-8 md:p-10">
        <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Autentificare</h1>
        <p className="mb-6 mt-1 text-sm text-slate-600">Introduceți utilizatorul și parola; apoi codul din aplicația de pe telefon.</p>
        {expired && <p role="status" className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">Sesiunea a expirat. Autentificați-vă din nou.</p>}
        <LoginForm demoAccounts={isDemo ? DEMO_ACCOUNTS : undefined} />
      </section>
    </div>
  );
}
