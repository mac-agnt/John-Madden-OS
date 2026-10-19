/* The guided Dunne story. Each step calls the same domain functions as the
   ordinary buttons, and a step counts as done from the records themselves, so
   doing it by hand on the page moves the guide on too. */
import type { DemoState } from "./types";
import { act, getState } from "./store";
import { dub } from "./time";
import { go } from "./ui";

const PID = "JMA-26025";
const DWG = "dwg-26025-101";
const vers = (d: DemoState) => Object.values(d.versions).filter((v) => v.drawingId === DWG);
const rev = (d: DemoState, r: string) => vers(d).find((v) => v.rev === r);
const qaAll = (id: string) => ["brief", "rooms", "titleblock", "scope"].forEach((k) => act.setQa(id, k, true));
const dunneClient = (d: DemoState) => d.projects[PID]?.clientId;
const asClient = () => { const d = getState(); const cid = dunneClient(d); if (cid) act.setPersona({ kind: "client", clientId: cid, contactId: d.clients[cid].contactIds[0] }); };
const asStaff = (kind: "admin" | "mullingar" | "philippines", staffId: string) => act.setPersona({ kind, staffId });
const clockTo = (ts: number, why: string) => { const d = getState(); if (ts > d.now) act.advanceClock(ts - d.now, why); };

export interface StoryStep { group: string; groupTitle: string; title: string; detail: string; done: (d: DemoState) => boolean; run: () => void }

