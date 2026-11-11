// Bara de pași a circuitului și „Pasul următor” pe fișa documentului (sec. 5.1).
import { CheckCircle2 } from "lucide-react";
import type { Direction, DocStatus, Role } from "@/domain/codes";

const STEPS: Record<Direction, { key: DocStatus; label: string }[]> = {
  incoming: [
    { key: "registered", label: "Înregistrat" }, { key: "assigned", label: "Repartizat" }, { key: "drafting", label: "Redactare" },
    { key: "in_approval", label: "Aprobare" }, { key: "approved", label: "Aprobat" }, { key: "outgoing_registered", label: "Ieșire" },
    { key: "dispatched", label: "Expediat" }, { key: "filed", label: "Clasat" },
  ],
  internal: [
    { key: "registered", label: "Înregistrat" }, { key: "assigned", label: "Repartizat" }, { key: "drafting", label: "Redactare" },
    { key: "in_approval", label: "Aprobare" }, { key: "approved", label: "Aprobat" }, { key: "filed", label: "Clasat" },
  ],
  outgoing: [{ key: "outgoing_registered", label: "Ieșire înregistrată" }, { key: "dispatched", label: "Expediat" }, { key: "filed", label: "Clasat" }],
};

/** Progresul în circuit: o propoziție și o bară subțire — fără zgomot vizual. */
export function Stepper({ direction, status, filedWithoutReply }: { direction: Direction; status: DocStatus; filedWithoutReply?: boolean }) {
  if (status === "draft" || status === "cancelled") return null;
  let steps = STEPS[direction];
  if (filedWithoutReply) steps = [steps[0]!, { key: "filed", label: "Clasat fără răspuns" }];
  const idx = Math.max(0, steps.findIndex((s) => s.key === status));
  const done = status === "filed";
  const pct = done ? 100 : Math.round(((idx + 0.5) / steps.length) * 100);
  return (
    <div className="mb-6">
      <p className="mb-2 text-[13px] text-[var(--ink-2)]">
        {done ? "Circuit încheiat" : <>Etapa {idx + 1} din {steps.length}: <span className="font-medium text-[var(--ink)]">{steps[idx]!.label}</span></>}
        {!done && idx + 1 < steps.length && <> · urmează {steps[idx + 1]!.label.toLowerCase()}</>}
      </p>
      <div role="progressbar" aria-label="Etapele circuitului documentului" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done ? steps.length : idx + 1}
        aria-valuetext={done ? "Circuit încheiat" : `Etapa ${idx + 1} din ${steps.length}: ${steps[idx]!.label}`}
        className="h-1 overflow-hidden rounded-full bg-[#e8e8ed]">
        <div className={`h-full rounded-full ${done ? "bg-[#34c759]" : "bg-[var(--accent)]"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function nextStep(o: { status: DocStatus; direction: Direction; role: Role; isAssignee: boolean; assignee: string | null }): string {
  const { status, direction, role, isAssignee, assignee } = o;
  const reg = role === "registrar";
  switch (status) {
    case "draft": return reg ? "Verificați datele și confirmați: documentul primește număr." : "Ciornă a registraturii.";
    case "registered":
      if (reg) return "Repartizați lucrarea unui responsabil. Dacă documentul nu cere răspuns (ex. raportul operatorului), clasați-l fără răspuns.";
      if (role === "director") return "Lucrarea așteaptă repartizarea; o puteți repartiza și dumneavoastră.";
      return "Lucrarea așteaptă repartizarea de către registratură.";
    case "assigned":
    case "drafting":
      return isAssignee ? "Scrieți răspunsul în caseta „Răspuns” și bifați „Trimite la aprobare” când este gata." : `Așteaptă redactarea răspunsului de către ${assignee ?? "responsabil"}.`;
    case "in_approval":
      return role === "director" ? "Citiți răspunsul, apoi aprobați-l sau returnați-l cu motiv." : "Răspunsul așteaptă aprobarea directorului.";
    case "approved":
      if (direction === "internal") return reg ? "Clasați documentul la dosar." : "Așteaptă clasarea de către registratură.";
      return reg ? "Înregistrați ieșirea: răspunsul primește un număr nou, legat de această intrare." : "Așteaptă înregistrarea ieșirii de către registratură.";
    case "outgoing_registered": return reg ? "Consemnați expedierea: canalul, data și dovada." : "Așteaptă expedierea de către registratură.";
    case "dispatched": return reg ? "Clasați documentul la dosar." : "Așteaptă clasarea de către registratură.";
    case "filed": return "Circuit încheiat: documentul este clasat la dosar.";
    case "cancelled": return "Înregistrare anulată; numărul rămâne în registru.";
  }
}

export function SuccessBanner({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div role="status" className="mb-6 flex items-center gap-2 text-[14px] text-[var(--green)] animate-in fade-in-0 duration-300">
      <CheckCircle2 className="size-4 shrink-0" aria-hidden />{text}
    </div>
  );
}
