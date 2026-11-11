"use client";
// Formular pentru o Server Action: erorile apar lângă formular și se anunță (A03, A07).
import { useActionState, type ReactNode } from "react";

export type ActionResult = { error?: string; ok?: string } | undefined;

export function ActionForm({
  action, children, confirm, className, submit, submitClass,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  confirm?: string;
  className?: string;
  submit: string;
  submitClass?: string;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form
      action={run}
      className={className}
      onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
    >
      {children}
      <button type="submit" disabled={pending} className={submitClass ?? "inline-flex items-center rounded bg-[var(--accent)] px-3 py-1.5 text-sm text-white disabled:opacity-60"}>
        {pending ? "Se salvează…" : submit}
      </button>
      <span aria-live="assertive">
        {state?.error && <span className="ml-2 text-sm font-medium text-red-700">{state.error}</span>}
        {state?.ok && <span className="ml-2 text-sm text-green-800">{state.ok}</span>}
      </span>
    </form>
  );
}
