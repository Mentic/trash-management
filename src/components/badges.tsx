import { Badge, type Tone } from "./ui";
import { DOC_STATUS_LABEL, ROW_STATUS_LABEL } from "@/lib/labels";
import type { DocStatus, WasteRowStatus } from "@/domain/codes";
import { deadlineState, DEMO_DEADLINES } from "@/domain/deadlines";
import { fmtDate, todayIso } from "@/lib/format";
import { OPEN_FOR_DEADLINE } from "@/server/queries/registry";

const DOC_TONE: Record<DocStatus, Tone> = {
  draft: "gray", registered: "blue", assigned: "blue", drafting: "amber", in_approval: "amber", approved: "green",
  outgoing_registered: "green", dispatched: "green", filed: "gray", cancelled: "red",
};
export const DocStatusBadge = ({ status }: { status: DocStatus }) => (
  <Badge tone={DOC_TONE[status]} icon={status === "cancelled" ? "✕" : status === "filed" ? "▣" : undefined}>{DOC_STATUS_LABEL[status]}</Badge>
);

/** A04 — termenul are text și pictogramă, nu doar culoare. */
export function Deadline({ deadline, status }: { deadline: string | null; status: DocStatus }) {
  if (!deadline) return <span className="text-gray-500">—</span>;
  if (!OPEN_FOR_DEADLINE.includes(status)) return <span>{fmtDate(deadline)}</span>;
  const st = deadlineState(deadline, todayIso(), DEMO_DEADLINES);
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {fmtDate(deadline)}
      {st === "overdue" && <Badge tone="red" icon="!">Depășit</Badge>}
      {st === "near" && <Badge tone="amber" icon="⏱">Aproape</Badge>}
    </span>
  );
}

const ROW_TONE: Record<WasteRowStatus, Tone> = { imported: "blue", flagged: "red", corrected: "amber", excluded: "gray", validated: "green", approved: "green" };
export const RowStatusBadge = ({ status }: { status: WasteRowStatus }) => (
  <Badge tone={ROW_TONE[status]} icon={status === "flagged" ? "⚑" : status === "validated" || status === "approved" ? "✓" : undefined}>{ROW_STATUS_LABEL[status]}</Badge>
);
