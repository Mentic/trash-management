// S01, A07, A08 — ecranul de autentificare.
import { LoginForm } from "./LoginForm";

const DEMO_ACCOUNTS = [
  { user: "ana.registrator", role: "Registrator", password: "Registru!2026" },
  { user: "mihai.responsabil", role: "Responsabil ADI", password: "Deseuri!2026" },
  { user: "elena.director", role: "Director", password: "Aprobare!2026" },
];

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  const isDemo = (process.env.APP_MODE ?? "demo") === "demo";
  return (
    <section aria-labelledby="login-title" className="max-w-sm">
      <h1 id="login-title" className="mb-4 text-xl font-semibold">Autentificare</h1>
      {expired && <p role="status" className="mb-3 text-sm">Sesiunea a expirat. Autentificați-vă din nou.</p>}
      <LoginForm />
      {isDemo && (
        <table className="mt-6 text-sm">
          <caption className="text-left font-semibold">Conturi demo</caption>
          <thead><tr><th scope="col" className="pr-4 text-left">Utilizator</th><th scope="col" className="pr-4 text-left">Rol</th><th scope="col" className="text-left">Parolă</th></tr></thead>
          <tbody>
            {DEMO_ACCOUNTS.map((a) => (
              <tr key={a.user}><td className="pr-4">{a.user}</td><td className="pr-4">{a.role}</td><td><code>{a.password}</code></td></tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
