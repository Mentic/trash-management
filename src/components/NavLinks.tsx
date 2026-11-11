"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  // Cea mai lungă potrivire câștigă (ex. /registry/dossiers față de /registry).
  const active = items.filter((n) => path === n.href || path.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      {items.map((n) => {
        const on = n.href === active;
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={cn("whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] transition-colors",
              on ? "bg-[var(--ink)] font-medium text-white" : "text-[var(--ink-2)] hover:text-[var(--ink)]")}>
            {n.label}
          </Link>
        );
      })}
    </>
  );
}
