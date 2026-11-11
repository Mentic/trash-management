"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { confirmEnrolment, type FormState } from "@/server/actions/auth";

export function EnrolForm({ secret }: { secret: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmEnrolment, undefined);
  const [copied, setCopied] = useState(false);

  if (state?.recoveryCodes) {
    const text = state.recoveryCodes.join("\n");
    return (
      <div className="mt-4 rounded border p-4" role="region" aria-labelledby="codes-title">
        <h2 id="codes-title" className="font-semibold">Coduri de recuperare</h2>
        <p className="text-sm">Autentificarea în doi pași este activă. Păstrați aceste 10 coduri: fiecare funcționează o singură dată, dacă nu aveți telefonul. Nu vor mai fi afișate.</p>
        <ul className="my-3 grid grid-cols-2 gap-1 font-mono">{state.recoveryCodes.map((c) => <li key={c}>{c}</li>)}</ul>
        <div className="no-print flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="rounded border px-3 py-1">Imprimă</button>
          <a className="rounded border px-3 py-1" download="coduri-recuperare-adi-demo.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}>Descarcă</a>
          <Link href="/registry" className="rounded bg-[var(--accent)] px-3 py-1 text-white">Am salvat codurile — continuă</Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mt-1 flex items-center gap-2">
        <code className="rounded bg-gray-100 px-2 py-1 font-mono">{secret}</code>
        <button type="button" className="rounded border px-2 py-0.5 text-sm"
          onClick={async () => { await navigator.clipboard.writeText(secret.replace(/\s/g, "")); setCopied(true); }}>
          Copiază
        </button>
        <span aria-live="polite" className="text-sm">{copied ? "Cheia a fost copiată." : ""}</span>
      </p>
      <form action={action} className="mt-4 space-y-2">
        <label htmlFor="code" className="block font-medium">3. Introduceți codul de 6 cifre afișat de aplicație (obligatoriu)</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="w-40 rounded border px-2 py-1 font-mono text-lg tracking-widest" />
        <div aria-live="assertive">{state?.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}</div>
        <button type="submit" disabled={pending} className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-60">Activează</button>
      </form>
    </div>
  );
}
