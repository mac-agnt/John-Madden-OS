/* The single demo store. Every button, guided step and agent draft calls one of
   these domain functions, so a change made anywhere shows up everywhere. All of
   it is local browser state: nothing is sent, charged or authenticated. */
import { useSyncExternalStore } from "react";
import type {
  ActivityEvent, Amendment, Approval, Channel, ClientRequest, DemoState, DocumentRec, DrawingBrief,
  DrawingVersion, ID, Lead, LeadSource, Message, PersonaKind, PlanningOutcome, Persona, Project, Quote,
  StageKey, Task, Article, Template, StageTemplate,
} from "./types";
import { ASSETS, STATE_VERSION, buildProgramme, buildSeed, freshId } from "./seed";
import { STAGES, stageDef, stageIndex } from "./template";
import { TZ_OFFICE, TZ_PH, addWorkingDays, atLocal, dub, fmtDateTime, localParts, zoned } from "./time";

const KEY = "jma-os-demo-state";

function load(): DemoState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      if (s && s.version === STATE_VERSION) return { ...s, notice: undefined };
    }
  } catch { /* storage unavailable: start from the baseline */ }
  return buildSeed();
}

let state: DemoState = load();
const listeners = new Set<() => void>();
let noticeN = 0;

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ }
}
function emit() { listeners.forEach((l) => l()); }

export function getState() { return state; }
export function subscribe(fn: () => void) { listeners.add(fn); return () => listeners.delete(fn); }
export function useDemo(): DemoState { return useSyncExternalStore(subscribe, getState, getState); }

type Result = { ok: boolean; message: string; id?: ID };
const ok = (message: string, id?: ID): Result => ({ ok: true, message, id });
const fail = (message: string): Result => ({ ok: false, message });

/** Clone, apply, persist, notify. A failed result leaves state untouched except the notice. */
function commit(fn: (d: DemoState) => Result): Result {
  const d: DemoState = structuredClone(state);
  let res: Result;
  try { res = fn(d); } catch (e) { res = fail("Something went wrong: " + (e as Error).message); }
  if (!res.ok) {
    state = { ...state, notice: { id: ++noticeN, text: res.message, tone: "warn" } };
  } else {
    d.notice = { id: ++noticeN, text: res.message, tone: "ok" };
    d.events.sort((a, b) => a.at - b.at);
    state = d;
  }
  save(); emit();
  return res;
}

/* ── helpers inside a draft ── */
const nid = freshId;
const staffActor = (d: DemoState, id: ID): ActivityEvent["actor"] =>
  d.staff[id] ? { kind: "staff", id, name: d.staff[id].name } : d.contacts[id] ? { kind: "client", id, name: d.contacts[id].name } : { kind: "system", id, name: id };
const agent = (name: string): ActivityEvent["actor"] => ({ kind: "agent", id: "ag-" + name.toLowerCase().replace(/\s+/g, "-"), name: name + " (simulated agent)" });
const system: ActivityEvent["actor"] = { kind: "system", id: "sys", name: "Workflow engine (simulated)" };
const mail: ActivityEvent["actor"] = { kind: "integration", id: "int-mail", name: "Outlook (simulated)" };

function log(d: DemoState, at: number, actor: ActivityEvent["actor"], type: string, summary: string, subject: ActivityEvent["subject"], related: ID[] = [], status: ActivityEvent["status"] = "ok", extra: Partial<ActivityEvent> = {}) {
  d.events.push({ id: nid(d, "ev"), at, actor, type, summary, subject, related, status, source: extra.source || (actor.kind === "agent" ? "Simulated agent" : actor.kind === "integration" ? "Simulated integration" : actor.kind === "client" ? "Client portal (preview)" : "John Madden OS"), ...extra });
}
const projSubject = (d: DemoState, pid: ID) => ({ kind: "project", id: pid, label: pid + " " + (d.clients[d.projects[pid]?.clientId]?.household || "") });
const actorId = (d: DemoState) => d.persona.kind === "client" ? (d.persona.contactId || "") : (d.persona.staffId || "s-ciaran");
function run(d: DemoState, ruleId: ID, eventKey: string, subject: { kind: string; id: ID }, result: "Success" | "Failed" | "Retried" | "Skipped: duplicate" | "Stopped", detail: string) {
  if (!d.rules[ruleId]?.enabled && result === "Success") { result = "Stopped"; detail = "Rule paused in Settings: " + detail; }
  const r = { id: nid(d, "run"), ruleId, eventKey, at: d.now, subject, result, detail };
  d.runs[r.id] = r;
  if (result !== "Skipped: duplicate") d.keys[eventKey] = r.id;
  return r;
}
function seen(d: DemoState, key: string) { return !!d.keys[key]; }

function newTask(d: DemoState, t: Omit<Task, "id" | "originalDue" | "dueHistory" | "createdAt"> & Partial<Pick<Task, "createdAt">>): Task {
  const task: Task = { id: nid(d, "T"), originalDue: t.due, dueHistory: [], createdAt: d.now, ...t } as Task;
  d.tasks[task.id] = task;
  return task;
}
function newMessage(d: DemoState, m: Omit<Message, "id" | "deliveryLog" | "at"> & { at?: number }): Message {
  const at = m.at ?? d.now;
  const msg: Message = { ...m, id: nid(d, "msg"), at, deliveryLog: [{ state: m.delivery, at }] } as Message;
  d.messages[msg.id] = msg;
  return msg;
}
/** A simulated send: queued, then sent and delivered a few seconds later. Never claims delivery without the step. */
function simulateSend(msg: Message, fail = false) {
  msg.deliveryLog = [{ state: "Queued", at: msg.at }];
  if (fail) {
    msg.delivery = "Failed";
    msg.deliveryLog.push({ state: "Failed", at: msg.at + 9000, note: "Provider rejected the message (simulated)." });
  } else {
    msg.delivery = "Delivered";
    msg.deliveryLog.push({ state: "Sent", at: msg.at + 3000 }, { state: "Delivered", at: msg.at + 6000, note: "Simulated provider receipt" });
  }
}
function fill(tpl: Template | undefined, vars: Record<string, string>) {
  const f = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
  return { subject: f(tpl?.subject || ""), body: f(tpl?.body || "") };
}
const firstNames = (names: string[]) => names.map((n) => n.split(" ")[0]).join(" and ");
function clientVars(d: DemoState, pid: ID) {
  const p = d.projects[pid]; const c = d.clients[p.clientId];
  const names = c.contactIds.map((x) => d.contacts[x].name);
  return { first_names: firstNames(names), locality: c.locality, owner_first: d.staff[p.ownerId].name.split(" ")[0], project: pid };
}
function moveStage(d: DemoState, p: Project, to: StageKey, by: ID, override?: string) {
  const last = p.history[p.history.length - 1];
  if (last && !last.exitedAt) last.exitedAt = d.now;
  p.history.push({ stage: to, enteredAt: d.now, by, override });
  const from = p.stage;
  p.stage = to; p.stageEnteredAt = d.now;
  log(d, d.now, staffActor(d, by), "stage.entered", "Moved from " + stageDef(from).name + " to " + stageDef(to).name + (override ? " (override: " + override + ")" : ""), projSubject(d, p.id), [], override ? "attention" : "ok", { before: stageDef(from).name, after: stageDef(to).name });
  run(d, "rule-stage-out", "stage.out:" + p.id + ":" + from + ":" + p.history.length, { kind: "project", id: p.id }, "Success", "Recorded exit from " + stageDef(from).name);
  run(d, "rule-stage-in", "stage.in:" + p.id + ":" + to + ":" + p.history.length, { kind: "project", id: p.id }, "Success", "Checklist for " + stageDef(to).name + " created");
  // obsolete reminders stop
  Object.values(d.requests).forEach((r) => {
    if (r.projectId === p.id && r.state === "Outstanding" && r.kind === "Decision" && to !== "review") { r.state = "Cancelled"; r.nextReminderAt = undefined; }
  });
  buildProgramme(d, p.id, () => nid(d, "pg"));
}
const setNow = (d: DemoState, ts: number) => { if (ts > d.now) d.now = ts; };

/* ── gates: derived from records first, manual checklist second ── */
export type GateItem = { label: string; done: boolean; source: "record" | "checklist"; key: string; hint?: string };
export function gateFor(d: DemoState, pid: ID, stage?: StageKey): GateItem[] {
  const p = d.projects[pid]; if (!p) return [];
  const s = stage || p.stage;
  const docs = Object.values(d.documents).filter((x) => x.projectId === pid);
  const has = (type: string) => docs.some((x) => x.type === type);
  const drawings = Object.values(d.drawings).filter((x) => x.projectId === pid);
  const vers = Object.values(d.versions).filter((v) => drawings.some((w) => w.id === v.drawingId));
  const released = vers.filter((v) => v.state === "Released");
  const latestRel = released.sort((a, b) => (b.releasedAt || 0) - (a.releasedAt || 0))[0];
  const approvedLatest = latestRel && Object.values(d.approvals).some((a) => a.versionId === latestRel.id);
  const openAm = Object.values(d.amendments).filter((a) => a.projectId === pid && a.state !== "Released");
  const manual = (label: string): GateItem => { const k = s + ":" + label; return { label, done: !!p.checks[k]?.done, source: "checklist", key: k }; };
  const rec = (label: string, done: boolean, hint?: string): GateItem => ({ label, done, source: "record", key: s + ":" + label, hint });
  const q = p.quoteId ? d.quotes[p.quoteId] : undefined;
  switch (s) {
    case "accepted": return [rec("Quote accepted", !q || q.status === "Accepted", q ? q.id : "Accepted before records began"), rec("Deposit received or waived", !q || q.deposit.status === "Received (simulation)" || q.deposit.status === "Waived", q ? q.deposit.status : undefined)];
    case "survey": return [rec("Site visit record", Object.values(d.visits).some((v) => v.projectId === pid && v.state === "Completed") || has("Survey")), rec("Site photos", has("Survey")), rec("Site map", has("Site map"))];
    case "brief": return [manual("Brief confirmed with client"), rec("Site map present", has("Site map"), has("Site map") ? undefined : "Waiting on client upload")];
    case "concept": return [rec("Drawing returned", vers.length > 0), rec("Office QA passed", vers.some((v) => v.reviewedAt && v.state !== "Returned for correction")), rec("Released to client", released.length > 0)];
    case "review": return [rec("Latest issued revision approved", !!approvedLatest, latestRel ? "Rev " + latestRel.rev : "Nothing released"), rec("Required amendments resolved", openAm.length === 0, openAm.length ? openAm.length + " open" : undefined)];
    case "lodged": return [manual("Submission reference recorded")];
    case "fi": return [rec("Request recorded", Object.values(d.council).some((c) => c.projectId === pid)), rec("Response evidence recorded", Object.values(d.council).some((c) => c.projectId === pid && c.state !== "Response in preparation"))];
    case "decision": return [rec("Decision and conditions recorded", !!p.decision)];
    default: return stageDef(s).required.map(manual);
  }
}
export const gateReady = (d: DemoState, pid: ID) => gateFor(d, pid).every((g) => g.done);

