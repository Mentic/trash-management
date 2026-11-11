// Stema primăriei: cea încărcată de ADI sau, implicit, stema stilizată generată. Publică (apare pe pagina de autentificare).
// Fișierele SVG încărcate se servesc cu CSP restrictiv, ca un SVG cu scripturi să nu poată rula (folosire doar în <img>).
import { tenantBySlug } from "@/server/queries/tenant";
import { emblemSvg } from "@/lib/emblem";
import { readStoredFile } from "@/storage/files";

export const dynamic = "force-dynamic";

const HEADERS = { "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox", "Cache-Control": "no-cache" };

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = await tenantBySlug(slug);
  if (!t) return new Response("Nu există", { status: 404 });
  if (t.emblemStorageKey && t.emblemMime) {
    try {
      const bytes = await readStoredFile(t.emblemStorageKey);
      return new Response(new Uint8Array(bytes), { headers: { ...HEADERS, "Content-Type": t.emblemMime } });
    } catch { /* fișier lipsă după resetare: cade pe stema stilizată */ }
  }
  return new Response(emblemSvg({ name: t.name, kind: t.kind, color: t.color }), { headers: { ...HEADERS, "Content-Type": "image/svg+xml; charset=utf-8" } });
}
