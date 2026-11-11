"use client";
// Formular pentru o Server Action: erorile apar lângă formular și se anunță (A03, A07); confirmarea în dialog Radix.
import { useActionState, type ReactNode } from "react";
import { buttonVariants } from "./ui/button";
import { useConfirm } from "./useConfirm";

export type ActionResult = { error?: string; ok?: string } | undefined;

export function ActionForm({
  action, children, confirm, className, submit, submitClass, destructive,
}: {
  action: (prev: ActionResult, fd: FormData) => Promise<ActionResult>;
  children?: ReactNode;
  confirm?: string;
  className?: string;
  submit: string;
  submitClass?: string;
  destructive?: boolean;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const { onSubmit, dialog } = useConfirm(confirm, { destructive });
  return (
    <form action={run} className={className} onSubmit={onSubmit}>
      {children}
      <button type="submit" disabled={pending} className={submitClass ?? buttonVariants({ size: "sm" })}>
        {pending ? "Se salvează…" : submit}
      </button>
      <span aria-live="assertive">
        {state?.error && <span className="ml-2 inline-block text-sm font-medium text-red-700">{state.error}</span>}
        {state?.ok && <span className="ml-2 text-sm text-green-800">{state.ok}</span>}
      </span>
      {dialog}
    </form>
  );
}