export function briefMissing(d: DemoState, b: DrawingBrief): string[] {
  const miss: string[] = [];
  const docs = Object.values(d.documents).filter((x) => x.projectId === b.projectId);
  if (!docs.some((x) => x.type === "Site map")) miss.push("Site map");
  if (!b.house.trim()) miss.push("House type");
  if (!b.space.trim()) miss.push("Approximate space needs");
  if (!b.priorities.trim()) miss.push("Client priorities");
  if (!b.sheets.length) miss.push("Requested sheets");
  if (!b.scopeLimits.trim()) miss.push("Scope limits");
  if (!b.approverId) miss.push("Office approver");
  return miss;
}

/* ── programme forecasts ── */
export type ProgView = { id: ID; label: string; start: number; end: number; baseStart: number; baseEnd: number; fixed: boolean; conflict: boolean; kind: string; dateKind: string; taskId?: ID; deps: ID[]; moved: boolean; overdue: boolean };
export function programmeView(d: DemoState, pid: ID, extraSlip?: { itemId: ID; wd: number }): ProgView[] {
  const items = Object.values(d.programme).filter((i) => i.projectId === pid);
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const out: Record<ID, ProgView> = {};
  const order: ID[] = [];
  const visit = (id: ID) => { if (out[id] || !byId[id]) return; byId[id].deps.forEach(visit); compute(id); order.push(id); };
  const compute = (id: ID) => {
    const it = byId[id];
    const depEnd = (base: boolean) => Math.max(0, ...it.deps.map((x) => (out[x] ? (base ? out[x].baseEnd : out[x].end) : 0)));
    const extra = extraSlip && extraSlip.itemId === id ? extraSlip.wd : 0;
    if (it.fixed) {
      const end = it.fixedEnd!, start = it.fixedStart!;
      out[id] = { id, label: it.label, start, end, baseStart: start, baseEnd: end, fixed: true, conflict: depEnd(false) > start, kind: it.kind, dateKind: it.dateKind, deps: it.deps, moved: false, overdue: false };
      return;
    }
    const t = it.taskId ? d.tasks[it.taskId] : undefined;
    const bStart = Math.max(it.baseStart || 0, depEnd(true));
    const fStart = Math.max(it.baseStart || 0, depEnd(false));
    let baseEnd: number, end: number, overdue = false;
    if (t) {
      baseEnd = t.originalDue;
      const tz = d.staff[t.assigneeId]?.tz || TZ_OFFICE;
      const due = extra ? addWorkingDays(slipBase(d, t), extra, tz) : t.due;
      if (t.state === "Done") end = t.completedAt || due;
      else if (due < d.now) { overdue = true; end = atLocal(d.now, 17, 0, tz) > d.now ? atLocal(d.now, 17, 0, tz) : atLocal(addWorkingDays(d.now, 1, tz), 17, 0, tz); }
      else end = due;
    } else {
      baseEnd = addWorkingDays(bStart, it.durationWD);
      end = addWorkingDays(fStart, it.durationWD + it.slipWD + extra);
    }
    out[id] = { id, label: it.label, start: t ? Math.min(fStart, end) : fStart, end, baseStart: bStart, baseEnd, fixed: false, conflict: false, kind: it.kind, dateKind: it.dateKind, taskId: it.taskId, deps: it.deps, moved: Math.abs(end - baseEnd) > 60000, overdue };
  };
  items.forEach((i) => visit(i.id));
  return order.map((id) => out[id]);
}

/** An overdue task slips from today's forecast, not from its stale due date. */
function slipBase(d: DemoState, t: Task) {
  if (t.due >= d.now) return t.due;
  const tz = d.staff[t.assigneeId]?.tz || TZ_OFFICE;
  const today = atLocal(d.now, 17, 0, tz);
  return today > d.now ? today : atLocal(addWorkingDays(d.now, 1, tz), 17, 0, tz);
}

