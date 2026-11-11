"use client";
// Alegerea fișierelor în română (butonul nativ afișează textul în limba browserului).
import { useState } from "react";

const MB = 1024 * 1024;
export const MAX_FILE = 10 * MB;
export const MAX_TOTAL = 50 * MB;

/** QA08: limitele se verifică înainte de trimitere, cu un mesaj clar (nu eroare 500). */
export function checkFiles(files: File[], multiple?: boolean): string {
  const big = files.find((f) => f.size > MAX_FILE);
  if (big) return `„${big.name}” are ${(big.size / MB).toFixed(1)} MB; limita este 10 MB pe fișier.`;
  const total = files.reduce((s, f) => s + f.size, 0);
  if (multiple && total > MAX_TOTAL) return `Fișierele au împreună ${(total / MB).toFixed(1)} MB; limita este 50 MB pe o salvare. Adăugați restul după salvare.`;
  return "";
}

export function FileInput({ id, name, label, multiple, accept, required }: {
  id: string; name: string; label: string; multiple?: boolean; accept?: string; required?: boolean;
}) {
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState("");
  return (
    <div className="space-y-1">
      <span className="block text-[13px] font-medium" id={`${id}-label`}>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input id={id} name={name} type="file" multiple={multiple} accept={accept} required={required}
          aria-labelledby={`${id}-label ${id}-btn`} className="peer sr-only"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            const err = checkFiles(files, multiple);
            e.target.setCustomValidity(err);
            setError(err);
            setNames(files.map((f) => f.name));
          }} />
        <label id={`${id}-btn`} htmlFor={id}
          className="cursor-pointer rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-[var(--accent)] ring-1 ring-[var(--line)] hover:bg-[#f5f5f7] peer-focus-visible:ring-4 peer-focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]">
          {multiple ? "Alegeți fișierele…" : "Alegeți fișierul…"}
        </label>
        <span className="text-sm text-[var(--ink-2)]" aria-live="polite">
          {names.length ? names.join(", ") : "Niciun fișier ales"}
        </span>
      </div>
      {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
