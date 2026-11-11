// Sec. 5.1 — tranzițiile permise ale documentului (stare × acțiune × rol). Orice altceva e refuzat.
import type { DocStatus, Direction, Role } from "./codes";

export type DocAction =
  | "confirm" | "assign" | "startDrafting" | "submitForApproval" | "return" | "approve"
  | "registerOutgoing" | "recordDispatch" | "file" | "fileWithoutReply" | "cancel"
  | "correctMetadata" | "extendDeadline";

interface Rule {
  from: readonly DocStatus[];
  roles: readonly Role[];
  to: (d: { direction: Direction; status: DocStatus }) => DocStatus;
  needsReason?: boolean;
  onlyAssignee?: boolean;
  directions?: readonly Direction[];
}

const OPEN: readonly DocStatus[] = ["registered", "assigned", "drafting", "in_approval", "approved"];

export const RULES: Record<DocAction, Rule> = {
  confirm: { from: ["draft"], roles: ["registrar"], to: (d) => (d.direction === "outgoing" ? "outgoing_registered" : "registered") },
  assign: { from: ["registered", "assigned"], roles: ["registrar", "director"], to: () => "assigned" },
  startDrafting: { from: ["assigned"], roles: ["officer"], onlyAssignee: true, to: () => "drafting" },
  submitForApproval: { from: ["drafting"], roles: ["officer"], onlyAssignee: true, to: () => "in_approval" },
  return: { from: ["in_approval"], roles: ["director"], needsReason: true, to: () => "drafting" },
  approve: { from: ["in_approval"], roles: ["director"], to: () => "approved" },
  registerOutgoing: { from: ["approved"], roles: ["registrar"], directions: ["incoming"], to: () => "outgoing_registered" },
  recordDispatch: { from: ["outgoing_registered"], roles: ["registrar"], directions: ["incoming", "outgoing"], to: () => "dispatched" },
  file: {
    from: ["dispatched", "approved"], roles: ["registrar"],
    to: (d) => {
      if (d.status === "approved" && d.direction !== "internal") throw new TransitionError("file");
      return "filed";
    },
  },
  fileWithoutReply: { from: ["registered", "assigned"], roles: ["registrar"], to: () => "filed" },
  cancel: { from: OPEN, roles: ["registrar"], needsReason: true, to: () => "cancelled" },
  correctMetadata: {
    from: [...OPEN, "outgoing_registered", "dispatched", "filed"], roles: ["registrar"], needsReason: true,
    to: (d) => d.status,
  },
  extendDeadline: { from: ["registered", "assigned", "drafting", "in_approval"], roles: ["director"], needsReason: true, to: (d) => d.status },
};

export class TransitionError extends Error {
  constructor(public action: string) {
    super(`transition_not_allowed: ${action}`);
  }
}

export interface TransitionInput {
  action: DocAction;
  doc: { status: DocStatus; direction: Direction; assigneeId: string | null };
  actor: { id: string; role: Role };
  reason?: string;
}

export function canTransition(i: TransitionInput): boolean {
  try {
    nextStatus(i);
    return true;
  } catch {
    return false;
  }
}

export function nextStatus({ action, doc, actor, reason }: TransitionInput): DocStatus {
  const r = RULES[action];
  if (!r.from.includes(doc.status) || !r.roles.includes(actor.role)) throw new TransitionError(action);
  if (r.directions && !r.directions.includes(doc.direction)) throw new TransitionError(action);
  if (r.onlyAssignee && doc.assigneeId !== actor.id) throw new TransitionError(action);
  if (r.needsReason && !reason?.trim()) throw new TransitionError(`${action}: motiv obligatoriu`);
  return r.to(doc);
}
