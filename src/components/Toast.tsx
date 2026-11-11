"use client";
// Notificare scurtă în colț (sonner), pe lângă mesajul din pagină (care rămâne pentru cititoarele de ecran).
import { useEffect } from "react";
import { toast, Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return <SonnerToaster position="top-right" richColors closeButton toastOptions={{ duration: 4000 }} />;
}

export function ToastOnMount({ text }: { text: string | null }) {
  useEffect(() => { if (text) toast.success(text); }, [text]);
  return null;
}
