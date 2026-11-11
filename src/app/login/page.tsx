// S01, A07, A08 — ecranul de autentificare; în modul demo, conturile se aleg cu un click.
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
    <section aria-labelledby="login-title" className="max-w-sm">
      <h1 id="login-title" className="mb-4 text-xl font-semibold">Autentificare</h1>
      {expired && <p role="status" className="mb-3 text-sm">Sesiunea a expirat. Autentificați-vă din nou.</p>}
      <LoginForm demoAccounts={isDemo ? DEMO_ACCOUNTS : undefined} />
    </section>
  );
}
