"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  // Cea mai lungă potrivire câștigă (ex. /registry/dossiers față de /registry).
  const active = items.filter((n) => path === n.href || path.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      {items.map((n) => (
        <Link key={n.href} href={n.href} aria-current={n.href === active ? "page" : undefined}
          className={`rounded px-2 py-1 text-sm ${n.href === active ? "bg-[var(--accent)] font-medium text-white" : "hover:bg-gray-100"}`}>
          {n.label}
        </Link>
      ))}
    </>
  );
}
