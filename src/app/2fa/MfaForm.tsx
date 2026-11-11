"use client";
import { useActionState, useState } from "react";
import { verifyMfa, type FormState } from "@/server/actions/auth";
import { buttonVariants } from "@/components/ui/button";

export function MfaForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyMfa, undefined);
  const [recovery, setRecovery] = useState(false);
  return (
    <form action={action} className="space-y-2">
      <label htmlFor="code" className="block font-medium">
        {recovery ? "Cod de recuperare (obligatoriu)" : "Cod de 6 cifre (obligatoriu)"}
      </label>
      {recovery ? (
        <input key="r" id="code" name="code" autoComplete="off" required autoFocus placeholder="XXXXX-XXXXX" className="h-11 w-56 px-3 font-mono" />
      ) : (
        <input key="t" id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required autoFocus className="h-11 w-44 px-3 text-center font-mono text-xl tracking-[0.3em]" />
      )}
      <div aria-live="assertive">{state?.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}</div>
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={buttonVariants()}>Verifică</button>
        <button type="button" className="text-[13px] text-[var(--accent)] hover:underline" onClick={() => setRecovery(!recovery)}>
          {recovery ? "Folosește codul din aplicație" : "Folosește un cod de recuperare"}
        </button>
      </div>
    </form>
  );
}
