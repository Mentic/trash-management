// S01, A07, A08 — ecranul de autentificare; în modul demo, conturile se aleg cu un click.
import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { allTenants } from "@/server/queries/tenant";
import { Emblem } from "@/components/TenantMark";

const DEMO_ACCOUNTS = [
  { user: "ana.registrator", role: "Ana — Registrator", password: "Registru!2026" },
  { user: "mihai.responsabil", role: "Mihai — Responsabil ADI", password: "Deseuri!2026" },
  { user: "elena.director", role: "Elena — Director", password: "Aprobare!2026" },
];

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string }> }) {
  const { expired } = await searchParams;
  const isDemo = (process.env.APP_MODE ?? "demo") === "demo";
  const tenants = await allTenants().catch(() => []);
  return (
    <section aria-labelledby="login-title" className="mx-auto max-w-[380px] pt-8">
      <h1 id="login-title" className="text-center text-[32px] font-semibold">Autentificare</h1>
      <p className="mb-8 mt-2 text-center text-[15px] text-[var(--ink-2)]">Registratură și evidența deșeurilor</p>
      {expired && <p role="status" className="mb-4 text-center text-[14px] text-[var(--amber)]">Sesiunea a expirat. Autentificați-vă din nou.</p>}
      <LoginForm demoAccounts={isDemo ? DEMO_ACCOUNTS : undefined} />
      {tenants.length > 0 && (
        <nav aria-labelledby="portals" className="mt-10">
          <h2 id="portals" className="mb-3 px-1 font-sans text-[13px] font-normal text-[var(--ink-2)]">Portalurile primăriilor membre</h2>
          <ul className="grid grid-cols-4 gap-3 sm:grid-cols-7">
            {tenants.map((t) => (
              <li key={t.id}>
                <Link href={`/p/${t.slug}`} className="flex flex-col items-center gap-1 rounded-xl p-1.5 text-center text-[11px] leading-tight text-[var(--ink-2)] hover:bg-white" title={t.townHall}>
                  <Emblem slug={t.slug!} name={t.townHall} size={30} />
                  {t.name.replace(/^(Municipiul|Orașul|Comuna) /, "")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </section>
  );
}
