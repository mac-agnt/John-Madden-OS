/* Derived views over the store. Every count on screen comes from here, so a
   change in one record moves every number that depends on it. Selectors are
   memoised per state object. */
import type { ActivityEvent, Amendment, ClientRequest, DemoState, DrawingBrief, DrawingVersion, ID, Lead, Project, StageKey, Task } from "./types";
import { STAGES, stageDef, stageIndex } from "./template";
import { calendarDaysBetween, workingDaysBetween } from "./time";
import { gateFor, programmeView } from "./store";

const cache = new WeakMap<DemoState, Map<string, unknown>>();
function memo<T>(d: DemoState, key: string, fn: () => T): T {
  let m = cache.get(d);
  if (!m) { m = new Map(); cache.set(d, m); }
  if (!m.has(key)) m.set(key, fn());
  return m.get(key) as T;
}

export const isOpen = (t: Task) => t.state === "Open" || t.state === "In progress" || t.state === "Paused";
export const isOverdue = (d: DemoState, t: Task) => (t.state === "Open" || t.state === "In progress") && t.due < d.now;
export const household = (d: DemoState, pid: ID) => d.clients[d.projects[pid]?.clientId]?.household || "";
export const projectLabel = (d: DemoState, pid: ID) => pid + " · " + household(d, pid);
export const staffName = (d: DemoState, id?: ID) => (id ? d.staff[id]?.name || d.contacts[id]?.name || id : "Unassigned");
export const firstName = (d: DemoState, id?: ID) => staffName(d, id).split(" ")[0];

export const liveProjects = (d: DemoState) => memo(d, "live", () => Object.values(d.projects).filter((p) => p.status === "Live").sort((a, b) => a.id.localeCompare(b.id)));
export const openTasks = (d: DemoState) => memo(d, "openTasks", () => Object.values(d.tasks).filter(isOpen));
export const overdueTasks = (d: DemoState) => memo(d, "overdue", () => openTasks(d).filter((t) => isOverdue(d, t)).sort((a, b) => a.due - b.due));

export const drawingsFor = (d: DemoState, pid: ID) => Object.values(d.drawings).filter((x) => x.projectId === pid).sort((a, b) => a.sheet.localeCompare(b.sheet));
export const versionsFor = (d: DemoState, drawingId: ID) => Object.values(d.versions).filter((v) => v.drawingId === drawingId).sort((a, b) => a.uploadedAt - b.uploadedAt);
export const latestReleased = (d: DemoState, drawingId: ID): DrawingVersion | undefined => versionsFor(d, drawingId).filter((v) => v.state === "Released").pop();
export const latestUploaded = (d: DemoState, drawingId: ID): DrawingVersion | undefined => versionsFor(d, drawingId).pop();
export const approvalFor = (d: DemoState, versionId: ID) => Object.values(d.approvals).find((a) => a.versionId === versionId);
export const briefFor = (d: DemoState, pid: ID): DrawingBrief | undefined => Object.values(d.briefs).find((b) => b.projectId === pid);
export const openAmendments = (d: DemoState, pid?: ID): Amendment[] => Object.values(d.amendments).filter((a) => a.state !== "Released" && (!pid || a.projectId === pid));

export const ACTIVE_BRIEF: DrawingBrief["status"][] = ["Issued", "Acknowledged", "In progress", "Awaiting clarification", "Submitted", "Returned for correction"];
export type QueueRow = { brief: DrawingBrief; task?: Task; project: Project; overdue: boolean; assigneeTz: string };
export const philippinesQueue = (d: DemoState) => memo(d, "phq", (): QueueRow[] =>
  Object.values(d.briefs)
    .filter((b) => b.assigneeId && d.staff[b.assigneeId]?.team === "Philippines" && ACTIVE_BRIEF.includes(b.status))
    .map((b) => { const task = b.taskId ? d.tasks[b.taskId] : undefined; return { brief: b, task, project: d.projects[b.projectId], overdue: !!task && isOverdue(d, task), assigneeTz: d.staff[b.assigneeId!].tz }; })
    .sort((a, b) => (a.task?.due || 0) - (b.task?.due || 0)));

