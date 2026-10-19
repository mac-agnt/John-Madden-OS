/* The six operational agents. They are simulated: each reads the store through
   selectors and can only draft or flag. Anything with an effect waits for a
   person. No novelty personalities and no design or compliance claims. */
import type { DemoState } from "./types";
import * as S from "./selectors";
import { fmtShortDate } from "./time";

export interface AgentDef {
  id: string; name: string; shape: string; tint: string; purpose: string;
  inputs: string[]; allowed: string[]; boundary: string; never: string; eventMatch: RegExp;
}

export const AGENTS: AgentDef[] = [
  { id: "ag-briefing", name: "Briefing", shape: "crown-pebble", tint: "#1b2430", purpose: "Summarises current numbers and the next decisions for Ciaran each morning.",
    inputs: ["Projects and stages", "Tasks and due dates", "Drawing queue", "Client requests", "Sales pipeline"], allowed: ["Read records", "Write a briefing to Home"], boundary: "Read-only. It changes nothing.", never: "Never sends anything outside the app.", eventMatch: /^Briefing/ },
  { id: "ag-ops-watchdog", name: "Ops Watchdog", shape: "control-cube", tint: "#1b2430", purpose: "Flags late tasks, missing owners and deadline conflicts, and offers a draft escalation.",
    inputs: ["Open tasks", "Programme forecasts", "Fixed and recorded external dates"], allowed: ["Raise attention events", "Draft an escalation message"], boundary: "Escalations are drafts. A person decides whether to send or reassign.", never: "Never reassigns or moves dates by itself.", eventMatch: /^Ops Watchdog/ },
  { id: "ag-drawing-coordinator", name: "Drawing Coordinator", shape: "precision-brow", tint: "#1b2430", purpose: "Checks brief completeness, watches handoffs and drafts follow-up tasks.",
    inputs: ["Drawing briefs", "Assignments and acknowledgements", "Clarification threads"], allowed: ["Block an incomplete brief", "Draft a follow-up task"], boundary: "Office staff issue briefs and release drawings.", never: "Never certifies or approves a drawing.", eventMatch: /^Drawing Coordinator/ },
  { id: "ag-client-care", name: "Client Care", shape: "low-dome", tint: "#1b2430", purpose: "Surfaces outstanding client inputs, drafts replies and recommends published FAQs.",
    inputs: ["Client requests", "Portal messages", "Published FAQs"], allowed: ["Draft a reply", "Suggest an FAQ", "Alert the office"], boundary: "Replies go out only after a person sends them.", never: "Never promises a planning outcome or a decision date.", eventMatch: /^Client Care/ },
  { id: "ag-lead-response", name: "Lead Response", shape: "wide-eyed", tint: "#1b2430", purpose: "Sends the personalised acknowledgement, checks for duplicates and assigns the follow-up owner.",
    inputs: ["New enquiries", "Existing leads and clients", "Message templates"], allowed: ["Send the approved acknowledgement template", "Merge a duplicate submission", "Create a follow-up task"], boundary: "Substantive replies and quotes are human.", never: "Cannot agree fees, discounts or commercial terms.", eventMatch: /^Lead Response/ },
  { id: "ag-document-checker", name: "Document Checker", shape: "glass-visor", tint: "#1b2430", purpose: "Flags missing required file types and versions against stage gates.",
    inputs: ["Stage checklists", "Documents", "Drawing versions"], allowed: ["Flag a missing document", "Draft a client request"], boundary: "Flags only. Staff decide what counts as complete.", never: "Does not assert authenticity or professional compliance.", eventMatch: /^Document Checker/ },
];

/** The Briefing line, rendered from the store, never typed in. */
export function briefingLines(d: DemoState): { k: string; v: string; go?: [string, string, string?] }[] {
  const c = S.counts(d);
  const ph = S.philippinesQueue(d).filter((r) => r.overdue).sort((a, b) => a.project.id.localeCompare(b.project.id));
  const amends = S.overdueTasks(d).filter((t) => t.kind === "amendment");
  const blocked = Object.values(d.requests).filter((r) => r.blocking && r.state === "Outstanding");
  const fi = Object.values(d.council).filter((x) => x.state === "Response in preparation");
  const other = S.overdueTasks(d).filter((t) => t.kind !== "amendment" && !(t.kind === "drawing" && d.staff[t.assigneeId]?.team === "Philippines"));
  const lines: { k: string; v: string; go?: [string, string, string?] }[] = [{ k: "Projects", v: c.live + " live projects. " + c.attention + " need attention.", go: ["Dashboard", "executive"] }];
  lines.push({ k: "Philippines", v: ph.length ? ph.map((r) => S.household(d, r.project.id)).join(" and ") + " account for " + ph.length + " overdue Philippines assignment" + (ph.length === 1 ? "" : "s") + "." : "No Philippines assignment is overdue.", go: ["Drawings", "queue"] });
  if (amends.length) lines.push({ k: "Amendments", v: amends.map((t) => S.firstName(d, t.assigneeId) + " has 1 overdue " + S.household(d, t.projectId!) + " amendment").join("; ") + ".", go: ["Drawings", "amendments"] });
  else lines.push({ k: "Amendments", v: "No amendment is overdue.", go: ["Drawings", "amendments"] });
  lines.push({ k: "Blocked", v: blocked.length ? blocked.map((r) => S.household(d, r.projectId) + " needs a " + r.label.toLowerCase()).join("; ") + "." : "Nothing is blocked on a client document.", go: ["Clients", "waiting"] });
  fi.forEach((x) => lines.push({ k: "Council", v: S.household(d, x.projectId) + "'s internal response target is " + fmtShortDate(x.internalTarget) + " (recorded council date " + fmtShortDate(x.externalDate) + ", sample).", go: ["Projects", "all", x.projectId] }));
  if (other.length) lines.push({ k: "Other overdue", v: other.length + " further internal task" + (other.length === 1 ? "" : "s") + " past due.", go: ["Work", "tasks"] });
  return lines;
}

export function briefingSentence(d: DemoState) {
  return briefingLines(d).map((l) => l.v).join(" ");
}
