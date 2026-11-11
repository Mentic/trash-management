// Identitatea unei primării: stema (încărcată sau stilizată) + numele.
/* eslint-disable @next/next/no-img-element */
export function Emblem({ slug, size = 40, name }: { slug: string; size?: number; name: string }) {
  return <img src={`/api/emblem/${slug}`} alt={`Stema — ${name}`} width={size} height={Math.round(size * 1.25)} className="shrink-0 object-contain" />;
}