/* ── actions ── */
export const act = {
  reset(): Result {
    state = { ...buildSeed(), notice: { id: ++noticeN, text: "Demo reset to the 19 October 09:00 baseline.", tone: "info" } };
    save(); emit();
    return ok("Reset");
  },
  dismissNotice() { state = { ...state, notice: undefined }; emit(); },
  setPersona(p: Persona): Result {
    return commit((d) => { d.persona = p; return ok(personaLabel(d, p) + " preview. This is a UI preview, not security."); });
  },
  advanceClock(ms: number, why: string): Result {
    return commit((d) => { d.now += ms; log(d, d.now, system, "clock.advanced", "Demo clock moved forward: " + why, { kind: "system", id: "clock", label: "Demo clock" }, [], "info"); return ok("Demo clock now " + fmtDateTime(d.now)); });
  },
  advanceToNextMorning(): Result {
    return commit((d) => {
      let t = addWorkingDays(atLocal(d.now, 9, 0), 1);
      if (localParts(d.now).h < 9) t = atLocal(d.now, 9, 0);
      d.now = t;
      log(d, d.now, system, "clock.advanced", "Demo clock moved to the next working morning", { kind: "system", id: "clock", label: "Demo clock" }, [], "info");
      return ok("Demo clock now " + fmtDateTime(d.now));
    });
  },

  /* Sales */
  simulateWebsiteEnquiry(): Result {
    return commit((d) => {
      const key = "enquiry:LEAD-009";
      if (seen(d, key) || d.leads["LEAD-009"]) {
        run(d, "rule-ack", key, { kind: "lead", id: "LEAD-009" }, "Skipped: duplicate", "Repeat of the Dunne website enquiry ignored; no second lead, task or acknowledgement");
        return ok("Already captured as LEAD-009. Duplicate ignored.", "LEAD-009");
      }
      const recvAt = d.now > dub(10, 19, 9, 14) ? d.now : dub(10, 19, 9, 14);
      const lead: Lead = { id: "LEAD-009", name: "Ciara and Stephen Dunne", locality: "Tyrrellspass", source: "Website", status: "New", receivedAt: recvAt, ownerId: "s-niamh", email: "ciara.dunne@example.com", phone: "+353 87 555 0419", requestedService: "Design for a four-bedroom one-off home", notes: "Web form: four-bedroom one-off home on a family site near Tyrrellspass, Co. Westmeath. Site map available." };
      d.leads[lead.id] = lead;
      d.now = recvAt;
      log(d, recvAt, { kind: "integration", id: "int-web", name: "Website form (simulated)" }, "lead.created", "Website enquiry from Ciara and Stephen Dunne, Tyrrellspass", { kind: "lead", id: lead.id, label: "LEAD-009 Ciara and Stephen Dunne" });
      const ackAt = recvAt + d.settings.ackDelaySec * 1000;
      const body = "Hi Ciara and Stephen, thanks for getting in touch about your proposed home in Tyrrellspass. Niamh will follow up to understand your site and what you need. If you have a site map, you can add it here.";
      const msg = newMessage(d, { leadId: lead.id, audience: "Client", channel: "Email", direction: "out", fromId: "s-niamh", subject: "Thanks for your enquiry, Ciara and Stephen", body, delivery: "Queued", automated: true, templateId: "tpl-ack", eventKey: "ack:LEAD-009", at: ackAt });
      simulateSend(msg);
      lead.ackAt = ackAt; lead.ackMessageId = msg.id; lead.nextContactAt = atLocal(recvAt, 13, 0); lead.followUpReason = "First call: site, budget and timing";
      const t = newTask(d, { title: "Call Ciara and Stephen Dunne (first human response)", kind: "followup", leadId: lead.id, assigneeId: "s-niamh", ownerId: "s-niamh", team: "Mullingar", priority: "High", due: lead.nextContactAt, state: "Open", deps: [], links: {}, createdAt: ackAt });
      d.now = ackAt;
      run(d, "rule-ack", key, { kind: "lead", id: lead.id }, "Success", "Personalised acknowledgement queued at +" + d.settings.ackDelaySec + "s; owner Niamh Doyle; follow-up task " + t.id);
      log(d, ackAt, agent("Lead Response"), "lead.acknowledged", "Sent personalised acknowledgement (email, simulated) 38 seconds after receipt", { kind: "lead", id: lead.id, label: "LEAD-009 Ciara and Stephen Dunne" }, [msg.id, t.id]);
      log(d, ackAt + 6000, mail, "message.delivered", "Acknowledgement delivered (simulated provider receipt)", { kind: "lead", id: lead.id, label: "LEAD-009 Ciara and Stephen Dunne" }, [msg.id], "info");
      setNow(d, ackAt + 7000);
      return ok("LEAD-009 captured at " + fmtDateTime(recvAt) + " and acknowledged 38 s later. Niamh owns the human follow-up.", lead.id);
    });
  },
  createManualLead(input: { name: string; locality: string; source: LeadSource; email: string; phone: string; notes: string }): Result {
    return commit((d) => {
      if (!input.name.trim() || !input.locality.trim()) return fail("Name and site locality are required.");
      if (!input.email.trim() && !input.phone.trim()) return fail("Add an email or a phone number so someone can respond.");
      const email = input.email.trim().toLowerCase();
      const dupLead = email && Object.values(d.leads).find((l) => l.email.toLowerCase() === email && l.status !== "Lost" && l.status !== "Accepted");
      if (dupLead) return fail("Possible duplicate: " + dupLead.id + " " + dupLead.name + " already uses this email. Open that lead instead.");
      const client = email ? Object.values(d.contacts).find((c) => c.email.toLowerCase() === email) : undefined;
      // LEAD-009 is reserved for the guided Dunne enquiry
      let num = Math.max(...Object.keys(d.leads).map((k) => +k.slice(5))) + 1;
      if (num === 9 && !d.leads["LEAD-009"]) num = 10;
      const id = "LEAD-" + String(num).padStart(3, "0");
      const lead: Lead = { id, name: input.name.trim(), locality: input.locality.trim(), source: input.source, status: "New", receivedAt: d.now, ownerId: "s-niamh", email: input.email.trim(), phone: input.phone.trim(), requestedService: "One-off house design", notes: input.notes.trim(), nextContactAt: atLocal(addWorkingDays(d.now, 1), 12), followUpReason: "Qualify requirements and site", duplicateOfClientId: client?.clientId };
      d.leads[id] = lead;
      newTask(d, { title: "Follow up: " + lead.name, kind: "followup", leadId: id, assigneeId: "s-niamh", ownerId: "s-niamh", team: "Mullingar", priority: "Medium", due: lead.nextContactAt!, state: "Open", deps: [], links: {} });
      log(d, d.now, staffActor(d, actorId(d)), "lead.created", input.source + " enquiry recorded manually: " + lead.name + (client ? " (existing client " + d.clients[client.clientId].household + ", new site)" : ""), { kind: "lead", id, label: id + " " + lead.name });
      return ok(id + " recorded. " + (input.source === "Phone" || input.source === "Walk-in" ? "Manual channel: no automated acknowledgement." : "") + (client ? " Linked to existing client " + d.clients[client.clientId].household + " as a new site." : ""), id);
    });
  },
  logHumanContact(leadId: ID, note: string): Result {
    return commit((d) => {
      const l = d.leads[leadId]; if (!l) return fail("Lead not found.");
      if (!note.trim()) return fail("Add a short note of the conversation.");
      if (!l.firstHumanResponseAt) l.firstHumanResponseAt = d.now;
      l.lastContactAt = d.now;
      l.notes = (l.notes ? l.notes + "\n\n" : "") + fmtDateTime(d.now) + " · " + d.staff[l.ownerId].name + ": " + note.trim();
      if (l.status === "New") l.status = "Contacted";
      const t = Object.values(d.tasks).find((x) => x.leadId === leadId && x.state !== "Done" && x.state !== "Cancelled");
      if (t) { t.state = "Done"; t.completedAt = d.now; }
      l.nextContactAt = atLocal(addWorkingDays(d.now, 2), 11);
      newTask(d, { title: "Follow up: " + l.name, kind: "followup", leadId, assigneeId: l.ownerId, ownerId: l.ownerId, team: "Mullingar", priority: "Medium", due: l.nextContactAt, state: "Open", deps: [], links: {} });
      log(d, d.now, staffActor(d, l.ownerId), "lead.contacted", "Human follow-up logged with " + l.name + " (separate from the automated acknowledgement)", { kind: "lead", id: leadId, label: leadId + " " + l.name });
      return ok("Human response recorded for " + l.name + ".");
    });
  },
  qualifyLead(leadId: ID): Result {
    return commit((d) => { const l = d.leads[leadId]; if (!l) return fail("Lead not found."); if (l.status === "Qualified") return ok("Already qualified."); l.status = "Qualified"; log(d, d.now, staffActor(d, actorId(d)), "lead.qualified", l.name + " qualified", { kind: "lead", id: leadId, label: leadId + " " + l.name }); return ok(l.name + " qualified."); });
  },
  createQuote(leadId: ID, amount: number, scope: string, send = true): Result {
    return commit((d) => {
      const l = d.leads[leadId]; if (!l) return fail("Lead not found.");
      const open = Object.values(d.quotes).find((q) => q.leadId === leadId && (q.status === "Draft" || q.status === "Sent" || q.status === "Accepted"));
      if (open) return ok(open.id + " already exists for this lead. No duplicate created.", open.id);
      if (!(amount > 0)) return fail("Enter an illustrative fee greater than zero.");
      const id = "Q-" + leadId.slice(-3);
      const q: Quote = { id, leadId, scope: scope.trim() || "Concept design and planning drawings. Illustrative scope; demo fee.", amount, status: send ? "Sent" : "Draft", createdAt: d.now, sentAt: send ? d.now : undefined, expiresAt: d.now + 30 * 86400000, deposit: { amount: 1500, status: "Not requested" } };
      d.quotes[id] = q;
      if (send) {
        l.status = "Quote sent";
        const m = newMessage(d, { leadId, audience: "Client", channel: "Email", direction: "out", fromId: l.ownerId, subject: "Your proposal from John Madden & Associates", body: "Hi " + firstNames(l.name.split(" and ")) + ", your proposal for " + l.locality + " is attached. Fees shown are demo placeholders and tax treatment is to be confirmed.", delivery: "Queued", automated: false, templateId: "tpl-quote" });
        simulateSend(m);
      }
      log(d, d.now, staffActor(d, actorId(d)), send ? "quote.sent" : "quote.drafted", (send ? "Sent " : "Drafted ") + id + " for " + l.name + " (demo fee)", { kind: "lead", id: leadId, label: leadId + " " + l.name }, [id]);
      return ok(id + (send ? " sent" : " drafted") + ". Demo fee; tax treatment to confirm.", id);
    });
  },
  sendQuote(qid: ID): Result {
    return commit((d) => { const q = d.quotes[qid]; if (!q) return fail("Quote not found."); if (q.status !== "Draft") return ok(qid + " is already " + q.status.toLowerCase() + "."); q.status = "Sent"; q.sentAt = d.now; d.leads[q.leadId].status = "Quote sent"; log(d, d.now, staffActor(d, actorId(d)), "quote.sent", "Sent " + qid, { kind: "lead", id: q.leadId, label: q.leadId }, [qid]); return ok(qid + " sent."); });
  },
  acceptQuote(qid: ID, at?: number): Result {
    return commit((d) => {
      const q = d.quotes[qid]; if (!q) return fail("Quote not found.");
      if (q.status === "Accepted") return ok(qid + " already accepted.");
      if (q.status !== "Sent") return fail("Only a sent quote can be accepted.");
      if (at) setNow(d, at);
      q.status = "Accepted"; q.acceptedAt = d.now; q.deposit.status = "Requested";
      log(d, d.now, { kind: "client", id: q.leadId, name: d.leads[q.leadId].name }, "quote.accepted", "Client accepted " + qid + " (simulated acceptance, not a signature)", { kind: "lead", id: q.leadId, label: q.leadId + " " + d.leads[q.leadId].name }, [qid]);
      return ok("Acceptance recorded for " + qid + ". Deposit requested.");
    });
  },
  recordDeposit(qid: ID): Result {
    return commit((d) => {
      const q = d.quotes[qid]; if (!q) return fail("Quote not found.");
      if (q.deposit.status === "Received (simulation)") return ok("Deposit already recorded.");
      if (q.status !== "Accepted") return fail("Record acceptance before the deposit.");
      q.deposit.status = "Received (simulation)"; q.deposit.at = d.now;
      log(d, d.now, staffActor(d, actorId(d)), "deposit.recorded", "Marked €" + q.deposit.amount.toLocaleString("en-IE") + " deposit received (simulation; no payment processed)", { kind: "lead", id: q.leadId, label: q.leadId }, [qid]);
      return ok("Deposit marked received (simulation). No payment was taken.");
    });
  },
  waiveDeposit(qid: ID, reason: string): Result {
    return commit((d) => { const q = d.quotes[qid]; if (!q) return fail("Quote not found."); if (!reason.trim()) return fail("A reason is required to waive the deposit."); q.deposit.status = "Waived"; q.deposit.waivedReason = reason.trim(); q.deposit.at = d.now; log(d, d.now, staffActor(d, actorId(d)), "deposit.waived", "Deposit waived: " + reason.trim(), { kind: "lead", id: q.leadId, label: q.leadId }, [qid], "attention"); return ok("Deposit waived with reason."); });
  },
  markLost(leadId: ID, reason: string): Result {
    return commit((d) => { const l = d.leads[leadId]; if (!l) return fail("Lead not found."); if (!reason.trim()) return fail("Add a reason."); l.status = "Lost"; l.lostReason = reason.trim(); Object.values(d.tasks).forEach((t) => { if (t.leadId === leadId && t.state !== "Done") t.state = "Cancelled"; }); Object.values(d.quotes).forEach((q) => { if (q.leadId === leadId && q.status === "Sent") q.status = "Declined"; }); log(d, d.now, staffActor(d, actorId(d)), "lead.lost", l.name + " marked lost: " + reason.trim(), { kind: "lead", id: leadId, label: leadId }); return ok(l.name + " marked lost."); });
  },
  convertLead(leadId: ID): Result {
    return commit((d) => {
      const l = d.leads[leadId]; if (!l) return fail("Lead not found.");
      if (l.projectId) {
        run(d, "rule-stage-in", "convert:" + leadId, { kind: "lead", id: leadId }, "Skipped: duplicate", "Conversion already done: " + l.projectId);
        return ok("Already converted to " + l.projectId + ". No duplicate job.", l.projectId);
      }
      const q = Object.values(d.quotes).find((x) => x.leadId === leadId && x.status === "Accepted");
      if (!q) return fail("Convert needs an accepted quote.");
      if (q.deposit.status !== "Received (simulation)" && q.deposit.status !== "Waived") return fail("Deposit requirement not satisfied. Record it or waive it with a reason.");
      const nums = Object.keys(d.projects).map((x) => +x.slice(4)).sort((a, b) => b - a);
      const pid = leadId === "LEAD-009" ? "JMA-26025" : "JMA-" + (nums[0] + 1);
      const cid = "c-" + pid.slice(4);
      const names = l.name.replace(/ and /, " Dunne and ").split(" and ").map((s) => s.trim());
      const contactNames = leadId === "LEAD-009" ? ["Ciara Dunne", "Stephen Dunne"] : l.name.includes(" and ") ? names : [l.name];
      const household = contactNames[0].split(" ").slice(-1)[0];
      let client = l.duplicateOfClientId ? d.clients[l.duplicateOfClientId] : undefined;
      if (!client) {
        client = { id: cid, household, locality: l.locality, contactIds: [], createdAt: d.now };
        contactNames.forEach((n, i) => {
          const ctid = cid + "-" + (i + 1);
          d.contacts[ctid] = { id: ctid, clientId: cid, name: n, email: i === 0 ? l.email : n.toLowerCase().replace(/[^a-z]+/g, ".") + "@example.com", phone: i === 0 ? l.phone : "", role: i === 0 ? "Primary" : "Joint", channelPref: "Email" };
          client!.contactIds.push(ctid);
        });
        d.clients[cid] = client;
      }
      const p: Project = { id: pid, clientId: client.id, locality: l.locality, stage: "accepted", ownerId: "s-aoife", templateVersion: d.template.version, stageEnteredAt: d.now,
        history: [{ stage: "enquiry", enteredAt: l.receivedAt, exitedAt: q.sentAt || q.createdAt, by: "s-niamh" }, { stage: "quote", enteredAt: q.sentAt || q.createdAt, exitedAt: d.now, by: "s-niamh" }, { stage: "accepted", enteredAt: d.now, by: "s-niamh" }],
        nextTarget: atLocal(addWorkingDays(d.now, d.template.stages.find((s) => s.key === "accepted")!.days), 17), nextTargetKind: "Internal target", nextAction: "Book the site visit", note: "Converted from " + leadId + " (" + l.source + " enquiry).", scope: { planning: true, commencement: false },
        leadId, quoteId: q.id, createdAt: d.now, status: "Live", checks: {} };
      d.projects[pid] = p;
      l.status = "Accepted"; l.projectId = pid; l.clientId = client.id;
      Object.values(d.tasks).forEach((t) => { if (t.leadId === leadId && t.state !== "Done") { t.state = "Done"; t.completedAt = d.now; } });
      const qDocId = nid(d, "doc");
      d.documents[qDocId] = { id: qDocId, projectId: pid, clientId: client.id, name: "Accepted quote " + q.id + " (demo fee)", type: "Quote acceptance", storage: "SharePoint · Projects/" + pid + "/00 Admin (proposed path)", version: "1", visibility: "Internal", published: false, uploadedBy: "s-niamh", at: d.now };
      // stage-3 and stage-4 tasks generated from the template
      const visitAt = atLocal(addWorkingDays(d.now, 2), 11, 0);
      const visId = nid(d, "vis");
      d.visits[visId] = { id: visId, projectId: pid, at: visitAt, ownerId: "s-sean", notes: "Measure the site, photograph the entrance and boundaries. Collect the client's site map.", state: "Scheduled", outputs: [] };
      newTask(d, { title: "Book and complete site visit: Dunne, Tyrrellspass".replace("Dunne, Tyrrellspass", household + ", " + l.locality), kind: "survey", projectId: pid, assigneeId: "s-sean", ownerId: "s-aoife", team: "Mullingar", priority: "Medium", due: atLocal(visitAt, 17), state: "Open", deps: [], links: {} });
      newTask(d, { title: "Confirm brief with " + household + " household", kind: "admin", projectId: pid, assigneeId: "s-aoife", ownerId: "s-aoife", team: "Mullingar", priority: "Medium", due: atLocal(addWorkingDays(d.now, 4), 17), state: "Open", deps: [], links: {} });
      const dId = "dwg-" + pid.slice(4) + "-101";
      d.drawings[dId] = { id: dId, number: pid + "-A-101", projectId: pid, title: "Proposed house: ground floor plan", sheet: "A-101" };
      const brief: DrawingBrief = { id: "brf-" + pid.slice(4), projectId: pid, drawingId: dId, status: "Draft", house: "", space: "", priorities: "", designNotes: "", references: [], sheets: ["A-101 Ground floor plan"], scopeLimits: "", approverId: "s-aoife", officeContactId: "s-aoife", clarifications: [] };
      d.briefs[brief.id] = brief;
      log(d, d.now, staffActor(d, actorId(d)), "project.created", "Converted " + leadId + " into " + pid + " using " + d.template.version + " (template snapshot)", projSubject(d, pid), [leadId, q.id, client.id]);
      run(d, "rule-stage-in", "convert:" + leadId, { kind: "lead", id: leadId }, "Success", "Created " + pid + ", household record, programme and initial tasks");
      buildProgramme(d, pid, () => nid(d, "pg"));
      return ok(pid + " created. " + Object.values(d.projects).filter((x) => x.status === "Live").length + " live projects.", pid);
    });
  },

  /* Projects */
  toggleCheck(pid: ID, key: string): Result {
    return commit((d) => { const p = d.projects[pid]; if (!p) return fail("Project not found."); const cur = p.checks[key]?.done; p.checks[key] = { done: !cur, at: d.now, by: actorId(d) }; log(d, d.now, staffActor(d, actorId(d)), "checklist.updated", (cur ? "Unticked " : "Ticked ") + key.split(":")[1], projSubject(d, pid)); return ok((cur ? "Unticked: " : "Ticked: ") + key.split(":")[1]); });
  },
  advanceStage(pid: ID, override?: string): Result {
    return commit((d) => {
      const p = d.projects[pid]; if (!p) return fail("Project not found.");
      if (d.persona.kind === "philippines" || d.persona.kind === "client") return fail("This preview cannot move stages.");
      const gates = gateFor(d, pid);
      const missing = gates.filter((g) => !g.done);
      if (missing.length && !override) return fail("Gate not satisfied: " + missing.map((m) => m.label).join(", ") + ". Use an override with a reason if this is intended.");
      if (p.stage === "decision" && p.decision && (p.decision.outcome === "Refused" || p.decision.outcome === "Withdrawn" || p.decision.outcome === "Other") && !override)
        return fail("Recorded outcome is " + p.decision.outcome.toLowerCase() + ". The job does not move to working drawings automatically; record the agreed next step with an override reason.");
      const idx = stageIndex(p.stage);
      let next = STAGES[idx + 1];
      while (next && ((next.key === "fi") || (next.key === "commencement" && !p.scope.commencement) || (next.scoped && !p.scope.planning && next.key !== "commencement"))) next = STAGES[stageIndex(next.key) + 1];
      if (!next) return fail("Already at the final stage.");
      if (override) run(d, "rule-stage-out", "override:" + pid + ":" + d.now, { kind: "project", id: pid }, "Success", "Controlled override by " + d.staff[actorId(d)]?.name + ": " + override);
      moveStage(d, p, next.key, actorId(d), override);
      p.nextTarget = atLocal(addWorkingDays(d.now, next.days), 17); p.nextTargetKind = "Internal target";
      if (next.key === "pack") {
        newTask(d, { title: "Planning pack checklist: " + d.clients[p.clientId].household, kind: "pack", projectId: pid, assigneeId: p.ownerId, ownerId: p.ownerId, team: "Mullingar", priority: "Medium", due: p.nextTarget, state: "Open", deps: [], links: {} });
        buildProgramme(d, pid, () => nid(d, "pg"));
      }
      return ok(pid + " moved to " + next.name + ". Nothing was lodged or submitted.");
    });
  },
  recordDecision(pid: ID, outcome: PlanningOutcome, conditions: string): Result {
    return commit((d) => {
      const p = d.projects[pid]; if (!p) return fail("Project not found.");
      if (!["lodged", "fi", "decision"].includes(p.stage)) return fail("A planning decision can only be recorded once an application is lodged.");
      p.decision = { outcome, at: d.now, conditions: conditions.trim() || undefined, by: actorId(d) };
      if (p.stage !== "decision") moveStage(d, p, "decision", actorId(d));
      log(d, d.now, staffActor(d, actorId(d)), "planning.decision", "Recorded planning outcome: " + outcome + " (manual record of the council's decision)", projSubject(d, pid), [], outcome === "Refused" ? "attention" : "ok");
      return ok("Outcome recorded: " + outcome + (outcome === "Refused" ? ". The job stays here until a next step is agreed." : "."));
    });
  },
  simulateSurveyAndBrief(pid: ID, at?: number): Result {
    return commit((d) => {
      const p = d.projects[pid]; if (!p) return fail("Project not found.");
      if (seen(d, "survey:" + pid)) return ok("Survey and brief inputs already recorded for " + pid + ".");
      if (stageIndex(p.stage) > stageIndex("brief")) return ok("Already past the brief stage.");
      if (at) setNow(d, at);
      const c = d.clients[p.clientId];
      const v = Object.values(d.visits).find((x) => x.projectId === pid);
      const docs: DocumentRec[] = [
        { id: nid(d, "doc"), projectId: pid, clientId: c.id, name: "Survey notes and photos (sample)", type: "Survey", storage: "SharePoint · Projects/" + pid + "/01 Survey (proposed path)", version: "1", visibility: "Internal", published: false, uploadedBy: "s-sean", at: d.now - 3600000 * 20 },
        { id: nid(d, "doc"), projectId: pid, clientId: c.id, name: "Site map (sample)", type: "Site map", storage: "SharePoint · Projects/" + pid + "/01 Survey (proposed path)", version: "1", visibility: "Client", published: true, uploadedBy: c.contactIds[0], at: d.now - 3600000 * 22, asset: ASSETS.siteMap, mime: "image/svg+xml", size: "4 KB" },
      ];
      docs.forEach((x) => (d.documents[x.id] = x));
      if (v) { v.state = "Completed"; v.at = Math.min(v.at, d.now - 3600000 * 20); v.outputs = [docs[0].id]; }
      Object.values(d.tasks).forEach((t) => { if (t.projectId === pid && (t.kind === "survey" || t.kind === "admin") && t.state !== "Done") { t.state = "Done"; t.completedAt = d.now; } });
      const b = Object.values(d.briefs).find((x) => x.projectId === pid)!;
      Object.assign(b, { house: "Four-bedroom one-off home", space: "Approx. 210 m² over one and a half storeys", priorities: "Open kitchen-living to the south terrace; ground-floor bedroom for visiting parents; boot room off the side entrance", designNotes: "Simple gable form, low ridge. Clients like large sliding doors to the terrace.", references: ["Site map (sample)", "Survey notes and photos (sample)", "Client reference images"], sheets: ["A-101 Ground floor plan"], scopeLimits: "Concept layout only. No structural design, no specification, no planning compliance assessment." });
      p.checks["brief:Brief confirmed with client"] = { done: true, at: d.now, by: "s-aoife", note: "Shortcut: brief meeting recorded by the guided demo" };
      run(d, "rule-stage-in", "survey:" + pid, { kind: "project", id: pid }, "Success", "Labelled shortcut: survey visit, site map and brief confirmation recorded");
      log(d, d.now, staffActor(d, "s-sean"), "survey.completed", "Site visit recorded with notes and photos (guided-demo shortcut through elapsed work)", projSubject(d, pid), docs.map((x) => x.id));
      log(d, d.now, { kind: "client", id: c.contactIds[0], name: d.contacts[c.contactIds[0]].name }, "document.uploaded", "Uploaded the site map", projSubject(d, pid), [docs[1].id]);
      for (const k of ["survey", "brief"] as StageKey[]) {
        if (stageIndex(p.stage) < stageIndex(k)) moveStage(d, p, k, "s-aoife");
      }
      p.nextTarget = atLocal(addWorkingDays(d.now, 1), 17); p.nextAction = "Issue the drawing brief";
      return ok("Survey and brief inputs recorded (shortcut). Gate ready: site map present, brief confirmed.");
    });
  },
  updateBrief(briefId: ID, patch: Partial<DrawingBrief>): Result {
    return commit((d) => { const b = d.briefs[briefId]; if (!b) return fail("Brief not found."); if (b.status !== "Draft" && b.status !== "Returned for correction") return fail("Issued briefs are read-only. Add a clarification instead."); Object.assign(b, patch); return ok("Brief saved."); });
  },
  issueBrief(briefId: ID, assigneeId: ID, due?: number, at?: number): Result {
    return commit((d) => {
      const b = d.briefs[briefId]; if (!b) return fail("Brief not found.");
      if (b.status !== "Draft") return ok("Brief already issued to " + (b.assigneeId ? d.staff[b.assigneeId].name : "assignee") + ". No duplicate task.");
      const miss = briefMissing(d, b);
      if (miss.length) { log(d, d.now, agent("Drawing Coordinator"), "brief.blocked", "Blocked issue: missing " + miss.join(", "), projSubject(d, b.projectId), [b.id], "attention"); return fail("Cannot issue: missing " + miss.join(", ") + "."); }
      if (at) setNow(d, at);
      const p = d.projects[b.projectId];
      const assignee = d.staff[assigneeId];
      b.assigneeId = assigneeId; b.status = "Issued"; b.issuedAt = d.now;
      b.due = due || zoned(...ymd(addWorkingDays(d.now, 3, assignee.tz), assignee.tz), 17, 0, assignee.tz);
      const t = newTask(d, { title: "Concept drawing A-101: " + d.clients[p.clientId].household + ", " + p.locality, kind: "drawing", projectId: p.id, assigneeId, ownerId: p.ownerId, team: assignee.team, priority: "High", due: b.due, state: "Open", deps: [], links: { briefId: b.id } });
      b.taskId = t.id;
      if (p.stage === "brief") moveStage(d, p, "concept", actorId(d));
      p.nextTarget = b.due; p.nextAction = "Await first return from " + assignee.name.split(" ")[0];
      buildProgramme(d, p.id, () => nid(d, "pg"));
      run(d, "rule-brief", "brief.issued:" + b.id, { kind: "brief", id: b.id }, "Success", "Assignment " + t.id + " for " + assignee.name + "; team alert sent (simulated)");
      log(d, d.now, staffActor(d, actorId(d)), "brief.issued", "Issued drawing brief to " + assignee.name + " (" + assignee.team + "), due " + fmtDateTime(b.due, assignee.tz, true), projSubject(d, p.id), [b.id, t.id]);
      return ok("Brief issued to " + assignee.name + ". One task created.", t.id);
    });
  },
  acknowledgeBrief(briefId: ID, at?: number): Result {
    return commit((d) => {
      const b = d.briefs[briefId]; if (!b) return fail("Brief not found.");
      if (b.status !== "Issued") return ok("Already acknowledged.");
      if (d.persona.kind === "client") return fail("Clients cannot act on briefs.");
      if (at) setNow(d, at);
      b.status = "Acknowledged"; b.ackAt = d.now;
      if (b.taskId) d.tasks[b.taskId].state = "In progress";
      log(d, d.now, staffActor(d, b.assigneeId!), "brief.acknowledged", "Acknowledged the brief at " + fmtDateTime(d.now, TZ_PH, true), projSubject(d, b.projectId), [b.id]);
      return ok("Acknowledged at " + fmtDateTime(d.now, TZ_PH, true) + " (" + fmtDateTime(d.now, TZ_OFFICE, true) + ").");
    });
  },
  startBrief(briefId: ID): Result {
    return commit((d) => { const b = d.briefs[briefId]; if (!b) return fail("Brief not found."); if (b.status !== "Acknowledged" && b.status !== "Awaiting clarification") return ok("Nothing to start."); b.status = "In progress"; b.startedAt = b.startedAt || d.now; log(d, d.now, staffActor(d, b.assigneeId!), "brief.started", "Started drawing", projSubject(d, b.projectId), [b.id]); return ok("Marked in progress."); });
  },
  askClarification(briefId: ID, text: string): Result {
    return commit((d) => {
      const b = d.briefs[briefId]; if (!b) return fail("Brief not found."); if (!text.trim()) return fail("Type the question.");
      const from = actorId(d);
      b.clarifications.push({ id: nid(d, "clr"), from, text: text.trim(), at: d.now, resolved: d.staff[from]?.team === "Mullingar" });
      if (d.staff[from]?.team === "Philippines") { b.status = "Awaiting clarification"; if (b.taskId) { d.tasks[b.taskId].state = "Paused"; d.tasks[b.taskId].pauseReason = "Awaiting clarification"; } }
      else { b.clarifications.forEach((c) => (c.resolved = true)); if (b.status === "Awaiting clarification") { b.status = "In progress"; if (b.taskId) { d.tasks[b.taskId].state = "In progress"; d.tasks[b.taskId].pauseReason = undefined; } } }
      log(d, d.now, staffActor(d, from), "brief.clarification", (d.staff[from]?.team === "Philippines" ? "Asked: " : "Answered: ") + text.trim(), projSubject(d, b.projectId), [b.id], d.staff[from]?.team === "Philippines" ? "attention" : "ok");
      return ok(d.staff[from]?.team === "Philippines" ? "Question sent to the office. Return forecast on hold." : "Answer posted; clarification resolved.");
    });
  },
  submitVersion(drawingId: ID, opts: { rev?: string; summary: string; addresses?: ID[]; asset?: string; at?: number; authorId?: ID }): Result {
    return commit((d) => {
      const dw = d.drawings[drawingId]; if (!dw) return fail("Drawing not found.");
      const vers = Object.values(d.versions).filter((v) => v.drawingId === drawingId);
      const pending = vers.find((v) => v.state === "In office review");
      if (pending) return ok("Rev " + pending.rev + " is already waiting for office review. No duplicate version.", pending.id);
      const rev = opts.rev || String.fromCharCode(65 + vers.filter((v) => /^[A-Z]$/.test(v.rev)).length);
      if (vers.some((v) => v.rev === rev)) return ok("Rev " + rev + " already exists; versions are immutable.", vers.find((v) => v.rev === rev)!.id);
      if (opts.at) setNow(d, opts.at);
      const isDunne = dw.projectId === "JMA-26025";
      const asset = opts.asset || (isDunne ? (rev === "A" ? ASSETS.dunneA : ASSETS.dunneB) : rev === "A" ? ASSETS.sampleA : ASSETS.sampleB);
      const author = opts.authorId || (d.persona.staffId && d.persona.kind !== "admin" ? d.persona.staffId : (Object.values(d.briefs).find((b) => b.drawingId === drawingId)?.assigneeId || "s-eoin"));
      const v: DrawingVersion = { id: nid(d, "ver"), drawingId, rev, asset, authorId: author, uploadedAt: d.now, state: "In office review", changeSummary: opts.summary.trim() || "No summary given.", addresses: opts.addresses || [], qa: {} };
      d.versions[v.id] = v;
      const b = Object.values(d.briefs).find((x) => x.drawingId === drawingId);
      if (b && b.status !== "Released") { b.status = "Submitted"; b.submittedAt = d.now; if (b.taskId && d.tasks[b.taskId].state !== "Done") { d.tasks[b.taskId].state = "Done"; d.tasks[b.taskId].completedAt = d.now; } }
      (opts.addresses || []).forEach((aid) => { const a = d.amendments[aid]; if (a) { a.state = "Addressed"; a.resolvedByVersionId = v.id; if (a.taskId && d.tasks[a.taskId].state !== "Done") { d.tasks[a.taskId].state = "Done"; d.tasks[a.taskId].completedAt = d.now; } } });
      const p = d.projects[dw.projectId];
      newTask(d, { title: "Office QA: " + dw.number + " Rev " + rev, kind: "qa", projectId: p.id, assigneeId: p.ownerId, ownerId: p.ownerId, team: "Mullingar", priority: "High", due: atLocal(addWorkingDays(d.now, 1), 17), state: "Open", deps: [], links: { versionId: v.id } });
      run(d, "rule-return", "returned:" + v.id, { kind: "version", id: v.id }, "Success", "Queued for office review. Client not notified; version stays internal.");
      log(d, d.now, staffActor(d, author), "drawing.uploaded", "Submitted " + dw.number + " Rev " + rev + " for office review (not client-visible)", projSubject(d, p.id), [v.id]);
      buildProgramme(d, p.id, () => nid(d, "pg"));
      return ok("Rev " + rev + " uploaded to office review. Not visible to the client.", v.id);
    });
  },
  setQa(versionId: ID, key: string, value: boolean): Result {
    return commit((d) => { const v = d.versions[versionId]; if (!v) return fail("Version not found."); if (v.state !== "In office review") return fail("Only versions in office review can be checked."); v.qa[key] = value; return ok(value ? "Checked." : "Unchecked."); });
  },
  returnForCorrection(versionId: ID, note: string): Result {
    return commit((d) => {
      const v = d.versions[versionId]; if (!v) return fail("Version not found."); if (v.state !== "In office review") return fail("Not in office review.");
      if (!note.trim()) return fail("Say what needs correcting.");
      v.state = "Returned for correction"; v.reviewedAt = d.now; v.reviewerId = actorId(d);
      const dw = d.drawings[v.drawingId]; const b = Object.values(d.briefs).find((x) => x.drawingId === dw.id);
      if (b) { b.status = "Returned for correction"; b.clarifications.push({ id: nid(d, "clr"), from: actorId(d), text: "Returned Rev " + v.rev + ": " + note.trim(), at: d.now, resolved: false }); if (b.assigneeId) newTask(d, { title: "Correct " + dw.number + " Rev " + v.rev, kind: "drawing", projectId: dw.projectId, assigneeId: b.assigneeId, ownerId: d.projects[dw.projectId].ownerId, team: d.staff[b.assigneeId].team, priority: "High", due: addWorkingDays(d.now, 1), state: "Open", deps: [], links: { briefId: b.id } }); }
      Object.values(d.tasks).forEach((t) => { if (t.links.versionId === versionId && t.kind === "qa" && t.state !== "Done") { t.state = "Done"; t.completedAt = d.now; } });
      log(d, d.now, staffActor(d, actorId(d)), "drawing.returned", "Returned " + dw.number + " Rev " + v.rev + " for correction: " + note.trim(), projSubject(d, dw.projectId), [v.id], "attention");
      return ok("Returned for correction. Nothing was shown to the client.");
    });
  },
  releaseVersion(versionId: ID, at?: number, failNotification = false): Result {
    return commit((d) => {
      const v = d.versions[versionId]; if (!v) return fail("Version not found.");
      if (v.state === "Released") return ok("Rev " + v.rev + " is already released. No duplicate notification.");
      if (v.state !== "In office review") return fail("Only a version in office review can be released.");
      const need = ["brief", "rooms", "titleblock", "scope"];
      const missing = need.filter((k) => !v.qa[k]);
      if (missing.length) return fail("Office QA checklist incomplete (" + missing.length + " left). Release needs an explicit office check.");
      if (d.persona.kind === "philippines" || d.persona.kind === "client") return fail("Only office staff can release drawings.");
      if (at) setNow(d, at);
      const dw = d.drawings[v.drawingId]; const p = d.projects[dw.projectId];
      Object.values(d.versions).forEach((o) => { if (o.drawingId === v.drawingId && o.state === "Released") { o.state = "Superseded"; o.supersededAt = d.now; } });
      v.state = "Released"; v.reviewedAt = v.reviewedAt || d.now; v.reviewerId = actorId(d); v.releasedAt = d.now;
      v.addresses.forEach((aid) => { if (d.amendments[aid]) d.amendments[aid].state = "Released"; });
      const b = Object.values(d.briefs).find((x) => x.drawingId === dw.id);
      if (b && b.status !== "Released") { b.status = "Released"; b.releasedAt = d.now; }
      Object.values(d.tasks).forEach((t) => { if (t.links.versionId === versionId && t.kind === "qa" && t.state !== "Done") { t.state = "Done"; t.completedAt = d.now; } });
      if (p.stage === "concept") moveStage(d, p, "review", actorId(d));
      p.nextAction = "Client review of Rev " + v.rev; p.nextTarget = atLocal(addWorkingDays(d.now, 5), 17);
      // review request (decision) for the client
      Object.values(d.requests).forEach((r) => { if (r.projectId === p.id && r.kind === "Decision" && r.state === "Outstanding") { r.state = "Cancelled"; r.nextReminderAt = undefined; } });
      const c = d.clients[p.clientId];
      const rq: ClientRequest = { id: nid(d, "req"), projectId: p.id, contactId: c.contactIds[0], kind: "Decision", label: "Review " + dw.number + " Rev " + v.rev + " (approve or comment)", requestedAt: d.now, ownerId: p.ownerId, nextReminderAt: addWorkingDays(d.now, d.settings.reminderDays), state: "Outstanding", blocking: false, remindersSent: 0, maxReminders: d.settings.maxReminders };
      d.requests[rq.id] = rq;
      const key = "release:" + v.id;
      if (!seen(d, key)) {
        const vars = { ...clientVars(d, p.id), drawing: dw.number, rev: v.rev };
        const f = fill(d.templates["tpl-ready"], vars);
        const m = newMessage(d, { projectId: p.id, contactId: c.contactIds[0], audience: "Client", channel: "Email", direction: "out", fromId: p.ownerId, subject: f.subject, body: f.body, delivery: "Queued", automated: true, templateId: "tpl-ready", eventKey: key, at: d.now + 30000 });
        simulateSend(m, failNotification);
        run(d, "rule-release", key, { kind: "version", id: v.id }, failNotification ? "Failed" : "Success", failNotification ? "Notification failed (simulated). Retry from Messages." : "Published Rev " + v.rev + " to the portal; client notified by email (simulated)");
        if (failNotification) log(d, d.now + 39000, mail, "notification.failed", "“Your drawings are ready” email failed (simulated). Retry available.", projSubject(d, p.id), [m.id], "failed");
      }
      buildProgramme(d, p.id, () => nid(d, "pg"));
      log(d, d.now, staffActor(d, actorId(d)), "drawing.released", "Office QA signed off and released " + dw.number + " Rev " + v.rev + " to the client portal (workflow sign-off, not a compliance check)", projSubject(d, p.id), [v.id]);
      setNow(d, d.now + 40000);
      return ok("Rev " + v.rev + " released. The client can now see it.", v.id);
    });
  },
  addAmendment(versionId: ID, pin: { x: number; y: number }, text: string, at?: number): Result {
    return commit((d) => {
      const v = d.versions[versionId]; if (!v) return fail("Version not found.");
      if (v.state !== "Released") return fail("Comments can only be added to the current released revision.");
      if (!text.trim()) return fail("Write the change you would like.");
      const dw = d.drawings[v.drawingId]; const p = d.projects[dw.projectId];
      const key = "amend:" + versionId + ":" + text.trim().toLowerCase().slice(0, 60);
      if (seen(d, key)) { run(d, "rule-change", key, { kind: "version", id: versionId }, "Skipped: duplicate", "Same request on the same revision ignored; no second task"); return ok("That request is already recorded. No duplicate task."); }
      if (at) setNow(d, at);
      const requester = d.persona.kind === "client" && d.persona.contactId ? d.persona.contactId : d.clients[p.clientId].contactIds[0];
      const a: Amendment = { id: nid(d, "amd"), projectId: p.id, versionId, sheet: dw.sheet, page: 1, pin: { x: Math.round(pin.x * 1000) / 1000, y: Math.round(pin.y * 1000) / 1000 }, text: text.trim(), requesterId: requester, createdAt: d.now, state: "Open" };
      d.amendments[a.id] = a;
      const due = atLocal(addWorkingDays(d.now, d.settings.amendmentSlaWD), 17);
      const t = newTask(d, { title: "Amendment: " + text.trim().slice(0, 70) + (text.trim().length > 70 ? "…" : ""), kind: "amendment", projectId: p.id, assigneeId: "s-eoin", ownerId: p.ownerId, team: "Mullingar", priority: "High", due, state: "Open", deps: [], links: { amendmentId: a.id, versionId } });
      a.taskId = t.id;
      Object.values(d.requests).forEach((r) => { if (r.projectId === p.id && r.kind === "Decision" && r.state === "Outstanding") { r.state = "Received"; r.resolvedAt = d.now; r.nextReminderAt = undefined; } });
      run(d, "rule-change", key, { kind: "amendment", id: a.id }, "Success", "One amendment task for Eoin Walsh, due " + fmtDateTime(due) + " (" + d.settings.amendmentSlaWD + " working-day provisional SLA)");
      const f = fill(d.templates["tpl-change"], { ...clientVars(d, p.id), rev: v.rev });
      const m = newMessage(d, { projectId: p.id, contactId: requester, audience: "Client", channel: "Portal", direction: "out", fromId: p.ownerId, subject: f.subject, body: f.body, delivery: "Queued", automated: true, templateId: "tpl-change" });
      simulateSend(m);
      log(d, d.now, staffActor(d, requester), "amendment.requested", "Pinned a change request on " + dw.number + " Rev " + v.rev + ": “" + text.trim() + "”", projSubject(d, p.id), [a.id, t.id]);
      log(d, d.now, agent("Client Care"), "office.alerted", "Alerted the office: new change request needs professional review (feasibility not assessed by AI)", projSubject(d, p.id), [a.id], "info");
      p.nextAction = "Eoin to review and draw the change"; p.nextTarget = due;
      return ok("Change request saved on Rev " + v.rev + ". One task created for Eoin.", a.id);
    });
  },
  approveVersion(versionId: ID, at?: number): Result {
    return commit((d) => {
      const v = d.versions[versionId]; if (!v) return fail("Version not found.");
      const dw = d.drawings[v.drawingId]; const p = d.projects[dw.projectId];
      if (v.state !== "Released") return fail("Only the current released revision can be approved. Rev " + v.rev + " is " + v.state.toLowerCase() + ".");
      const latest = Object.values(d.versions).filter((o) => o.drawingId === v.drawingId && o.state === "Released")[0];
      if (!latest || latest.id !== v.id) return fail("A newer revision exists. Approve that one instead.");
      if (Object.values(d.approvals).some((a) => a.versionId === versionId)) return ok("Rev " + v.rev + " is already approved. No duplicate decision.");
      const open = Object.values(d.amendments).filter((a) => a.projectId === p.id && a.state !== "Released");
      if (open.length) return fail("There are unresolved change requests on this drawing. They must be addressed in a released revision first.");
      if (at) setNow(d, at);
      const actor = d.persona.kind === "client" && d.persona.contactId ? d.persona.contactId : d.clients[p.clientId].contactIds[0];
      const ap: Approval = { id: nid(d, "apr"), versionId, projectId: p.id, actorId: actor, at: d.now, decision: "Approved", purpose: "Approve concept layout as the basis for the planning pack", ackText: "I approve " + dw.number + " Rev " + v.rev + " as the basis for the next stage. I understand this approval applies to this revision only." };
      d.approvals[ap.id] = ap;
      Object.values(d.requests).forEach((r) => { if (r.projectId === p.id && r.kind === "Decision" && r.state === "Outstanding") { r.state = "Received"; r.resolvedAt = d.now; r.nextReminderAt = undefined; } });
      Object.values(d.tasks).forEach((t) => { if (t.projectId === p.id && t.kind === "followup" && t.state !== "Done") { t.state = "Done"; t.completedAt = d.now; } });
      run(d, "rule-approve", "approve:" + versionId, { kind: "approval", id: ap.id }, "Success", "Decision stored against " + dw.number + " Rev " + v.rev + "; office alerted. Nothing submitted.");
      const f = fill(d.templates["tpl-approved"], { ...clientVars(d, p.id), drawing: dw.number, rev: v.rev });
      const m = newMessage(d, { projectId: p.id, contactId: actor, audience: "Client", channel: "Email", direction: "out", fromId: p.ownerId, subject: f.subject, body: f.body, delivery: "Queued", automated: true, templateId: "tpl-approved" });
      simulateSend(m);
      log(d, d.now, staffActor(d, actor), "approval.recorded", "Approved " + dw.number + " Rev " + v.rev + " (exact version " + v.id + ")", projSubject(d, p.id), [ap.id, v.id]);
      p.nextAction = "Staff to advance to the planning pack"; p.nextTarget = atLocal(addWorkingDays(d.now, 1), 17);
      return ok("Approval recorded against " + dw.number + " Rev " + v.rev + ".", ap.id);
    });
  },

  /* Tasks */
  completeTask(taskId: ID): Result {
    return commit((d) => {
      const t = d.tasks[taskId]; if (!t) return fail("Task not found.");
      if (t.state === "Done") return ok("Already done.");
      if (t.kind === "drawing" && t.links.briefId) return fail("Drawing assignments complete when a version is submitted.");
      if (t.kind === "qa") return fail("QA tasks complete when the version is released or returned.");
      if (t.kind === "amendment") return fail("Amendment tasks complete when a revision addressing them is uploaded.");
      if (t.links.requestId && d.requests[t.links.requestId]?.blocking && d.requests[t.links.requestId].state === "Outstanding") return fail("This chase closes when the client's document arrives (or the request is cancelled).");
      const blocking = t.deps.map((x) => d.tasks[x]).filter((x) => x && x.state !== "Done");
      if (blocking.length) return fail("Waiting on: " + blocking.map((x) => x.title).join("; "));
      t.state = "Done"; t.completedAt = d.now;
      if (t.links.councilId) {
        const cr = d.council[t.links.councilId];
        const rest = Object.values(d.tasks).filter((x) => x.links.councilId === cr.id && x.state !== "Done");
        if (!rest.length) { cr.state = "Response sent"; log(d, d.now, staffActor(d, actorId(d)), "council.response", "Response to the further-information request recorded as sent. Council acceptance is not implied.", projSubject(d, cr.projectId), [cr.id]); }
      }
      if (t.leadId) { const l = d.leads[t.leadId]; if (l) { l.lastContactAt = d.now; if (!l.firstHumanResponseAt) l.firstHumanResponseAt = d.now; } }
      log(d, d.now, staffActor(d, actorId(d)), "task.completed", "Completed: " + t.title + (t.due < d.now ? " (was overdue since " + fmtDateTime(t.due) + ")" : ""), t.projectId ? projSubject(d, t.projectId) : { kind: "task", id: t.id, label: t.title }, [t.id]);
      if (t.projectId) buildProgramme(d, t.projectId, () => nid(d, "pg"));
      return ok("Done: " + t.title);
    });
  },
  reassignTask(taskId: ID, to: ID, reason: string): Result {
    return commit((d) => {
      const t = d.tasks[taskId]; if (!t) return fail("Task not found."); if (!reason.trim()) return fail("Give a reason for the change.");
      if (t.assigneeId === to) return ok("Already with " + d.staff[to].name + ".");
      const from = t.assigneeId;
      t.reassigned = (t.reassigned || []).concat([{ from, to, reason: reason.trim(), at: d.now }]);
      t.assigneeId = to; t.team = d.staff[to].team;
      if (t.links.briefId) { const b = d.briefs[t.links.briefId]; b.assigneeId = to; if (b.status !== "Submitted") { b.status = "Issued"; b.ackAt = undefined; } t.state = "Open"; }
      log(d, d.now, staffActor(d, actorId(d)), "task.reassigned", "Reassigned “" + t.title + "” from " + d.staff[from].name + " to " + d.staff[to].name + ": " + reason.trim(), t.projectId ? projSubject(d, t.projectId) : { kind: "task", id: t.id, label: t.title }, [t.id], "ok", { before: d.staff[from].name, after: d.staff[to].name });
      if (t.projectId) buildProgramme(d, t.projectId, () => nid(d, "pg"));
      return ok("Now with " + d.staff[to].name + ". Original due date kept in history.");
    });
  },
  changeDue(taskId: ID, due: number, reason: string): Result {
    return commit((d) => {
      const t = d.tasks[taskId]; if (!t) return fail("Task not found."); if (!reason.trim()) return fail("Give a reason for the new date.");
      t.dueHistory.push({ from: t.due, to: due, reason: reason.trim(), at: d.now, by: actorId(d) });
      const before = t.due; t.due = due;
      if (t.links.briefId) d.briefs[t.links.briefId].due = due;
      log(d, d.now, staffActor(d, actorId(d)), "task.rescheduled", "Moved “" + t.title + "” target from " + fmtDateTime(before) + " to " + fmtDateTime(due) + ": " + reason.trim(), t.projectId ? projSubject(d, t.projectId) : { kind: "task", id: t.id, label: t.title }, [t.id], "ok", { before: fmtDateTime(before), after: fmtDateTime(due) });
      return ok("Target changed. Original " + fmtDateTime(t.originalDue) + " kept.");
    });
  },
  pauseTask(taskId: ID, reason: string): Result {
    return commit((d) => { const t = d.tasks[taskId]; if (!t) return fail("Task not found."); if (!reason) return fail("Pick a pause reason."); t.state = "Paused"; t.pauseReason = reason; log(d, d.now, staffActor(d, actorId(d)), "task.paused", "Paused “" + t.title + "”: " + reason, t.projectId ? projSubject(d, t.projectId) : { kind: "task", id: t.id, label: t.title }, [t.id]); return ok("Paused: " + reason); });
  },
  resumeTask(taskId: ID): Result {
    return commit((d) => { const t = d.tasks[taskId]; if (!t) return fail("Task not found."); t.state = "In progress"; t.pauseReason = undefined; log(d, d.now, staffActor(d, actorId(d)), "task.resumed", "Resumed “" + t.title + "”", t.projectId ? projSubject(d, t.projectId) : { kind: "task", id: t.id, label: t.title }, [t.id]); return ok("Resumed."); });
  },
  slipProgramme(itemId: ID, wd: number, reason: string): Result {
    return commit((d) => {
      const it = d.programme[itemId]; if (!it) return fail("Programme item not found."); if (it.fixed) return fail("Fixed dates cannot be moved here. Record a new external date instead.");
      if (!reason.trim()) return fail("Give a reason for the slip.");
      if (it.taskId) {
        const t = d.tasks[it.taskId]; const to = addWorkingDays(slipBase(d, t), wd, d.staff[t.assigneeId]?.tz || TZ_OFFICE);
        t.dueHistory.push({ from: t.due, to, reason: reason.trim(), at: d.now, by: actorId(d) }); t.due = to;
        if (t.links.briefId) d.briefs[t.links.briefId].due = to;
      } else it.slipWD += wd;
      const view = programmeView(d, it.projectId);
      const conflicts = view.filter((v) => v.conflict);
      log(d, d.now, staffActor(d, actorId(d)), "programme.slipped", "Slipped “" + it.label + "” by " + wd + " working days: " + reason.trim() + (conflicts.length ? ". Conflict with " + conflicts.map((c) => c.label).join(", ") : ""), projSubject(d, it.projectId), [it.id], conflicts.length ? "attention" : "ok");
      return ok("Forecasts updated." + (conflicts.length ? " Conflict flagged: " + conflicts.map((c) => c.label).join(", ") : ""));
    });
  },

  /* Clients and messages */
  uploadClientDocument(requestId: ID, fileName?: string): Result {
    return commit((d) => {
      const r = d.requests[requestId]; if (!r) return fail("Request not found.");
      if (r.state !== "Outstanding") return ok("Already received.");
      if (r.kind !== "Document") return fail("This request is a decision, not a document.");
      const p = d.projects[r.projectId];
      const doc: DocumentRec = { id: nid(d, "doc"), projectId: p.id, clientId: p.clientId, name: fileName || r.label + " (sample upload)", type: r.docType || r.label, storage: "Portal upload → SharePoint · Projects/" + p.id + "/01 Survey (proposed publication path)", version: "1", visibility: "Client", published: true, uploadedBy: r.contactId, at: d.now, asset: r.docType === "Site map" ? ASSETS.siteMap : undefined, mime: r.docType === "Site map" ? "image/svg+xml" : undefined, size: r.docType === "Site map" ? "4 KB" : undefined };
      d.documents[doc.id] = doc;
      r.state = "Received"; r.docId = doc.id; r.resolvedAt = d.now; r.nextReminderAt = undefined;
      if (r.taskId && d.tasks[r.taskId] && d.tasks[r.taskId].state !== "Done") { d.tasks[r.taskId].state = "Done"; d.tasks[r.taskId].completedAt = d.now; }
      run(d, "rule-remind", "remind-stop:" + r.id, { kind: "request", id: r.id }, "Stopped", "Reminders stopped: " + r.label + " received");
      run(d, "rule-inbound", "upload:" + doc.id, { kind: "document", id: doc.id }, "Success", "Staff notified: " + r.label + " uploaded");
      log(d, d.now, { kind: "client", id: r.contactId, name: d.contacts[r.contactId].name }, "document.uploaded", "Uploaded " + r.label + " in the portal (simulated upload)", projSubject(d, p.id), [doc.id, r.id]);
      const remaining = gateFor(d, p.id).filter((g) => !g.done).map((g) => g.label);
      if (p.stage === "brief") { p.nextAction = remaining.length ? "Still needed: " + remaining.join(", ") : "Issue the drawing brief"; }
      return ok(r.label + " received. Reminders stopped." + (remaining.length ? " Still outstanding: " + remaining.join(", ") + "." : " Brief gate now ready."));
    });
  },
  sendReminder(requestId: ID): Result {
    return commit((d) => {
      const r = d.requests[requestId]; if (!r) return fail("Request not found."); if (r.state !== "Outstanding") return fail("Request is " + r.state.toLowerCase() + "; no reminder sent.");
      if (r.remindersSent >= r.maxReminders) return fail("Message limit reached (" + r.maxReminders + "). Call the client instead.");
      const key = "remind:" + r.id + ":" + (r.remindersSent + 1);
      if (seen(d, key)) return ok("Reminder already sent.");
      r.remindersSent++; r.nextReminderAt = r.remindersSent < r.maxReminders ? addWorkingDays(d.now, d.settings.reminderDays) : undefined;
      const f = fill(d.templates["tpl-remind"], { ...clientVars(d, r.projectId), item: r.label.toLowerCase() });
      const m = newMessage(d, { projectId: r.projectId, contactId: r.contactId, audience: "Client", channel: "Email", direction: "out", fromId: r.ownerId, subject: f.subject, body: f.body, delivery: "Queued", automated: true, templateId: "tpl-remind", eventKey: key });
      simulateSend(m);
      run(d, "rule-remind", key, { kind: "request", id: r.id }, "Success", "Reminder " + r.remindersSent + " of " + r.maxReminders);
      log(d, d.now, system, "reminder.sent", "Reminder " + r.remindersSent + " of " + r.maxReminders + " sent for " + r.label, projSubject(d, r.projectId), [r.id, m.id]);
      return ok("Reminder sent (simulated).");
    });
  },
  setRequestPaused(requestId: ID, paused: boolean): Result {
    return commit((d) => { const r = d.requests[requestId]; if (!r) return fail("Request not found."); r.state = paused ? "Paused" : "Outstanding"; r.nextReminderAt = paused ? undefined : addWorkingDays(d.now, d.settings.reminderDays); log(d, d.now, staffActor(d, actorId(d)), "reminder.paused", (paused ? "Paused" : "Resumed") + " reminders for " + r.label, projSubject(d, r.projectId), [r.id]); return ok(paused ? "Reminders paused." : "Reminders resumed."); });
  },
  sendMessage(input: { projectId?: ID; leadId?: ID; body: string; channel: Channel; audience: "Client" | "Internal" | "Supplier"; subject?: string }): Result {
    return commit((d) => {
      if (!input.body.trim()) return fail("Write a message first.");
      const from = actorId(d);
      const isClient = d.persona.kind === "client";
      const p = input.projectId ? d.projects[input.projectId] : undefined;
      const contactId = isClient ? from : p ? d.clients[p.clientId].contactIds[0] : undefined;
      const m = newMessage(d, { projectId: input.projectId, leadId: input.leadId, contactId, audience: input.audience, channel: input.audience === "Internal" ? "Internal note" : input.channel, direction: isClient ? "in" : "out", fromId: from, subject: input.subject, body: input.body.trim(), delivery: "Queued", automated: false });
      if (input.audience === "Internal") { m.delivery = "Delivered"; m.deliveryLog = [{ state: "Delivered", at: d.now, note: "Internal note; not sent" }]; }
      else if (isClient) { m.delivery = "Delivered"; m.deliveryLog = [{ state: "Delivered", at: d.now, note: "Portal message (local preview)" }]; }
      else simulateSend(m);
      if (isClient && p) {
        run(d, "rule-inbound", "inbound:" + m.id, { kind: "message", id: m.id }, "Success", "Office alerted: new portal message");
        log(d, d.now, staffActor(d, from), "message.received", "Portal message from " + d.contacts[from].name + ": “" + input.body.trim().slice(0, 80) + "”", projSubject(d, p.id), [m.id], "attention");
      } else log(d, d.now, staffActor(d, from), input.audience === "Internal" ? "note.added" : "message.sent", (input.audience === "Internal" ? "Internal note: " : "Message (" + input.channel + ", simulated): ") + input.body.trim().slice(0, 80), p ? projSubject(d, p.id) : { kind: "lead", id: input.leadId || "", label: input.leadId || "" }, [m.id]);
      return ok(input.audience === "Internal" ? "Internal note saved. Clients never see it." : isClient ? "Message sent to the office." : "Message queued and delivered (simulated).");
    });
  },
  retryMessage(msgId: ID): Result {
    return commit((d) => {
      const m = d.messages[msgId]; if (!m) return fail("Message not found."); if (m.delivery !== "Failed") return ok("Nothing to retry.");
      m.deliveryLog.push({ state: "Retrying", at: d.now }, { state: "Sent", at: d.now + 3000 }, { state: "Delivered", at: d.now + 7000, note: "Retry succeeded (simulated)" });
      m.delivery = "Delivered";
      const r = Object.values(d.runs).find((x) => x.eventKey === m.eventKey && x.result === "Failed");
      const runId = nid(d, "run");
      d.runs[runId] = { id: runId, ruleId: r?.ruleId || "rule-release", eventKey: (m.eventKey || m.id) + ":retry", at: d.now, subject: { kind: "message", id: m.id }, result: "Retried", detail: "Manual retry by " + (d.staff[actorId(d)]?.name || "staff") + "; delivered (simulated)" };
      log(d, d.now, staffActor(d, actorId(d)), "notification.retried", "Retried failed email “" + (m.subject || "") + "”; delivered (simulated)", m.projectId ? projSubject(d, m.projectId) : { kind: "message", id: m.id, label: "Message" }, [m.id], "retry");
      return ok("Retried. Delivered (simulated provider receipt).");
    });
  },

  /* Knowledge and settings */
  saveArticle(a: Article): Result {
    return commit((d) => {
      if (!a.title.trim() || !a.body.trim()) return fail("Title and body are required.");
      if (a.kind === "procedure" && a.audience === "Client") return fail("Internal procedures cannot be published to clients.");
      if (a.video && a.video.url && !a.video.transcript.trim()) return fail("A video needs a transcript.");
      const was = d.articles[a.id];
      d.articles[a.id] = { ...a, updatedAt: d.now, updatedBy: actorId(d) };
      log(d, d.now, staffActor(d, actorId(d)), "knowledge.saved", (was ? "Edited" : "Created") + " “" + a.title + "” (" + (a.published ? "published" : "draft") + ", " + a.audience.toLowerCase() + ")", { kind: "article", id: a.id, label: a.title });
      return ok(a.published && a.audience === "Client" ? "Published. Client portals show it now." : "Saved as " + (a.published ? "published" : "draft") + ".");
    });
  },
  toggleRule(ruleId: ID): Result {
    return commit((d) => { const r = d.rules[ruleId]; r.enabled = !r.enabled; log(d, d.now, staffActor(d, actorId(d)), "rule.toggled", (r.enabled ? "Resumed" : "Paused") + " automation “" + r.name + "”", { kind: "rule", id: r.id, label: r.name }); return ok(r.name + (r.enabled ? " resumed." : " paused.")); });
  },
  saveTemplate(t: Template): Result {
    return commit((d) => { if (!t.subject.trim() || !t.body.trim()) return fail("Subject and body are required."); d.templates[t.id] = t; log(d, d.now, staffActor(d, actorId(d)), "template.saved", "Edited message template “" + t.name + "”", { kind: "template", id: t.id, label: t.name }); return ok("Template saved."); });
  },
  saveSettings(patch: Partial<DemoState["settings"]>): Result {
    return commit((d) => { Object.assign(d.settings, patch); log(d, d.now, staffActor(d, actorId(d)), "settings.saved", "Updated workflow rules: " + Object.keys(patch).join(", "), { kind: "settings", id: "workflow", label: "Workflow rules" }); return ok("Workflow rules saved. Existing tasks keep their dates."); });
  },
  publishTemplate(tpl: StageTemplate): Result {
    return commit((d) => {
      const [maj, min] = d.template.version.replace(/[^\d.]/g, "").split(".").map(Number);
      const next = { ...tpl, version: "Residential v" + maj + "." + (min + 1), publishedAt: d.now };
      d.templateHistory.push(next); d.template = next;
      log(d, d.now, staffActor(d, actorId(d)), "template.published", "Published stage template " + next.version + ". Existing jobs keep their snapshot.", { kind: "template", id: next.version, label: next.version });
      return ok(next.version + " published. Existing projects keep their template snapshot; new jobs use it.");
    });
  },
};

