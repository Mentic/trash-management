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
    <section aria-labelledby="login-title" className="mx-auto max-w-[380px] pt-8">
      <h1 id="login-title" className="text-center text-[32px] font-semibold">Autentificare</h1>
      <p className="mb-8 mt-2 text-center text-[15px] text-[var(--ink-2)]">Registratură și evidența deșeurilor</p>
      {expired && <p role="status" className="mb-4 text-center text-[14px] text-[var(--amber)]">Sesiunea a expirat. Autentificați-vă din nou.</p>}
      <LoginForm demoAccounts={isDemo ? DEMO_ACCOUNTS : undefined} />
    </section>
  );
}
