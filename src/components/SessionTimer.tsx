"use client";
// S07, A10 — avertizare la 28 de minute de inactivitate, cu prelungire; la 30 de minute, deconectare.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { touchSession } from "@/server/actions/session";

const IDLE_MS = 30 * 60_000;
const WARN_MS = 28 * 60_000;

export function SessionTimer() {
  const path = usePathname();
  const [since, setSince] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => setSince(Date.now()), [path]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5_000);
    return () => clearInterval(t);
  }, []);
  const idle = now - since;
  useEffect(() => {
    if (idle >= IDLE_MS) window.location.href = "/login?expired=1";
    else if (idle >= WARN_MS) ref.current?.focus();
  }, [idle]);
  if (idle < WARN_MS) return null;
  const left = Math.max(0, Math.ceil((IDLE_MS - idle) / 1000));
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="st-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="max-w-sm rounded bg-white p-5 shadow">
        <h2 id="st-title" className="font-semibold">Sesiunea expiră în curând</h2>
        <p className="my-2 text-sm">Veți fi deconectat în {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} din cauza inactivității.</p>
        <button ref={ref} className="rounded bg-[var(--accent)] px-3 py-1.5 text-white"
          onClick={async () => { await touchSession(); setSince(Date.now()); setNow(Date.now()); }}>
          Prelungește sesiunea
        </button>
      </div>
    </div>
  );
}
