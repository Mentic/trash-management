// S01, A07, A08 — ecranul de autentificare. Fluxul server (parolă → TOTP) se adaugă în săptămâna 1.
const DEMO_ACCOUNTS = [
  { user: "ana.registrator", role: "Registrator", password: "Registru!2026" },
  { user: "mihai.responsabil", role: "Responsabil ADI", password: "Deseuri!2026" },
  { user: "elena.director", role: "Director", password: "Aprobare!2026" },
];

export default function LoginPage() {
  const isDemo = (process.env.APP_MODE ?? "demo") === "demo";
  return (
    <section aria-labelledby="login-title" className="max-w-sm">
      <h1 id="login-title" className="mb-4 text-xl font-semibold">Autentificare</h1>
      <form className="space-y-3">
        <div>
          <label htmlFor="username" className="block text-sm font-medium">Utilizator (obligatoriu)</label>
          <input id="username" name="username" autoComplete="username" required className="w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Parolă (obligatoriu)</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded border px-2 py-1" />
        </div>
        <button type="submit" disabled className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-60">
          Continuă
        </button>
        <p className="text-sm">Autentificarea se activează în săptămâna 1 (S01–S03).</p>
      </form>
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
