"use client";
import { useActionState, useRef } from "react";
import { loginWithPassword, type FormState } from "@/server/actions/auth";

type Account = { user: string; role: string; password: string };

export function LoginForm({ demoAccounts }: { demoAccounts?: Account[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(loginWithPassword, undefined);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const use = (a: Account) => {
    userRef.current!.value = a.user;
    passRef.current!.value = a.password;
    formRef.current!.requestSubmit();
  };
  return (
    <>
      <form ref={formRef} action={action} className="space-y-3" aria-describedby={state?.error ? "login-error" : undefined}>
        <div>
          <label htmlFor="username" className="block text-sm font-medium">Utilizator (obligatoriu)</label>
          <input ref={userRef} id="username" name="username" autoComplete="username" required className="w-full rounded border px-2 py-1" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium">Parolă (obligatoriu)</label>
          <input ref={passRef} id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded border px-2 py-1" />
        </div>
        <div aria-live="assertive">
          {state?.error && <p id="login-error" className="text-sm font-medium text-red-700">{state.error}</p>}
        </div>
        <button type="submit" disabled={pending} className="rounded bg-[var(--accent)] px-4 py-2 text-white disabled:opacity-60">
          {pending ? "Se verifică…" : "Continuă"}
        </button>
      </form>
      {demoAccounts && (
        <section aria-labelledby="demo-accounts" className="mt-6">
          <h2 id="demo-accounts" className="mb-2 text-sm font-semibold">Conturi demo — intrați cu un click</h2>
          <ul className="space-y-2">
            {demoAccounts.map((a) => (
              <li key={a.user}>
                <button type="button" disabled={pending} onClick={() => use(a)}
                  className="flex w-full items-center justify-between rounded border px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:opacity-60">
                  <span><span className="font-medium">{a.role}</span><span className="block text-xs text-gray-600">{a.user}</span></span>
                  <code className="text-xs">{a.password}</code>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