export type Reason = { kind: "overdue" | "blocked" | "deadline" | "conflict"; text: string; taskId?: ID; requestId?: ID };
export type AttentionRow = { project: Project; reasons: Reason[]; rank: number };
export const attention = (d: DemoState) => memo(d, "attention", (): AttentionRow[] => {
  const map = new Map<ID, Reason[]>();
  const add = (pid: ID, r: Reason) => { if (!d.projects[pid] || d.projects[pid].status !== "Live") return; map.set(pid, (map.get(pid) || []).concat([r])); };
  overdueTasks(d).forEach((t) => { if (t.projectId) add(t.projectId, { kind: "overdue", text: t.title + " (" + staffName(d, t.assigneeId) + ")", taskId: t.id }); });
  Object.values(d.requests).forEach((r) => { if (r.blocking && r.state === "Outstanding") add(r.projectId, { kind: "blocked", text: r.label + " missing; blocks " + stageDef(d.projects[r.projectId].stage).name.toLowerCase(), requestId: r.id }); });
  Object.values(d.council).forEach((c) => {
    if (c.state === "Response in preparation" && workingDaysBetween(d.now, c.internalTarget) <= 2)
      add(c.projectId, { kind: "deadline", text: "Further-information response: internal target " + new Date(c.internalTarget).toLocaleDateString("en-IE", { day: "numeric", month: "short", timeZone: "Europe/Dublin" }) + ", recorded council date " + new Date(c.externalDate).toLocaleDateString("en-IE", { day: "numeric", month: "short", timeZone: "Europe/Dublin" }) + " (sample)" });
  });
  liveProjects(d).forEach((p) => { programmeView(d, p.id).filter((v) => v.conflict).forEach((v) => add(p.id, { kind: "conflict", text: "Forecast conflicts with " + v.label })); });
  const rank = { overdue: 0, blocked: 1, conflict: 2, deadline: 3 };
  return [...map.entries()].map(([pid, reasons]) => ({ project: d.projects[pid], reasons, rank: Math.min(...reasons.map((r) => rank[r.kind])) }))
    .sort((a, b) => a.rank - b.rank || a.project.id.localeCompare(b.project.id));
});

export const awaitingReview = (d: DemoState) => memo(d, "awaitReview", () => liveProjects(d).filter((p) => {
  if (p.stage !== "review") return false;
  const dw = drawingsFor(d, p.id)[0]; if (!dw) return false;
  const v = latestReleased(d, dw.id); if (!v) return false;
  return !approvalFor(d, v.id) && openAmendments(d, p.id).length === 0;
}));

export const stageCounts = (d: DemoState) => memo(d, "stageCounts", () => {
  const c: Record<string, number> = {};
  liveProjects(d).forEach((p) => (c[p.stage] = (c[p.stage] || 0) + 1));
  return STAGES.filter((s) => !s.pre).map((s) => ({ stage: s, count: c[s.key] || 0 }));
});

export const stageAgeDays = (d: DemoState, p: Project) => calendarDaysBetween(p.stageEnteredAt, d.now);

/** Who holds the job right now (may differ from the accountable owner). */
export function currentHolder(d: DemoState, p: Project): { id: ID; name: string; why: string } {
  const req = Object.values(d.requests).find((r) => r.projectId === p.id && r.blocking && r.state === "Outstanding");
  if (req) return { id: req.contactId, name: d.contacts[req.contactId]?.name + " (client)", why: req.label };
  const amend = openAmendments(d, p.id).find((a) => a.state === "Open" && a.taskId);
  if (amend) { const t = d.tasks[amend.taskId!]; return { id: t.assigneeId, name: staffName(d, t.assigneeId), why: "Amendment" }; }
  const b = briefFor(d, p.id);
  if (b && b.assigneeId && ACTIVE_BRIEF.includes(b.status) && b.status !== "Submitted") return { id: b.assigneeId, name: staffName(d, b.assigneeId), why: "Drawing: " + b.status.toLowerCase() };
  const qa = openTasks(d).find((t) => t.projectId === p.id && t.kind === "qa");
  if (qa) return { id: qa.assigneeId, name: staffName(d, qa.assigneeId), why: "Office QA" };
  if (p.stage === "review") { const r = Object.values(d.requests).find((x) => x.projectId === p.id && x.kind === "Decision" && x.state === "Outstanding"); if (r) return { id: r.contactId, name: d.contacts[r.contactId]?.name + " (client)", why: "Reviewing drawing" }; }
  const t = openTasks(d).filter((x) => x.projectId === p.id).sort((a, b) => a.due - b.due)[0];
  if (t) return { id: t.assigneeId, name: staffName(d, t.assigneeId), why: t.title };
  if (p.stage === "lodged") return { id: "council", name: "Council (external)", why: "Assessment" };
  return { id: p.ownerId, name: staffName(d, p.ownerId), why: "Owner" };
}

