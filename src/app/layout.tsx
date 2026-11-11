import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/noto-serif";
import "./globals.css";
import { getSession } from "@/server/auth/session";
import { can, type Permission } from "@/server/auth/rbac";
import { logout } from "@/server/actions/auth";
import { SessionTimer } from "@/components/SessionTimer";
import { NavLinks } from "@/components/NavLinks";
import { FolkBand } from "@/components/FolkBand";
import { Emblem } from "@/components/TenantMark";
import { tenantById } from "@/server/queries/tenant";
import { ROLE_LABEL } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Registratură și evidența deșeurilor — ADI Eco Buzău 2009",
  description: "Prototip demo (date fictive)",
};

const NAV: { href: string; label: string; perm: Permission; only?: "mayor" | "staff" }[] = [
  { href: "/portal", label: "Portalul primăriei", perm: "portal.read", only: "mayor" },
  { href: "/registry", label: "Registru", perm: "registry.read" },
  { href: "/registry/dossiers", label: "Nomenclator", perm: "registry.read_all" },
  { href: "/waste/imports", label: "Import deșeuri", perm: "waste.import" },
  { href: "/waste/summary", label: "Situație pe UAT", perm: "waste.summary.read" },
  { href: "/waste/uats", label: "Date UAT și calcule", perm: "afm.read" },
  { href: "/journal", label: "Jurnal", perm: "journal.read" },
  { href: "/tenants", label: "Primării", perm: "portal.preview", only: "staff" },
  { href: "/demo", label: "Kit demo", perm: "demo.reset" },
];

// A02, A03, A09: lang="ro", „Sari la conținut”, zone marcate; marcaj DEMO pe fiecare ecran.
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isDemo = (process.env.APP_MODE ?? "demo") === "demo";
  const s = await getSession().catch(() => null);
  const user = s?.session.stage === "active" ? s.user : null;
  // Multi-tenant: un cont de primărie vede aplicația în culorile și cu stema primăriei sale.
  const tenant = user?.role === "mayor" && user.uatId ? await tenantById(user.uatId).catch(() => null) : null;
  const navItems = user ? NAV.filter((n) => can(user.role, n.perm) && (!n.only || (n.only === "mayor") === (user.role === "mayor"))).map(({ href, label }) => ({ href, label })) : [];
  const brandStyle = tenant ? ({ "--accent": tenant.color, "--accent-hover": `color-mix(in srgb, ${tenant.color} 82%, black)`, "--accent-soft": `color-mix(in srgb, ${tenant.color} 8%, white)` } as React.CSSProperties) : undefined;
  return (
    <html lang="ro">
      <body className="flex min-h-screen flex-col" style={brandStyle}>
        <a href="#main" className="skip-link">Sari la conținut</a>
        <header className="no-print sticky top-0 z-40 border-b border-[var(--hairline)] bg-white/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
            <div className="flex min-w-0 items-center gap-3">
              {tenant ? (
                <span className="flex items-center gap-2.5">
                  <Emblem slug={tenant.slug!} name={tenant.townHall} size={26} />
                  <span className="leading-tight">
                    <span className="block font-serif text-[15px] font-semibold">{tenant.townHall}</span>
                    <span className="block text-[11px] text-[var(--ink-2)]">Portal · ADI Eco Buzău 2009</span>
                  </span>
                </span>
              ) : <span className="font-serif text-[16px] font-semibold">ADI Eco Buzău 2009</span>}
              {isDemo && <span role="note" className="hidden rounded-full bg-[#efece4] px-2.5 py-0.5 text-[12px] text-[var(--ink-2)] sm:inline">DEMO — date fictive</span>}
            </div>
            {user && (
              <div className="flex shrink-0 items-center gap-3 text-[13px]">
                <span className="text-[var(--ink-2)]">
                  {tenant ? "Cont demo" : <><span className="font-medium text-[var(--ink)]">{user.displayName}</span> · {ROLE_LABEL[user.role]}</>}
                </span>
                <form action={logout}><button className="text-[var(--accent)] hover:underline">Deconectare</button></form>
              </div>
            )}
          </div>
          {user && navItems.length > 1 && (
            <nav aria-label="Navigare principală" className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 pb-2">
              <NavLinks items={navItems} />
            </nav>
          )}
          <FolkBand />
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">{children}</main>
        <footer className="no-print mt-8">
          <FolkBand className="opacity-40" />
          <p className="mx-auto max-w-6xl px-6 py-4 text-[12px] text-[var(--ink-2)]">
            {tenant ? `${tenant.townHall} · ` : ""}Asociația de Dezvoltare Intercomunitară „Eco Buzău 2009” · județul Buzău
          </p>
        </footer>
        {user && <SessionTimer />}
      </body>
    </html>
  );
}
