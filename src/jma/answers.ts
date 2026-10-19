/* Deterministic, clearly simulated Home chat answers. Each one is computed from
   the store at the moment it is asked, links to real records, and reflects every
   change made in the demo. No language model is called. */
import type { DemoState } from "./types";
import * as S from "./selectors";
import { stageDef } from "./template";
import { fmtDateTime, fmtShortDate, dueLabel, TZ_PH } from "./time";
import { go } from "./ui";

export type Answer = { tool: string; effect: "read"; text: string; cols?: string[]; rows?: string[][]; actions: [string, number, () => void][] };

const TOOL = "jma.read_records · simulated";

export function jmaAnswer(q: string, d: DemoState): Answer {
  const s = q.toLowerCase();
  const c = S.counts(d);

  if (/dunne|26025|tyrrellspass/.test(s)) {
    const p = d.projects["JMA-26025"];
    const lead = d.leads["LEAD-009"];
    if (!lead) return { tool: TOOL, effect: "read", text: "There is no Dunne record yet. Start the guided story (or Sales → Enquiries → Simulate website enquiry) to capture their enquiry.", actions: [["Open Sales enquiries", 1, () => go("Sales", "enquiries")]] };
    const evs = d.events.filter((e) => e.subject.id === "JMA-26025" || e.subject.id === "LEAD-009").slice(-6).reverse();
    const text = p
      ? "JMA-26025 (Dunne, Tyrrellspass) is at " + stageDef(p.stage).name + ". Next: " + S.nextAction(d, p) + ". It started as LEAD-009, acknowledged " + S.ackSeconds(lead) + " s after the web form, and Niamh's human follow-up is recorded separately. Latest changes below."
      : "LEAD-009 (Ciara and Stephen Dunne) is " + lead.status.toLowerCase() + ". The acknowledgement went " + (S.ackSeconds(lead) ?? "-") + " s after receipt" + (lead.firstHumanResponseAt ? "; Niamh has spoken to them." : "; Niamh's first call is still due.");
    return { tool: TOOL, effect: "read", text, cols: ["What changed", "Who", "When", "Type"], rows: evs.map((e) => [e.summary, e.actor.name.replace(" (simulated agent)", ""), fmtDateTime(e.at), e.type]),
      actions: p ? [["Open JMA-26025", 1, () => go("Projects", "all", { kind: "project", id: "JMA-26025" })], ["Open the drawing", 0, () => go("Drawings", "register", { kind: "drawing", id: "dwg-26025-101" })]] : [["Open LEAD-009", 1, () => go("Sales", "enquiries", { kind: "lead", id: "LEAD-009" })]] };
  }

  if (/late|overdue drawing|drawings? (are )?late|philippines|offshore|which drawings/.test(s)) {
    const rows = S.philippinesQueue(d);
    const late = rows.filter((r) => r.overdue);
    const text = late.length
      ? late.length + " of " + rows.length + " Philippines assignments are overdue: " + late.map((r) => S.household(d, r.project.id) + " (" + S.staffName(d, r.brief.assigneeId) + ", due " + fmtShortDate(r.task!.due, TZ_PH) + " Manila)").join(" and ") + ". Both are awaiting a first return; the accountable office owner is shown separately from who holds the work."
      : "No Philippines assignment is overdue. " + rows.length + " are active.";
    return { tool: TOOL, effect: "read", text, cols: ["Project", "Assignee", "Due (Manila)", "Status"], rows: rows.map((r) => [r.project.id + " " + S.household(d, r.project.id), S.staffName(d, r.brief.assigneeId), r.task ? fmtDateTime(r.task.due, TZ_PH) : "-", r.overdue ? "Overdue" : r.brief.status]),
      actions: [["Open Philippines queue", 1, () => go("Drawings", "queue")], ...(late[0] ? [["Open " + S.household(d, late[0].project.id), 0, () => go("Projects", "all", { kind: "project", id: late[0].project.id })] as [string, number, () => void]] : [])] };
  }

  if (/waiting|on clients|client input|waiting on/.test(s)) {
    const w = S.waitingOnClients(d);
    return { tool: TOOL, effect: "read", text: w.length + " items are waiting on clients. " + w.filter((r) => r.blocking).length + " of them block progress" + (w.find((r) => r.blocking) ? " (" + S.household(d, w.find((r) => r.blocking)!.projectId) + ": " + w.find((r) => r.blocking)!.label.toLowerCase() + ")" : "") + ". The rest are drawing reviews where the client has the next move.",
      cols: ["Project", "Waiting for", "Asked", "Next reminder"], rows: w.map((r) => [r.projectId + " " + S.household(d, r.projectId), r.label, fmtShortDate(r.requestedAt), r.nextReminderAt ? fmtDateTime(r.nextReminderAt) : r.state]),
      actions: [["Open Waiting on clients", 1, () => go("Clients", "waiting")]] };
  }

  if (/lead|enquir|sales|quote|pipeline/.test(s)) {
    const leads = S.openLeads(d);
    return { tool: TOOL, effect: "read", text: leads.length + " open leads. " + c.sentQuotes + " quotes are out, " + S.euro(c.pipeline) + " in quoted pipeline (demo fees; not revenue). " + S.newEnquiriesToday(d) + " new enquiries today.",
      cols: ["Lead", "Source", "Status", "Next contact"], rows: leads.map((l) => [l.id + " " + l.name, l.source, l.status, l.nextContactAt ? fmtDateTime(l.nextContactAt) : "-"]),
      actions: [["Open Sales pipeline", 1, () => go("Sales", "pipeline")]] };
  }

  if (/walsh|site map/.test(s)) {
    const r = d.requests["req-26003-map"];
    return { tool: TOOL, effect: "read", text: r && r.state === "Outstanding" ? "Walsh (JMA-26003) cannot release the brief: the site map is missing. Niamh holds the chase; " + r.remindersSent + " of " + r.maxReminders + " reminders sent, next " + (r.nextReminderAt ? fmtDateTime(r.nextReminderAt) : "not scheduled") + "." : "The Walsh site map has arrived. Reminders stopped and the brief gate is satisfied for that item.",
      actions: [["Open JMA-26003", 1, () => go("Projects", "all", { kind: "project", id: "JMA-26003" })], ["Open Walsh portal", 0, () => go("Clients", "portal")]] };
  }

  if (/nolan|council|further info/.test(s)) {
    const cr = d.council["fi-26004"];
    return { tool: TOOL, effect: "read", text: "Nolan (JMA-26004) has a recorded further-information request (sample). Internal target " + fmtDateTime(cr.internalTarget) + "; recorded council date " + fmtDateTime(cr.externalDate) + ". Both are sample dates, not statutory calculations. Status: " + cr.state.toLowerCase() + ".",
      actions: [["Open JMA-26004", 1, () => go("Projects", "all", { kind: "project", id: "JMA-26004" })]] };
  }

  if (/attention|need|today|morning|brief|what should|priorit|what changed/.test(s)) {
    const att = S.attention(d);
    const text = c.live + " live projects. " + att.length + " need attention: " + att.map((a) => S.household(d, a.project.id) + " (" + a.reasons.map((r) => r.kind).join(", ") + ")").join(", ") + ". " + c.overdue + " internal tasks are overdue in total. Everything below links to the record.";
    return { tool: TOOL, effect: "read", text, cols: ["Project", "Why", "Held by", "Target"], rows: att.map((a) => { const r = S.projectRows(d).find((x) => x.p.id === a.project.id)!; return [a.project.id + " " + r.household, a.reasons[0].text, r.holder, dueLabel(r.target, d.now)]; }),
      actions: [["Open the dashboard", 1, () => go("Dashboard", "executive")], ["Open Ops Watchdog", 0, () => go("Agents", "watchdog")]] };
  }

  return { tool: TOOL, effect: "read", text: "This demo answers from the John Madden OS records only, and every answer is simulated rather than generated. Try: what needs my attention, which drawings are late, jobs waiting on clients, what changed on the Dunne project, the Walsh site map, Nolan's council request, or the sales pipeline.",
    actions: [["What needs my attention?", 1, () => "ask"]] };
}
