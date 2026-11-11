// Bara de pași a circuitului și „Pasul următor” pe fișa documentului (sec. 5.1).
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

export function Stepper({ direction, status, filedWithoutReply }: { direction: Direction; status: DocStatus; filedWithoutReply?: boolean }) {
  if (status === "draft" || status === "cancelled") return null;
  let steps = STEPS[direction];
  if (filedWithoutReply) steps = [steps[0]!, { key: "filed", label: "Clasat fără răspuns" }];
  const idx = steps.findIndex((s) => s.key === status);
  return (
    <ol aria-label="Etapele circuitului documentului" className="mb-4 flex flex-wrap items-center gap-1 text-xs">
      {steps.map((s, i) => {
        const done = i < idx || status === "filed";
        const cur = i === idx && status !== "filed";
        return (
          <li key={s.key} className="flex items-center gap-1" aria-current={cur ? "step" : undefined}>
            <span className={`rounded-full border px-2 py-0.5 ${cur ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white" : done ? "border-green-500 bg-green-50 text-green-900" : "border-gray-300 text-gray-500"}`}>
              {done && <span aria-hidden="true">✓ </span>}{s.label}{cur && <span className="sr-only"> (pasul curent)</span>}
            </span>
            {i < steps.length - 1 && <span aria-hidden="true" className="text-gray-400">→</span>}
          </li>
        );
      })}
    </ol>
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
  return <div role="status" className="mb-4 rounded border border-green-500 bg-green-50 px-3 py-2 text-sm font-medium text-green-900"><span aria-hidden="true">✓ </span>{text}</div>;
}