const ymd = (ts: number, tz: string): [number, number, number] => { const p = localParts(ts, tz); return [p.y, p.m, p.d]; };

export function personaLabel(d: DemoState, p: Persona = d.persona): string {
  if (p.kind === "client") { const c = p.clientId ? d.clients[p.clientId] : undefined; return "Client portal: " + (c ? c.household + " household" : "client"); }
  const s = p.staffId ? d.staff[p.staffId] : undefined;
  const role: Record<PersonaKind, string> = { admin: "Administrator", mullingar: "Mullingar staff", philippines: "Philippines contributor", sales: "Sales role", client: "Client" };
  return role[p.kind] + (s ? ": " + s.name : "");
}

export const PERSONAS: { label: string; persona: Persona; note: string }[] = [
  { label: "Ciaran Madden · Administrator", persona: { kind: "admin", staffId: "s-ciaran" }, note: "All demo records, configuration and overrides" },
  { label: "Aoife Brennan · Mullingar staff", persona: { kind: "mullingar", staffId: "s-aoife" }, note: "Delivery, briefs, QA and client updates" },
  { label: "Eoin Walsh · Mullingar staff", persona: { kind: "mullingar", staffId: "s-eoin" }, note: "Amendments and revisions" },
  { label: "Niamh Doyle · Sales role", persona: { kind: "sales", staffId: "s-niamh" }, note: "Leads, quotes and permitted contact history" },
  { label: "Carlo Reyes · Philippines", persona: { kind: "philippines", staffId: "s-carlo" }, note: "Own assignments, briefs and permitted files only" },
];

/* ── extension points for module files ──
   Pages that need a domain action not listed above add it in their own file
   with transact(), so this store stays the one place state changes. */
export const transact = commit;
export const logEvent = log;
export const newTaskIn = newTask;
export const newMessageIn = newMessage;
export const simulateDelivery = simulateSend;
export const nextId = nid;
export const currentActorId = actorId;
export type ActionResult = Result;
