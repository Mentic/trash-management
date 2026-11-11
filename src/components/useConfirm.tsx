"use client";
// Confirmare înainte de acțiuni ireversibile (A07), cu dialog Radix în locul window.confirm.
import { useRef, useState, type FormEvent } from "react";
import { AlertDialog } from "./ui/alert-dialog";

type Msg = string | undefined | ((submitter: HTMLElement | null) => string | undefined);

export function useConfirm(message: Msg, opts: { title?: string; destructive?: boolean } = {}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState<string>("");
  const confirmed = useRef(false);
  const pending = useRef<{ form: HTMLFormElement; submitter: HTMLElement | null } | null>(null);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const m = typeof message === "function" ? message(submitter) : message;
    if (!m || confirmed.current) { confirmed.current = false; return; }
    e.preventDefault();
    pending.current = { form: e.currentTarget, submitter };
    setText(m);
    setOpen(true);
  };
  const dialog = message ? (
    <AlertDialog open={open} onOpenChange={setOpen} title={opts.title ?? "Confirmați acțiunea"} description={text} destructive={opts.destructive}
      onConfirm={() => {
        const p = pending.current;
        if (!p) return;
        confirmed.current = true;
        p.form.requestSubmit(p.submitter as HTMLButtonElement | null ?? undefined);
      }} />
  ) : null;
  return { onSubmit, dialog };
}
