import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";
import { LogOut, Recycle, TriangleAlert } from "lucide-react";
import { Toaster } from "@/components/Toast";
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
        {isDemo && (
          <div role="note" className="flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-semibold" style={{ background: "var(--demo-bg)", color: "var(--demo)" }}>
            <TriangleAlert className="size-3.5" aria-hidden />DEMO — date fictive
          </div>
        )}
        <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-700 text-white shadow-sm" aria-hidden>
                <Recycle className="size-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-slate-900">ADI Eco Buzău 2009</p>
                <p className="text-xs text-slate-500">Registratură și evidența deșeurilor</p>
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-full bg-teal-100 text-xs font-semibold text-teal-900" aria-hidden>
                    {user.displayName.slice(0, 1)}
                  </span>
                  <span className="leading-tight">
                    <span className="block font-medium">{user.displayName}</span>
                    <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
                  </span>
                </span>
                <form action={logout}>
                  <button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50">
                    <LogOut className="size-4" aria-hidden />Deconectare
                  </button>
                </form>
              </div>
            )}
          </div>
          {user && (
            <nav aria-label="Navigare principală" className="mx-auto flex max-w-7xl flex-wrap gap-1 px-4 pb-2">
              <NavLinks items={NAV.filter((n) => can(user.role, n.perm)).map(({ href, label }) => ({ href, label }))} />
            </nav>
          )}
        </header>
        <main id="main" className="mx-auto max-w-7xl px-4 py-6">{children}</main>
        {user && <SessionTimer />}
        <Toaster />
      </body>
    </html>
  );
}
