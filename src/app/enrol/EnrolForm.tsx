"use client";
// S02, S04, A08 — pașii de înrolare; după activare pagina arată doar confirmarea și codurile de recuperare.
import { useActionState, useState } from "react";
import { confirmEnrolment, type FormState } from "@/server/actions/auth";

export function EnrolFlow({ secret, qrSvg, username, displayName }: { secret: string; qrSvg: string; username: string; displayName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(confirmEnrolment, undefined);
  const [copied, setCopied] = useState(false);

  if (state?.recoveryCodes) {
    const text = state.recoveryCodes.join("\n");
    return (
      <section aria-labelledby="done-title" className="max-w-lg">
        <h1 id="done-title" className="mb-2 text-xl font-semibold"><span aria-hidden="true">✓ </span>Autentificarea în doi pași este activă</h1>
        <p className="mb-4 text-sm">De acum, {displayName} intră cu parola și cu codul din aplicația de pe telefon.</p>
        <div className="rounded border p-4" role="region" aria-labelledby="codes-title">
          <h2 id="codes-title" className="font-semibold">Coduri de recuperare</h2>
          <p className="text-sm">Dacă nu aveți telefonul la îndemână, folosiți unul dintre aceste 10 coduri în loc de codul din aplicație. Fiecare funcționează o singură dată. Nu vor mai fi afișate.</p>
          <ul className="my-3 grid grid-cols-2 gap-1 font-mono">{state.recoveryCodes.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="rounded border px-3 py-1">Imprimă</button>
            <a className="rounded border px-3 py-1" download="coduri-recuperare-adi-demo.txt" href={`data:text/plain;charset=utf-8,${encodeURIComponent(text)}`}>Descarcă</a>
            {/* Navigare completă: antetul (meniu, Deconectare) se redesenează cu sesiunea activă. */}
            <a href="/registry" className="rounded bg-[var(--accent)] px-3 py-1 text-white">Am salvat codurile — continuă</a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="enrol-title" className="max-w-2xl">
      <h1 id="enrol-title" className="mb-1 text-xl font-semibold">Activați autentificarea în doi pași</h1>
      <p className="mb-4 text-sm">Pentru {displayName}: un singur pas, făcut o dată. La fiecare autentificare veți introduce parola și un cod de 6 cifre de pe telefon.</p>
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div>
          <div role="img" aria-label={`Cod QR pentru contul ${username}`} className="w-[220px] rounded border p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
        </div>
        <ol className="list-decimal space-y-4 pl-5 text-sm">
          <li>Pe telefon, deschideți <strong>Google Authenticator</strong> sau <strong>Microsoft Authenticator</strong> și alegeți „Adaugă cont” → „Scanează cod QR”.</li>
          <li>
            Scanați codul QR. Nu puteți scana? Introduceți manual cheia:
            <p className="mt-1 flex flex-wrap items-center gap-2">
              <code className="rounded bg-gray-100 px-2 py-1 font-mono">{secret}</code>
              <button type="button" className="rounded border px-2 py-0.5"
                onClick={async () => { await navigator.clipboard.writeText(secret.replace(/\s/g, "")); setCopied(true); }}>Copiază</button>
              <span aria-live="polite">{copied ? "Cheia a fost copiată." : ""}</span>
            </p>
          </li>
          <li>
            <form action={action} className="space-y-2">
              <label htmlFor="code" className="block font-medium">Introduceți codul de 6 cifre afișat acum de aplicație (obligatoriu)</label>
              <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="w-40 rounded border px-2 py-1 font-mono text-lg tracking-widest" />
              <div aria-live="assertive">{state?.error && <p className="font-medium text-red-700">{state.error}</p>}</div>
              <button type="submit" disabled={pending} className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-60">Activează</button>
            </form>
          </li>
        </ol>
      </div>
    </section>
  );
}
