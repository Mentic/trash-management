import type { Metadata } from "next";
import "./globals.css";
import { getSession } from "@/server/auth/session";
import { can, type Permission } from "@/server/auth/rbac";
import { logout } from "@/server/actions/auth";
import { SessionTimer } from "@/components/SessionTimer";
import { NavLinks } from "@/components/NavLinks";
import { ROLE_LABEL } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Registratură și evidența deșeurilor — ADI Eco Buzău 2009",
  description: "Prototip demo (date fictive)",
};

const NAV: { href: string; label: string; perm: Permission }[] = [
  { href: "/registry", label: "Registru", perm: "registry.read" },
  { href: "/registry/dossiers", label: "Nomenclator", perm: "registry.read_all" },
  { href: "/waste/imports", label: "Import deșeuri", perm: "waste.import" },
  { href: "/waste/summary", label: "Situație pe UAT", perm: "waste.summary.read" },
  { href: "/waste/uats", label: "Date UAT și calcule", perm: "afm.read" },
  { href: "/journal", label: "Jurnal", perm: "journal.read" },
  { href: "/demo", label: "Kit demo", perm: "demo.reset" },
];

// A02, A03, A09: lang="ro", „Sari la conținut”, zone marcate; marcaj DEMO pe fiecare ecran.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isDemo = (process.env.APP_MODE ?? "demo") === "demo";
  const s = await getSession().catch(() => null);
  const user = s?.session.stage === "active" ? s.user : null;
  return (
    <html lang="ro">
      <body>
        <a href="#main" className="skip-link">Sari la conținut</a>
        {isDemo && (
          <div role="note" className="px-4 py-1.5 text-sm font-semibold" style={{ background: "var(--demo-bg)", color: "var(--demo)" }}>
            DEMO — date fictive
          </div>
        )}
        <header className="no-print border-b px-4 py-2">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">ADI Eco Buzău 2009 — Registratură și evidența deșeurilor</p>
            {user && (
              <div className="flex items-center gap-3 text-sm">
                <span>{user.displayName} · {ROLE_LABEL[user.role]}</span>
                <form action={logout}><button className="rounded border px-2 py-1">Deconectare</button></form>
              </div>
            )}
          </div>
          {user && (
            <nav aria-label="Navigare principală" className="mx-auto mt-2 flex max-w-7xl flex-wrap gap-1">
              <NavLinks items={NAV.filter((n) => can(user.role, n.perm)).map(({ href, label }) => ({ href, label }))} />
            </nav>
          )}
        </header>
        <main id="main" className="mx-auto max-w-7xl p-4">{children}</main>
        {user && <SessionTimer />}
      </body>
    </html>
  );
}
