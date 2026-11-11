"use client";
import { useActionState, useRef } from "react";
import { loginWithPassword, type FormState } from "@/server/actions/auth";
import { buttonVariants } from "@/components/ui/button";

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
          <label htmlFor="username" className="mb-1.5 block text-[13px] font-medium">Utilizator (obligatoriu)</label>
          <input ref={userRef} id="username" name="username" autoComplete="username" required className="h-11 w-full px-4 text-[15px]" />
        </div>
        <div>
          <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium">Parolă (obligatoriu)</label>
          <input ref={passRef} id="password" name="password" type="password" autoComplete="current-password" required className="h-11 w-full px-4 text-[15px]" />
        </div>
        <div aria-live="assertive">
          {state?.error && <p id="login-error" className="text-sm font-medium text-red-700">{state.error}</p>}
        </div>
        <button type="submit" disabled={pending} className={buttonVariants({ size: "lg", className: "w-full" })}>
          {pending ? "Se verifică…" : "Continuă"}
        </button>
      </form>
      {demoAccounts && (
        <section aria-labelledby="demo-accounts" className="mt-10">
          <h2 id="demo-accounts" className="mb-2 px-1 text-[13px] text-[var(--ink-2)]">Conturi demo — intrați cu un click</h2>
          <ul className="divide-y divide-[var(--hairline)] overflow-hidden rounded-2xl bg-white ring-1 ring-[var(--hairline)]">
            {demoAccounts.map((a) => (
              <li key={a.user}>
                <button type="button" disabled={pending} onClick={() => use(a)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-[15px] transition hover:bg-[#fafafa] disabled:opacity-60">
                  <span>{a.role}<span className="block text-[13px] text-[var(--ink-2)]">{a.user} · {a.password}</span></span>
                  <span aria-hidden className="text-[var(--ink-2)]">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
