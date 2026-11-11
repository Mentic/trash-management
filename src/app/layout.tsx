import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Registratură și evidența deșeurilor — ADI Eco Buzău 2009",
  description: "Prototip demo (date fictive)",
};

const isDemo = (process.env.APP_MODE ?? "demo") === "demo";

// A02, A03, A09: lang="ro", „Sari la conținut”, zone marcate; marcaj DEMO pe fiecare ecran.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body>
        <a href="#main" className="skip-link">Sari la conținut</a>
        {isDemo && (
          <div role="note" className="px-4 py-2 text-sm font-semibold" style={{ background: "var(--demo-bg)", color: "var(--demo)" }}>
            DEMO — date fictive
          </div>
        )}
        <header className="border-b px-4 py-3 no-print">
          <p className="font-semibold">ADI Eco Buzău 2009 — Registratură și evidența deșeurilor</p>
        </header>
        <main id="main" className="mx-auto max-w-5xl p-4">{children}</main>
      </body>
    </html>
  );
}
