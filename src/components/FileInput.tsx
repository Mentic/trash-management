"use client";
// Alegerea fișierelor în română (butonul nativ afișează textul în limba browserului).
import { useState } from "react";

export function FileInput({ id, name, label, multiple, accept, required }: {
  id: string; name: string; label: string; multiple?: boolean; accept?: string; required?: boolean;
}) {
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="space-y-1">
      <span className="block text-sm font-medium" id={`${id}-label`}>{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <input id={id} name={name} type="file" multiple={multiple} accept={accept} required={required}
          aria-labelledby={`${id}-label ${id}-btn`} className="peer sr-only"
          onChange={(e) => setNames(Array.from(e.target.files ?? []).map((f) => f.name))} />
        <label id={`${id}-btn`} htmlFor={id}
          className="cursor-pointer rounded border bg-white px-3 py-1.5 text-sm hover:bg-gray-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--accent)]">
          {multiple ? "Alegeți fișierele…" : "Alegeți fișierul…"}
        </label>
        <span className="text-sm text-gray-700" aria-live="polite">
          {names.length ? names.join(", ") : multiple ? "Niciun fișier ales" : "Niciun fișier ales"}
        </span>
      </div>
    </div>
  );
}
