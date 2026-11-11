"use client";
// S07, A10 — avertizare la 28 de minute de inactivitate, cu prelungire; la 30, deconectare.
// QA06: tastarea, click-urile și derularea contează ca activitate (sesiunea se prelungește pe server cel mult o dată pe minut).
// QA07: dialog modal Radix — focusul rămâne în dialog și revine după închidere.
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertDialog as R } from "radix-ui";
import { Clock } from "lucide-react";
import { touchSession } from "@/server/actions/session";
import { buttonVariants } from "./ui/button";

const IDLE_MS = 30 * 60_000;
const WARN_MS = 28 * 60_000;
const TOUCH_EVERY_MS = 60_000;

export function SessionTimer() {
  const lastActivity = useRef(Date.now());
  const lastTouch = useRef(Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [warning, setWarning] = useState(false);
  const actionRef = useRef<HTMLButtonElement>(null);

  const activity = useCallback(() => {
    if (warning) return; // în timpul avertizării, doar butonul prelungește
    lastActivity.current = Date.now();
    if (Date.now() - lastTouch.current > TOUCH_EVERY_MS) {
      lastTouch.current = Date.now();
      void touchSession();
    }
  }, [warning]);

  useEffect(() => {
    const events = ["keydown", "pointerdown", "input", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, activity, { passive: true, capture: true }));
    return () => events.forEach((e) => window.removeEventListener(e, activity, { capture: true }));
  }, [activity]);

  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      const idle = n - lastActivity.current;
      if (idle >= IDLE_MS) window.location.href = "/login?expired=1";
      else setWarning(idle >= WARN_MS);
    }, 5_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!warning) return;
    const t = setTimeout(() => actionRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [warning]);

  const left = Math.max(0, Math.ceil((IDLE_MS - (now - lastActivity.current)) / 1000));
  const extend = async () => {
    await touchSession();
    lastActivity.current = lastTouch.current = Date.now();
    setWarning(false);
  };

  return (
    <R.Root open={warning}>
      <R.Portal>
        <R.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px]" />
        <R.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border bg-white p-6 shadow-2xl"
          onOpenAutoFocus={(e) => { e.preventDefault(); actionRef.current?.focus(); }}
          onEscapeKeyDown={(e) => { e.preventDefault(); void extend(); }}>
          <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-amber-100 text-amber-800"><Clock className="size-5" aria-hidden /></div>
          <R.Title className="text-lg font-semibold">Sesiunea expiră în curând</R.Title>
          <R.Description className="mt-1 text-sm text-slate-600">
            Veți fi deconectat în {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} din cauza inactivității. Textul nesalvat se poate pierde.
          </R.Description>
          <div className="mt-5 flex justify-end">
            <R.Action ref={actionRef} className={buttonVariants()} onClick={(e) => { e.preventDefault(); void extend(); }}>Prelungește sesiunea</R.Action>
          </div>
        </R.Content>
      </R.Portal>
    </R.Root>
  );
}
