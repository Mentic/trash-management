"use client";
import { useActionState, useState } from "react";
import { createDocument } from "@/server/actions/registry";
import type { ActionResult } from "@/components/ActionForm";
import { Field, input, btn, btnPrimary } from "@/components/ui";
import { FileInput } from "@/components/FileInput";
import { INTAKE_LABEL, REQUEST_TYPE_LABEL } from "@/lib/labels";
import { CORRESPONDENT_LABEL, DIRECTION_HELP, REQUEST_TYPES_BY_DIRECTION } from "@/lib/directions";
import { computeDeadline, DEMO_DEADLINES } from "@/domain/deadlines";
import type { Direction, RequestType } from "@/domain/codes";

const fmt = (iso: string | null) => (iso ? iso.split("-").reverse().join(".") : null);

export function NewDocumentForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState<ActionResult, FormData>(createDocument, undefined);
  const [direction, setDirection] = useState<Direction>("incoming");
  const [type, setType] = useState<RequestType>("petition");
  const [redirected, setRedirected] = useState(false);
  const types = REQUEST_TYPES_BY_DIRECTION[direction];
  const deadline = direction === "incoming" ? fmt(computeDeadline(today, type, { redirected }, DEMO_DEADLINES)) : null;

  const pickDirection = (d: Direction) => {
    setDirection(d);
    setType(REQUEST_TYPES_BY_DIRECTION[d][0]!);
    setRedirected(false);
  };

  return (
    <form action={action} className="grid max-w-3xl gap-4 md:grid-cols-2">
      {state?.error && <div role="alert" className="rounded border border-red-400 bg-red-50 p-2 text-sm md:col-span-2">{state.error}</div>}

      <fieldset className="md:col-span-2">
        <legend className="mb-1 text-sm font-medium">Sens (obligatoriu) — direcția documentului față de ADI</legend>
        <div className="grid gap-2 md:grid-cols-3">
          {(Object.keys(DIRECTION_HELP) as Direction[]).map((d) => (
            <label key={d} className={`cursor-pointer rounded border p-3 text-sm ${direction === d ? "border-[var(--accent)] bg-blue-50 ring-1 ring-[var(--accent)]" : "hover:bg-gray-50"}`}>
              <span className="flex items-center gap-2 font-semibold">
                <input type="radio" name="direction" value={d} checked={direction === d} onChange={() => pickDirection(d)} />
                {DIRECTION_HELP[d].title}
              </span>
              <span className="mt-1 block">{DIRECTION_HELP[d].text}</span>
              <span className="mt-1 block text-xs text-gray-600">{DIRECTION_HELP[d].examples}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {direction !== "internal" && (
        <Field label="Tip document" htmlFor="requestType" required hint={deadline ? `Termen de răspuns calculat: ${deadline}` : direction === "incoming" ? "Fără termen de răspuns" : "Documentele trimise nu au termen de răspuns"}>
          <select id="requestType" name="requestType" className={input} value={type} onChange={(e) => setType(e.target.value as RequestType)}>
            {types.map((k) => <option key={k} value={k}>{REQUEST_TYPE_LABEL[k]}</option>)}
          </select>
        </Field>
      )}
      {direction === "internal" && <input type="hidden" name="requestType" value="internal" />}

      {direction === "incoming" && (
        <Field label="Canal de primire" htmlFor="intakeChannel">
          <select id="intakeChannel" name="intakeChannel" className={input} defaultValue="email">
            <option value="">—</option>{Object.entries(INTAKE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
      )}

      {direction !== "internal" ? (
        <>
          <Field label={CORRESPONDENT_LABEL[direction]} htmlFor="correspondentName" required>
            <input id="correspondentName" name="correspondentName" className={input} required />
          </Field>
          <Field label="Adresa corespondentului" htmlFor="correspondentAddress">
            <input id="correspondentAddress" name="correspondentAddress" className={input} />
          </Field>
        </>
      ) : <input type="hidden" name="correspondentName" value="" />}

      {direction === "incoming" && (
        <Field label="Numărul expeditorului (de pe documentul primit)" htmlFor="externalRef" hint="Se păstrează separat; nu influențează numărul nostru.">
          <input id="externalRef" name="externalRef" className={input} placeholder="ex. 438/2026" />
        </Field>
      )}

      <div className="md:col-span-2">
        <Field label="Obiect" htmlFor="subject" required>
          <textarea id="subject" name="subject" className={input} rows={2} required />
        </Field>
      </div>
      {direction === "incoming" && type === "petition" && (
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" name="redirected" checked={redirected} onChange={(e) => setRedirected(e.target.checked)} />
          Petiție greșit îndreptată (se redirecționează în 5 zile)
        </label>
      )}
      <div className="md:col-span-2">
        <FileInput id="files" name="files" label="Anexe (PDF, JPG, PNG, DOCX, XLSX, CSV; maximum 10 MB fiecare)" multiple />
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
