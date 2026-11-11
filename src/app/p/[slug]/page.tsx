// Multi-tenant: pagina de autentificare a portalului unei primării, în identitatea ei vizuală.
import Link from "next/link";
import { notFound } from "next/navigation";
import { tenantBySlug } from "@/server/queries/tenant";
import { DEMO_TENANT_PASSWORD, tenantUsername } from "@/seed/tenants";
import { Emblem } from "@/components/TenantMark";
import { FolkBand } from "@/components/FolkBand";
import { BrandBody } from "@/components/BrandBody";
import { LoginForm } from "../../login/LoginForm";

export const dynamic = "force-dynamic";

export default async function TenantLoginPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await tenantBySlug(slug);
  if (!t) notFound();
  const isDemo = (process.env.APP_MODE ?? "demo") === "demo";
  const style = { "--accent": t.color, "--accent-hover": `color-mix(in srgb, ${t.color} 82%, black)` } as React.CSSProperties;
  return (
    <section aria-labelledby="t-title" className="mx-auto max-w-[400px] pt-4" style={style}>
      <BrandBody color={t.color} />
      <div className="flex flex-col items-center text-center">
        <Emblem slug={t.slug!} name={t.townHall} size={72} />
        <h1 id="t-title" className="mt-4 text-[30px] leading-tight">{t.townHall}</h1>
        <p className="mt-1 text-[15px] text-[var(--ink-2)]">Portalul serviciului de salubrizare</p>
        <FolkBand className="mt-5 max-w-[220px]" />
      </div>
      <div className="mt-8">
        <LoginForm demoAccounts={isDemo ? [{ user: tenantUsername(t.slug!), role: `${t.townHall}`, password: DEMO_TENANT_PASSWORD }] : undefined} />
      </div>
      <p className="mt-8 text-center text-[13px] text-[var(--ink-2)]">
        În parteneriat cu ADI Eco Buzău 2009 · <Link className="text-[var(--accent)] hover:underline" href="/login">autentificare personal ADI</Link>
      </p>
    </section>
  );
}