export function nextAction(d: DemoState, p: Project): string {
  if (p.nextAction) return p.nextAction;
  const req = Object.values(d.requests).find((r) => r.projectId === p.id && r.blocking && r.state === "Outstanding");
  if (req) return "Get " + req.label.toLowerCase() + " from client";
  const am = openAmendments(d, p.id)[0];
  if (am) return am.state === "Open" ? "Draw requested change (" + firstName(d, d.tasks[am.taskId || ""]?.assigneeId) + ")" : "Release revision addressing the change";
  switch (p.stage) {
    case "concept": { const b = briefFor(d, p.id); return b?.status === "Submitted" ? "Office QA of returned drawing" : "Await return from " + firstName(d, b?.assigneeId); }
    case "review": return "Client decision on latest revision";
    case "pack": return p.note;
    case "lodged": return "Status check; decision is external";
    case "fi": return "Prepare further-information response";
    case "working": return "Complete construction drawing checklist";
    case "survey": return "Complete site visit and inputs";
    case "brief": return "Issue the drawing brief";
    default: return stageDef(p.stage).exit;
  }
}

export type ProjectRow = { p: Project; household: string; stageName: string; owner: string; holder: string; holderWhy: string; days: number; next: string; target: number; targetKind: string; reasons: Reason[]; overdueCount: number; ready: boolean };
export const projectRows = (d: DemoState) => memo(d, "rows", (): ProjectRow[] => {
  const att = new Map(attention(d).map((a) => [a.project.id, a.reasons]));
  return liveProjects(d).map((p) => {
    const h = currentHolder(d, p);
    const ov = overdueTasks(d).filter((t) => t.projectId === p.id).length;
    return { p, household: household(d, p.id), stageName: stageDef(p.stage).name, owner: staffName(d, p.ownerId), holder: h.name, holderWhy: h.why, days: stageAgeDays(d, p), next: nextAction(d, p), target: p.nextTarget, targetKind: p.nextTargetKind, reasons: att.get(p.id) || [], overdueCount: ov, ready: gateFor(d, p.id).every((g) => g.done) };
  });
});

/* Sales */
export const openLeads = (d: DemoState) => memo(d, "openLeads", () => Object.values(d.leads).filter((l) => l.status !== "Accepted" && l.status !== "Lost").sort((a, b) => a.id.localeCompare(b.id)));
export const sentQuotes = (d: DemoState) => memo(d, "sentQuotes", () => Object.values(d.quotes).filter((q) => q.status === "Sent"));
export const quotedPipeline = (d: DemoState) => sentQuotes(d).reduce((n, q) => n + q.amount, 0);
export const newEnquiriesToday = (d: DemoState) => Object.values(d.leads).filter((l) => calendarDaysBetween(l.receivedAt, d.now) === 0 && l.receivedAt <= d.now).length;
export const euro = (n: number) => "€" + Math.round(n).toLocaleString("en-IE");
export const ackSeconds = (l: Lead) => (l.ackAt ? Math.round((l.ackAt - l.receivedAt) / 1000) : null);
export const humanResponseHours = (l: Lead) => (l.firstHumanResponseAt ? (l.firstHumanResponseAt - l.receivedAt) / 3600000 : null);

/* People and workload */
export const workload = (d: DemoState) => memo(d, "workload", () => Object.values(d.staff).map((s) => {
  const mine = openTasks(d).filter((t) => t.assigneeId === s.id);
  return { staff: s, open: mine.length, overdue: mine.filter((t) => isOverdue(d, t)).length, drawing: mine.filter((t) => t.kind === "drawing").length, office: mine.filter((t) => t.kind !== "drawing").length, tasks: mine.sort((a, b) => a.due - b.due) };
}));

export const waitingOnClients = (d: DemoState) => memo(d, "waiting", (): ClientRequest[] => Object.values(d.requests).filter((r) => (r.state === "Outstanding" || r.state === "Paused") && d.projects[r.projectId]?.status === "Live").sort((a, b) => a.requestedAt - b.requestedAt));

