"use client";
import { useActionState } from "react";
import { loginWithPassword, type FormState } from "@/server/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginWithPassword, undefined);
  return (
    <form action={action} className="space-y-3" aria-describedby={state?.error ? "login-error" : undefined}>
      <div>
        <label htmlFor="username" className="block text-sm font-medium">Utilizator (obligatoriu)</label>
        <input id="username" name="username" autoComplete="username" required className="w-full rounded border px-2 py-1" />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium">Parolă (obligatoriu)</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded border px-2 py-1" />
      </div>
      <div aria-live="assertive">
        {state?.error && <p id="login-error" className="text-sm font-medium text-red-700">{state.error}</p>}
      </div>
      <button type="submit" disabled={pending} className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-60">
        {pending ? "Se verifică…" : "Continuă"}
      </button>
    </form>
  );
}
