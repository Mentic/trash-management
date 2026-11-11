import type { Metadata } from "next";
import "@fontsource-variable/inter";
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
      <body className="min-h-screen">
        <a href="#main" className="skip-link">Sari la conținut</a>
        <header className="no-print sticky top-0 z-40 border-b border-[var(--hairline)] bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
            <div className="flex items-center gap-3">
              <span className="text-[15px] font-semibold tracking-tight">ADI Eco Buzău</span>
              {isDemo && <span role="note" className="rounded-full bg-[#f5f5f7] px-2.5 py-0.5 text-[12px] text-[var(--ink-2)]">DEMO — date fictive</span>}
            </div>
            {user && (
              <nav aria-label="Navigare principală" className="hidden flex-1 justify-center gap-1 md:flex">
                <NavLinks items={NAV.filter((n) => can(user.role, n.perm)).map(({ href, label }) => ({ href, label }))} />
              </nav>
            )}
            {user && (
              <div className="flex items-center gap-3 text-[13px]">
                <span className="text-[var(--ink-2)]"><span className="font-medium text-[var(--ink)]">{user.displayName}</span> · {ROLE_LABEL[user.role]}</span>
                <form action={logout}><button className="text-[var(--accent)] hover:underline">Deconectare</button></form>
              </div>
            )}
          </div>
          {user && (
            <nav aria-label="Navigare principală (mobil)" className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden">
              <NavLinks items={NAV.filter((n) => can(user.role, n.perm)).map(({ href, label }) => ({ href, label }))} />
            </nav>
          )}
        </header>
        <main id="main" className="mx-auto max-w-6xl px-6 py-10">{children}</main>
        {user && <SessionTimer />}
      </body>
    </html>
  );
}