/* Approvals queue for Work → Approvals */
export type ApprovalItem = { kind: "Office release" | "Client decision" | "Override"; subject: string; versionId?: ID; projectId: ID; at: number; who: string; state: string };
export const approvalQueue = (d: DemoState) => memo(d, "approvals", (): ApprovalItem[] => {
  const out: ApprovalItem[] = [];
  Object.values(d.versions).filter((v) => v.state === "In office review").forEach((v) => { const dw = d.drawings[v.drawingId]; out.push({ kind: "Office release", subject: dw.number + " Rev " + v.rev, versionId: v.id, projectId: dw.projectId, at: v.uploadedAt, who: staffName(d, d.projects[dw.projectId].ownerId), state: "Awaiting office QA" }); });
  awaitingReview(d).forEach((p) => { const dw = drawingsFor(d, p.id)[0]; const v = latestReleased(d, dw.id)!; out.push({ kind: "Client decision", subject: dw.number + " Rev " + v.rev, versionId: v.id, projectId: p.id, at: v.releasedAt || 0, who: d.contacts[d.clients[p.clientId].contactIds[0]].name, state: "Awaiting client" }); });
  return out.sort((a, b) => a.at - b.at);
});
export const decidedApprovals = (d: DemoState) => memo(d, "decided", () => {
  const client = Object.values(d.approvals).map((a) => ({ kind: "Client decision" as const, at: a.at, text: staffName(d, a.actorId) + " approved " + d.drawings[d.versions[a.versionId].drawingId].number + " Rev " + d.versions[a.versionId].rev, projectId: a.projectId, versionId: a.versionId }));
  const rel = Object.values(d.versions).filter((v) => v.releasedAt).map((v) => ({ kind: "Office release" as const, at: v.releasedAt!, text: staffName(d, v.reviewerId) + " released " + d.drawings[v.drawingId].number + " Rev " + v.rev, projectId: d.drawings[v.drawingId].projectId, versionId: v.id }));
  const ovr = d.events.filter((e) => e.type === "stage.entered" && /override/.test(e.summary)).map((e) => ({ kind: "Override" as const, at: e.at, text: e.actor.name + ": " + e.summary, projectId: e.subject.id, versionId: undefined }));
  return [...client, ...rel, ...ovr].sort((a, b) => b.at - a.at);
});

/* Persona scope: applied to navigation, lists, search, detail and activity alike. */
export const canSeeFees = (d: DemoState) => d.persona.kind === "admin" || d.persona.kind === "mullingar" || d.persona.kind === "sales";
export const canConfigure = (d: DemoState) => d.persona.kind === "admin";
export function visibleProjectIds(d: DemoState): Set<ID> {
  return memo(d, "visProj:" + JSON.stringify(d.persona), () => {
    const all = Object.keys(d.projects);
    switch (d.persona.kind) {
      case "admin": case "mullingar": case "sales": return new Set(all);
      case "philippines": return new Set(Object.values(d.briefs).filter((b) => b.assigneeId === d.persona.staffId && ACTIVE_BRIEF.includes(b.status)).map((b) => b.projectId));
      case "client": return new Set(all.filter((id) => d.projects[id].clientId === d.persona.clientId));
    }
  });
}
export function visibleEvents(d: DemoState): ActivityEvent[] {
  return memo(d, "visEv:" + JSON.stringify(d.persona), () => {
    if (d.persona.kind === "admin" || d.persona.kind === "mullingar") return d.events.filter((e) => e.at <= d.now + 60000);
    if (d.persona.kind === "sales") return d.events.filter((e) => e.at <= d.now + 60000 && (e.subject.kind === "lead" || /lead|quote|deposit|message/.test(e.type)));
    const vis = visibleProjectIds(d);
    const phSafe = /brief|drawing\.(uploaded|returned|released)|clarification/;
    return d.events.filter((e) => e.at <= d.now + 60000 && e.subject.kind === "project" && vis.has(e.subject.id) && (d.persona.kind !== "philippines" || phSafe.test(e.type)));
  });
}
/** Documents a persona may open. Clients see published client copies; the Philippines team sees drawing inputs for their own briefs. */
export function visibleDocs(d: DemoState) {
  const vis = visibleProjectIds(d);
  return Object.values(d.documents).filter((x) => {
    if (d.persona.kind === "admin" || d.persona.kind === "mullingar") return true;
    if (d.persona.kind === "sales") return x.type === "Quote acceptance" || x.visibility === "Client";
    if (!x.projectId || !vis.has(x.projectId)) return false;
    if (d.persona.kind === "client") return x.visibility === "Client" && x.published;
    return ["Site map", "Survey"].includes(x.type);
  });
}

export function clientMilestone(stage: StageKey) {
  const i = stageIndex(stage);
  if (i <= 2) return 0; if (i <= 4) return 1; if (stage === "concept") return 2; if (stage === "review") return 3;
  if (["pack", "lodged", "fi", "decision"].includes(stage)) return 4; return 5;
}

export const counts = (d: DemoState) => memo(d, "counts", () => ({
  live: liveProjects(d).length,
  attention: attention(d).length,
  awaitingReview: awaitingReview(d).length,
  overdue: overdueTasks(d).length,
  phActive: philippinesQueue(d).length,
  phOverdue: philippinesQueue(d).filter((r) => r.overdue).length,
  openLeads: openLeads(d).length,
  sentQuotes: sentQuotes(d).length,
  pipeline: quotedPipeline(d),
  waiting: waitingOnClients(d).length,
  officeReview: Object.values(d.versions).filter((v) => v.state === "In office review").length,
  openAmendments: openAmendments(d).length,
}));
