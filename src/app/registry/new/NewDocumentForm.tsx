"use client";
import { useActionState, useState } from "react";
import { createDocument } from "@/server/actions/registry";
import type { ActionResult } from "@/components/ActionForm";
import { Field, input, btn, btnPrimary } from "@/components/ui";
import { DIRECTION_LABEL, INTAKE_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { computeDeadline, DEMO_DEADLINES } from "@/domain/deadlines";
import type { RequestType } from "@/domain/codes";

const fmt = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : "fără termen");

export function NewDocumentForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createDocument, undefined);
  const [type, setType] = useState<RequestType>("petition");
  const [redirected, setRedirected] = useState(false);
  const deadline = computeDeadline(today, type, { redirected }, DEMO_DEADLINES);
  return (
    <form action={action} className="grid max-w-3xl gap-4 md:grid-cols-2">
      {state?.error && <div role="alert" className="rounded border border-red-400 bg-red-50 p-2 text-sm md:col-span-2">{state.error}</div>}
      <Field label="Sens" htmlFor="direction" required>
        <select id="direction" name="direction" className={input} defaultValue="incoming">
          {Object.entries(DIRECTION_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Tip cerere" htmlFor="requestType" required hint={`Termen calculat: ${fmt(deadline)}`}>
        <select id="requestType" name="requestType" className={input} value={type} onChange={(e) => setType(e.target.value as RequestType)}>
          {Object.entries(REQUEST_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <Field label="Corespondent" htmlFor="correspondentName" required>
        <input id="correspondentName" name="correspondentName" className={input} required />
      </Field>
      <Field label="Adresa corespondentului" htmlFor="correspondentAddress">
        <input id="correspondentAddress" name="correspondentAddress" className={input} />
      </Field>
      <Field label="Număr extern (referința expeditorului)" htmlFor="externalRef">
        <input id="externalRef" name="externalRef" className={input} placeholder="ex. 438/2026" />
      </Field>
      <Field label="Canal de primire" htmlFor="intakeChannel">
        <select id="intakeChannel" name="intakeChannel" className={input} defaultValue="email">
          <option value="">—</option>{Object.entries(INTAKE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <div className="md:col-span-2">
        <Field label="Obiect" htmlFor="subject" required>
          <textarea id="subject" name="subject" className={input} rows={2} required />
        </Field>
      </div>
      {type === "petition" && (
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="redirected" checked={redirected} onChange={(e) => setRedirected(e.target.checked)} />
          Petiție greșit îndreptată (se redirecționează în 5 zile)
        </label>
      )}
      <div className="md:col-span-2">
        <Field label="Anexe (PDF, JPG, PNG, DOCX, XLSX, CSV; maximum 10 MB fiecare)" htmlFor="files">
          <input id="files" name="files" type="file" multiple className="text-sm" />
        </Field>
      </div>
      <div className="flex gap-2 md:col-span-2">
        <button name="intent" value="confirm" disabled={pending} className={btnPrimary}
          onClick={(e) => { if (!window.confirm("Confirmați înregistrarea? Numărul se atribuie definitiv.")) e.preventDefault(); }}>
          Confirmă și atribuie număr
        </button>
        <button name="intent" value="draft" disabled={pending} className={btn}>Salvează ciorna</button>
      </div>
    </form>
  );
}
