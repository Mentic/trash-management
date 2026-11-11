"use client";
import { useActionState, useState } from "react";
import { verifyMfa, type FormState } from "@/server/actions/auth";

export function MfaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyMfa, undefined);
  const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="code" className="block font-medium">
        {recovery ? "Cod de recuperare (obligatoriu)" : "Cod de 6 cifre (obligatoriu)"}
      </label>
      {recovery ? (
        <input key="r" id="code" name="code" autoComplete="off" required autoFocus placeholder="XXXXX-XXXXX" className="w-48 rounded border px-2 py-1 font-mono" />
      ) : (
        <input key="t" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="w-40 rounded border px-2 py-1 font-mono text-lg tracking-widest" />
      )}
      <div aria-live="assertive">{state?.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}</div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-60">Verifică</button>
        <button type="button" className="text-sm underline" onClick={() => setRecovery(!recovery)}>
          {recovery ? "Folosește codul din aplicație" : "Folosește un cod de recuperare"}
        </button>
      </div>
    </form>
  );
}
