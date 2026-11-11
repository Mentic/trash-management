"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Calculator, FileText, FolderArchive, PlayCircle, ScrollText, Upload, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  "/registry": FileText, "/registry/dossiers": FolderArchive, "/waste/imports": Upload, "/waste/summary": BarChart3,
  "/waste/uats": Calculator, "/journal": ScrollText, "/demo": PlayCircle,
};

export function NavLinks({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  // Cea mai lungă potrivire câștigă (ex. /registry/dossiers față de /registry).
  const active = items.filter((n) => path === n.href || path.startsWith(`${n.href}/`)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <>
      {items.map((n) => {
        const Icon = ICONS[n.href] ?? FileText;
        const on = n.href === active;
        return (
          <Link key={n.href} href={n.href} aria-current={on ? "page" : undefined}
            className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              on ? "bg-[var(--accent)] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900")}>
            <Icon className="size-4" aria-hidden />{n.label}
          </Link>
        );
      })}
    </>
  );
}
