// Componente de bază: text + culoare pentru stări (A04), etichete vizibile (A07), tabele cu antet (A06).
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "./ui/button";

export const btn = buttonVariants({ variant: "outline", size: "sm" });
export const btnPrimary = buttonVariants({ size: "sm" });
export const input = "w-full rounded-lg border px-3 py-1.5 text-sm shadow-xs";

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{children}</h1>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Field({ label, htmlFor, required, children, hint }: { label: string; htmlFor: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className="block text-sm font-medium">{label}{required && " (obligatoriu)"}</label>
      {children}
      {hint && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  );
}

const TONES = {
  gray: "bg-gray-100 text-gray-800 border-gray-300",
  blue: "bg-blue-50 text-blue-900 border-blue-300",
  green: "bg-green-50 text-green-900 border-green-400",
  amber: "bg-amber-50 text-amber-900 border-amber-400",
  red: "bg-red-50 text-red-900 border-red-400",
} as const;
export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", icon, children }: { tone?: Tone; icon?: string; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${TONES[tone]}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

export function Card({ title, children, className = "" }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`} aria-label={title}>
      {title && <h2 className="mb-3 text-base font-semibold text-slate-900">{title}</h2>}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: Tone }) {
  return (
    <div data-stat={label} className={`rounded-xl border p-4 shadow-sm ${tone ? TONES[tone] : "border-slate-200 bg-white"}`}>
      <div className="text-xs font-medium">{label}</div>
      <div data-value className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export const th = "border-b border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600";
export const td = "border-b border-slate-100 px-3 py-2 align-top text-sm";

export function Notice({ tone = "blue", children }: { tone?: Tone; children: ReactNode }) {
  return <div role="status" className={`mb-4 rounded-xl border px-4 py-3 text-sm ${TONES[tone]}`}>{children}</div>;
}

export function Crumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Firimituri" className="mb-2 text-sm">
      {items.map((it, i) => (
        <span key={i}>
          {i > 0 && " › "}
          {it.href ? <Link className="underline" href={it.href}>{it.label}</Link> : <span aria-current="page">{it.label}</span>}
        </span>
      ))}
    </nav>
  );
}
