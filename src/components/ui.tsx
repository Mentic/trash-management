// Componente de bază, sobre: suprafețe albe, separatoare fine, culoarea doar acolo unde are sens (A04, A06, A07).
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "./ui/button";

export const btn = buttonVariants({ variant: "outline", size: "sm" });
export const btnPrimary = buttonVariants({ size: "sm" });
export const input = "w-full px-3 py-2 text-[15px]";

export function PageTitle({ children, actions, subtitle }: { children: ReactNode; actions?: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-semibold leading-tight text-[var(--ink)]">{children}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-[var(--ink-2)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, required, children, hint }: { label: string; htmlFor: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-[var(--ink)]">{label}{required && <span className="text-[var(--ink-2)]"> (obligatoriu)</span>}</label>
      {children}
      {hint && <p className="text-[13px] text-[var(--ink-2)]">{hint}</p>}
    </div>
  );
}

const DOT = { gray: "bg-[#aeaeb2]", blue: "bg-[var(--accent)]", amber: "bg-[#f5a623]", red: "bg-[var(--red)]", green: "bg-[#34c759]" } as const;
const TEXT = { gray: "text-[var(--ink-2)]", blue: "text-[var(--ink)]", amber: "text-[var(--amber)]", red: "text-[var(--red)]", green: "text-[var(--green)]" } as const;
export type Tone = keyof typeof DOT;

/** Stare: punct colorat + text (culoarea nu e singurul purtător — A04). */
export function Badge({ tone = "gray", icon, children }: { tone?: Tone; icon?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] font-medium ${TEXT[tone]}`}>
      <span aria-hidden className={`size-2 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`surface rounded-2xl bg-white p-6 ring-1 ring-[var(--hairline)] ${className}`} aria-label={title}>
      {title && <h2 className="mb-4 text-[17px] font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

/** Cifră mare + etichetă; culoare doar pentru probleme sau finalizare. */
export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div data-stat={label} className="min-w-0">
      <div data-value className={`text-[28px] font-semibold leading-none tabular-nums ${tone ? TEXT[tone] : "text-[var(--ink)]"}`}>{value}</div>
      <div className="mt-1.5 text-[13px] text-[var(--ink-2)]">{label}</div>
    </div>
  );
}

export const th = "border-b border-[var(--hairline)] px-4 py-2.5 text-left text-[12px] font-medium text-[var(--ink-2)]";
export const td = "border-b border-[var(--hairline)] px-4 py-3 align-top text-[14px]";

export function Notice({ tone = "blue", children }: { tone?: Tone; children: ReactNode }) {
  return <div role="status" className={`mb-4 rounded-2xl bg-white px-5 py-3 text-[14px] ring-1 ring-[var(--hairline)] ${TEXT[tone]}`}>{children}</div>;
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Firimituri" className="mb-2 text-[13px] text-[var(--ink-2)]">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden> › </span>}
          {it.href ? <Link className="text-[var(--accent)] hover:underline" href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
