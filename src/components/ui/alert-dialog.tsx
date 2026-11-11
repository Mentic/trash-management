"use client";
// Dialog modal accesibil (Radix): focus captiv, Escape, revenirea focusului — QA07, A02, A07.
import { AlertDialog as R } from "radix-ui";
import type { ReactNode } from "react";
import { buttonVariants } from "./button";
import { cn } from "@/lib/utils";

export function AlertDialog({ open, onOpenChange, title, description, confirmLabel = "Da, continuă", cancelLabel = "Renunță", onConfirm, destructive, children }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: ReactNode;
  confirmLabel?: string; cancelLabel?: string; onConfirm: () => void; destructive?: boolean; children?: ReactNode;
}) {
  return (
    <R.Root open={open} onOpenChange={onOpenChange}>
      <R.Portal>
        <R.Overlay className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <R.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          <R.Title className="text-lg font-semibold text-slate-900">{title}</R.Title>
          {description ? <R.Description className="mt-2 text-sm text-slate-600">{description}</R.Description> : <R.Description className="sr-only">{title}</R.Description>}
          {children}
          <div className="mt-6 flex justify-end gap-2">
            <R.Cancel className={buttonVariants({ variant: "outline" })}>{cancelLabel}</R.Cancel>
            <R.Action className={cn(buttonVariants({ variant: destructive ? "destructive" : "default" }))} onClick={onConfirm}>{confirmLabel}</R.Action>
          </div>
        </R.Content>
      </R.Portal>
    </R.Root>
  );
}