export const STORY: StoryStep[] = [
  { group: "A", groupTitle: "Capture and acknowledge", title: "Simulate the Dunne website enquiry", detail: "Received 09:14:00; personalised acknowledgement at +38 s; Niamh owns the human follow-up.",
    done: (d) => !!d.leads["LEAD-009"], run: () => { asStaff("admin", "s-ciaran"); act.simulateWebsiteEnquiry(); go("Sales", "enquiries", { kind: "lead", id: "LEAD-009" }); } },
  { group: "B", groupTitle: "Qualify, quote and convert", title: "Niamh's first call (human response)", detail: "Logged separately from the automated acknowledgement.",
    done: (d) => !!d.leads["LEAD-009"]?.firstHumanResponseAt, run: () => { clockTo(dub(10, 19, 9, 40), "Niamh calls the Dunnes"); act.logHumanContact("LEAD-009", "Spoke to Ciara. Family site outside Tyrrellspass, four bedrooms, would like to start drawings this autumn. They have a site map."); go("Sales", "enquiries", { kind: "lead", id: "LEAD-009" }); } },
  { group: "B", groupTitle: "Qualify, quote and convert", title: "Create and send the €9,500 sample quote", detail: "Illustrative service-fee placeholder; tax treatment to confirm.",
    done: (d) => !!d.quotes["Q-009"], run: () => { clockTo(dub(10, 19, 10, 20), "Quote prepared"); act.qualifyLead("LEAD-009"); act.createQuote("LEAD-009", 9500, "Concept design and planning drawings for a four-bedroom one-off home near Tyrrellspass. Illustrative scope; demo fee."); go("Sales", "quotes", { kind: "lead", id: "LEAD-009" }); } },
  { group: "B", groupTitle: "Qualify, quote and convert", title: "Simulate client acceptance", detail: "Recorded acceptance, not an e-signature.",
    done: (d) => d.quotes["Q-009"]?.status === "Accepted", run: () => { act.acceptQuote("Q-009", dub(10, 19, 11, 5)); go("Sales", "quotes", { kind: "lead", id: "LEAD-009" }); } },
  { group: "B", groupTitle: "Qualify, quote and convert", title: "Record the €1,500 demo deposit", detail: "Marked received (simulation). No payment processor.",
    done: (d) => d.quotes["Q-009"]?.deposit.status === "Received (simulation)" || d.quotes["Q-009"]?.deposit.status === "Waived", run: () => { clockTo(dub(10, 19, 11, 10), "Deposit status recorded"); act.recordDeposit("Q-009"); go("Sales", "quotes", { kind: "lead", id: "LEAD-009" }); } },
  { group: "B", groupTitle: "Qualify, quote and convert", title: "Convert to JMA-26025", detail: "One household, one job, programme and tasks from the template. Repeat clicks do nothing.",
    done: (d) => !!d.projects[PID], run: () => { clockTo(dub(10, 19, 11, 15), "Conversion"); act.convertLead("LEAD-009"); go("Projects", "all", { kind: "project", id: PID }); } },
  { group: "B", groupTitle: "Qualify, quote and convert", title: "Simulate survey and brief completed", detail: "Labelled shortcut through elapsed work: visit, site map and brief confirmation are recorded at once to keep the demo short.",
    done: (d) => !!d.keys["survey:" + PID], run: () => { act.simulateSurveyAndBrief(PID, dub(10, 19, 12, 0)); go("Projects", "all", { kind: "project", id: PID }); } },
  { group: "C", groupTitle: "Send the brief to the Philippines", title: "Issue the drawing brief to Carlo", detail: "Blocked while inputs are missing; creates one task and a handoff event.",
    done: (d) => !!d.briefs["brf-26025"] && d.briefs["brf-26025"].status !== "Draft", run: () => { act.issueBrief("brf-26025", "s-carlo", undefined, dub(10, 19, 12, 15)); go("Drawings", "queue", { kind: "drawing", id: DWG }); } },
  { group: "C", groupTitle: "Send the brief to the Philippines", title: "Carlo acknowledges (Philippines preview)", detail: "He sees his brief and permitted files only: no fees, quotes or client directory.",
    done: (d) => !!d.briefs["brf-26025"]?.ackAt, run: () => { asStaff("philippines", "s-carlo"); act.acknowledgeBrief("brf-26025", dub(10, 19, 12, 32)); go("Drawings", "queue", { kind: "drawing", id: DWG }); } },
  { group: "D", groupTitle: "Return Rev A and issue it", title: "Carlo returns Rev A", detail: "A real version record in office review. Not client-visible; no notification.",
    done: (d) => !!rev(d, "A"), run: () => { asStaff("philippines", "s-carlo"); act.startBrief("brf-26025"); act.submitVersion(DWG, { rev: "A", summary: "First concept layout for review.", at: dub(10, 20, 8, 30), authorId: "s-carlo" }); go("Drawings", "queue", { kind: "drawing", id: DWG }); } },
  { group: "D", groupTitle: "Return Rev A and issue it", title: "Office QA and release Rev A", detail: "Explicit office check, then release. Only now does the client see it.",
    done: (d) => !!rev(d, "A")?.releasedAt, run: () => { asStaff("mullingar", "s-aoife"); clockTo(dub(10, 20, 9, 30), "Office review"); const v = rev(getState(), "A"); if (v) { qaAll(v.id); act.releaseVersion(v.id); } go("Drawings", "review", { kind: "drawing", id: DWG }); } },
  { group: "E", groupTitle: "Client reviews and requests a change", title: "Dunne portal: pin a change on Rev A", detail: "Bound to Rev A, sheet A-101, pin coordinates. Creates one task for Eoin.",
    done: (d) => Object.values(d.amendments).some((a) => a.projectId === PID), run: () => { asClient(); const v = rev(getState(), "A"); if (v) act.addAmendment(v.id, { x: 0.66, y: 0.33 }, "Could we widen the kitchen sliding door from 2.4 m to 3.6 m and extend the terrace by 1.2 m?", dub(10, 20, 12, 10)); } },
  { group: "F", groupTitle: "Office amendment, Rev B and approval", title: "Eoin loads Rev B", detail: "New immutable version with a change summary naming the amendment.",
    done: (d) => !!rev(d, "B"), run: () => { asStaff("mullingar", "s-eoin"); const d = getState(); const am = Object.values(d.amendments).filter((a) => a.projectId === PID).map((a) => a.id); act.submitVersion(DWG, { rev: "B", summary: "Kitchen sliding door widened from 2.4 m to 3.6 m; terrace extended by 1.2 m (addresses the Rev A comment).", addresses: am, at: dub(10, 20, 15, 20), authorId: "s-eoin" }); go("Drawings", "amendments", { kind: "drawing", id: DWG }); } },
  { group: "F", groupTitle: "Office amendment, Rev B and approval", title: "Office QA and release Rev B", detail: "Rev A stays in history, labelled superseded.",
    done: (d) => !!rev(d, "B")?.releasedAt, run: () => { asStaff("mullingar", "s-aoife"); clockTo(dub(10, 20, 15, 50), "Office review"); const v = rev(getState(), "B"); if (v) { qaAll(v.id); act.releaseVersion(v.id); } go("Drawings", "review", { kind: "drawing", id: DWG }); } },
  { group: "F", groupTitle: "Office amendment, Rev B and approval", title: "Client approves Rev B", detail: "Stored against the exact released version, actor, time and wording.",
    done: (d) => { const v = rev(d, "B"); return !!v && Object.values(d.approvals).some((a) => a.versionId === v.id); }, run: () => { asClient(); const v = rev(getState(), "B"); if (v) act.approveVersion(v.id, dub(10, 20, 16, 35)); } },
  { group: "G", groupTitle: "Back to the owner view", title: "Advance JMA-26025 to Planning pack", detail: "Staff action once gates pass. Nothing is lodged.",
    done: (d) => d.projects[PID]?.stage === "pack", run: () => { asStaff("admin", "s-ciaran"); clockTo(dub(10, 20, 16, 50), "Office follow-up"); act.advanceStage(PID); go("Dashboard", "executive"); } },
];

export function storyIndex(d: DemoState) {
  const i = STORY.findIndex((s) => !s.done(d));
  return i < 0 ? STORY.length : i;
}
export function runNextStep() {
  const i = storyIndex(getState());
  if (i < STORY.length) STORY[i].run();
}
