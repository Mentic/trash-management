// Multi-tenant: primăriile membre ca tenanți — identitate, conturi, portal; personalizare (director).
import Link from "next/link";
import { requireUser, can } from "@/server/auth/rbac";
import { allTenants } from "@/server/queries/tenant";
import { TENANT_PALETTE } from "@/domain/tenants";
import { tenantUsername } from "@/seed/tenants";
import { PageTitle, input, btn } from "@/components/ui";
import { ActionForm } from "@/components/ActionForm";
import { FileInput } from "@/components/FileInput";
import { SuccessBanner } from "@/components/flow";
import { Emblem } from "@/components/TenantMark";
import { updateTenant } from "@/server/actions/tenants";

export const dynamic = "force-dynamic";

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const user = await requireUser("portal.preview");
  const { ok } = await searchParams;
  const tenants = await allTenants();
  const manage = can(user.role, "tenants.manage");
  const changed = tenants.find((t) => t.slug === ok);
  return (
    <>
      <PageTitle subtitle="Fiecare primărie membră are propriul portal: datele ei, stema și culorile ei.">Primării</PageTitle>
      <SuccessBanner text={changed ? `Identitatea ${changed.townHall} a fost actualizată.` : null} />
      <ul className="grid gap-6 md:grid-cols-2">
        {tenants.map((t) => (
          <li key={t.id} className="rounded-2xl bg-white p-6 ring-1 ring-[var(--hairline)]" style={{ "--accent": t.color } as React.CSSProperties}>
            <div className="flex items-start gap-4">
              <Emblem slug={t.slug!} name={t.townHall} size={48} />
              <div className="min-w-0 flex-1">
                <h2 className="text-[19px] leading-tight">{t.townHall}</h2>
                <p className="mt-0.5 text-[13px] text-[var(--ink-2)]">{t.motto}</p>
                <p className="mt-2 flex items-center gap-2 text-[13px] text-[var(--ink-2)]">
                  <span className="inline-block size-3 shrink-0 rounded-full" style={{ background: t.color }} aria-hidden />
                  {TENANT_PALETTE.find((p) => p.hex === t.color)?.name ?? t.color} · stemă {t.emblemStorageKey ? "încărcată" : "stilizată (demo)"}
                </p>
                <p className="mt-0.5 text-[13px] text-[var(--ink-2)]">Cont: <span className="font-mono text-[12px]">{tenantUsername(t.slug!)}</span></p>
                <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
                  <Link className="text-[var(--accent)] hover:underline" href={`/portal?uat=${t.slug}`}>Previzualizează portalul</Link>
                  <Link className="text-[var(--accent)] hover:underline" href={`/p/${t.slug}`}>Pagina de autentificare</Link>
                </p>
              </div>
            </div>
            {manage && (
              <details className="mt-4 border-t border-[var(--hairline)] pt-4">
                <summary className="cursor-pointer text-[14px] text-[var(--accent)]">Personalizează</summary>
                <ActionForm action={updateTenant} submit="Salvează identitatea" className="mt-4 space-y-4">
                  <input type="hidden" name="id" value={t.id} />
                  <fieldset>
                    <legend className="mb-2 text-[13px] font-medium">Culoarea portalului</legend>
                    <div className="flex flex-wrap gap-2">
                      {TENANT_PALETTE.map((p) => (
                        <label key={p.hex} className="cursor-pointer" title={p.name}>
                          <input type="radio" name="color" value={p.hex} defaultChecked={p.hex === t.color} className="peer sr-only" />
                          <span className="block size-8 rounded-full ring-2 ring-transparent ring-offset-2 peer-checked:ring-[var(--ink)] peer-focus-visible:ring-[var(--ink)]" style={{ background: p.hex }} />
                          <span className="sr-only">{p.name}</span>
                        </label>
                      ))}
                    </div>
                    <label htmlFor={`cc-${t.id}`} className="mt-2 block text-[12px] text-[var(--ink-2)]">sau o culoare proprie (hex, contrast ≥ 4,5:1 cu alb)</label>
                    <input id={`cc-${t.id}`} name="customColor" placeholder="#7a1f2b" className={`${input} max-w-40`} />
                  </fieldset>
                  <div>
                    <label htmlFor={`m-${t.id}`} className="mb-1 block text-[13px] font-medium">Text sub nume (obligatoriu)</label>
                    <input id={`m-${t.id}`} name="motto" defaultValue={t.motto ?? ""} className={input} maxLength={120} required />
                  </div>
                  <FileInput id={`e-${t.id}`} name="emblem" label="Stema oficială (PNG, JPG, WEBP sau SVG; maximum 1 MB)" accept=".png,.jpg,.jpeg,.webp,.svg" />
                  {t.emblemStorageKey && <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" name="resetEmblem" /> Revino la stema stilizată</label>}
                </ActionForm>
              </details>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-8 text-[13px] text-[var(--ink-2)]">
        Stemele afișate implicit sunt stilizate (demo), după convenția heraldicii românești: coroană murală cu 5 turnuri pentru municipii, 3 pentru orașe, 1 pentru comune. Stema oficială se încarcă de aici. <Link className={btn} href="/registry">Înapoi la registru</Link>
      </p>
    </>
  );
}
