"use client";
export function PrintButton() {
  return <button onClick={() => window.print()} className="no-print mb-4 rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-white">Imprimă (A4)</button>;
}
