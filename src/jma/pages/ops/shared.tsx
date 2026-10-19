/* Shared pieces for the operations modules (Dashboard, Work, Agents, Activity,
   Settings, Staff). Everything reads the one store; nothing here keeps a copy. */
import type { ReactNode, MouseEvent } from "react";
import type { ActivityEvent, AutomationRun, DemoState, ID, Message, Task } from "../../types";
import * as S from "../../selectors";
import { Badge, DateTag, Icon, type Tone } from "../../kit";
import { go, openDetail, type ModuleId } from "../../ui";
import { TZ_OFFICE, TZ_PH, atLocal, calendarDaysBetween, dueLabel, fmtDate, localParts } from "../../time";
import "../../../styles/jma-ops.css";

/** Store text can carry dashes from seed data; visible copy never shows them. */
export const nd = (s: string | undefined | null) => (s || "").replace(/\s*[–—]\s*/g, " to ");

export const stop = (e: MouseEvent) => e.stopPropagation();

/** A row clickable by mouse; keyboard users use the row's primary button. */
export const clickRow = (onOpen: () => void) => ({ className: "j-row", onClick: onOpen });

/** Inline button that never triggers the row behind it. */
export function LinkBtn({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" className="j-link jo-linkbtn" aria-label={label} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {children}
    </button>
  );
}

/** The row's primary (keyboard) control, styled as ordinary text. */
export function RowMain({ children, onClick, label }: { children: ReactNode; onClick: () => void; label?: string }) {
  return (
    <button type="button" className="jo-rowmain" aria-label={label} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      {children}
    </button>
  );
}

export const goTo = (m: string, tab?: string, detail?: Parameters<typeof go>[2]) => go(m as ModuleId, tab, detail);

/* ── subjects and references ── */
export function projectOfSubject(d: DemoState, s: { kind: string; id: ID }): ID | undefined {
  switch (s.kind) {
    case "project": return d.projects[s.id] ? s.id : undefined;
    case "version": { const v = d.versions[s.id]; return v ? d.drawings[v.drawingId]?.projectId : undefined; }
    case "brief": return d.briefs[s.id]?.projectId;
    case "request": return d.requests[s.id]?.projectId;
    case "amendment": return d.amendments[s.id]?.projectId;
    case "approval": return d.approvals[s.id]?.projectId;
    case "message": return d.messages[s.id]?.projectId;
    case "document": return d.documents[s.id]?.projectId;
    case "task": return d.tasks[s.id]?.projectId;
    default: return undefined;
  }
}

export type Ref = { label: string; open: () => void };

/** Resolve any record id to a label and the drawer that shows it. */
export function refFor(d: DemoState, id: ID): Ref | null {
  if (d.projects[id]) return { label: id + " " + S.household(d, id), open: () => openDetail({ kind: "project", id }) };
  if (d.tasks[id]) return { label: "Task: " + nd(d.tasks[id].title), open: () => openDetail({ kind: "task", id }) };
  if (d.leads[id]) return { label: id + " " + d.leads[id].name, open: () => openDetail({ kind: "lead", id }) };
  if (d.clients[id]) return { label: d.clients[id].household + " household", open: () => openDetail({ kind: "client", id }) };
  if (d.staff[id]) return { label: d.staff[id].name, open: () => openDetail({ kind: "staff", id }) };
  if (d.versions[id]) { const v = d.versions[id]; const dw = d.drawings[v.drawingId]; return { label: (dw?.number || "Drawing") + " Rev " + v.rev, open: () => openDetail({ kind: "drawing", id: v.drawingId, versionId: v.id }) }; }
  if (d.drawings[id]) return { label: d.drawings[id].number, open: () => openDetail({ kind: "drawing", id }) };
  if (d.briefs[id]) { const b = d.briefs[id]; return { label: "Drawing brief " + b.projectId, open: () => openDetail({ kind: "drawing", id: b.drawingId }) }; }
  if (d.amendments[id]) { const a = d.amendments[id]; return { label: "Amendment on " + a.sheet, open: () => openDetail({ kind: "drawing", id: d.versions[a.versionId]?.drawingId || "", versionId: a.versionId }) }; }
  if (d.approvals[id]) { const a = d.approvals[id]; const v = d.versions[a.versionId]; return { label: "Approval of Rev " + (v?.rev || "?"), open: () => openDetail({ kind: "drawing", id: v?.drawingId || "", versionId: a.versionId }) }; }
  if (d.quotes[id]) { const q = d.quotes[id]; return { label: "Quote " + id, open: () => openDetail({ kind: "lead", id: q.leadId }) }; }
  if (d.requests[id]) { const r = d.requests[id]; return { label: "Client request: " + nd(r.label), open: () => openDetail({ kind: "project", id: r.projectId }) }; }
  if (d.council[id]) { const c = d.council[id]; return { label: "Council record (sample) " + c.projectId, open: () => openDetail({ kind: "project", id: c.projectId }) }; }
  if (d.documents[id]) return { label: "Document: " + nd(d.documents[id].name), open: () => openDetail({ kind: "document", id }) };
  if (d.messages[id]) { const m = d.messages[id]; const pid = m.projectId; const lid = m.leadId; return { label: "Message: " + nd(m.subject || m.body.slice(0, 50)) + " (" + m.delivery.toLowerCase() + ")", open: () => (pid ? openDetail({ kind: "project", id: pid }) : lid ? openDetail({ kind: "lead", id: lid }) : goTo("Clients", "messages")) }; }
  if (d.visits[id]) { const v = d.visits[id]; return { label: "Site visit " + v.projectId, open: () => openDetail({ kind: "project", id: v.projectId }) }; }
  if (d.programme[id]) { const p = d.programme[id]; return { label: "Programme item: " + nd(p.label), open: () => openDetail({ kind: "project", id: p.projectId }) }; }
  return null;
}

/** The record an event or run is about. */
export function subjectRef(d: DemoState, s: { kind: string; id: ID; label?: string }): Ref | null {
  switch (s.kind) {
    case "project": case "lead": case "task": case "client": case "staff":
      return refFor(d, s.id) || (s.label ? { label: s.label, open: () => undefined } : null);
    case "version": case "brief": case "amendment": case "approval": case "request": case "message": case "document":
      return refFor(d, s.id);
    case "agent": return { label: s.label || "Agent", open: () => openDetail({ kind: "agent", id: s.id }) };
    case "rule": return { label: "Rule: " + (d.rules[s.id]?.name || s.label || s.id), open: () => goTo("Work", "workflows") };
    case "template": return d.templates[s.id] ? { label: "Template: " + d.templates[s.id].name, open: () => goTo("Settings", "templates") } : { label: s.label || s.id, open: () => goTo("Projects", "templates") };
    case "settings": return { label: s.label || "Settings", open: () => goTo("Settings", "rules") };
    case "article": return { label: s.label || "Article", open: () => openDetail({ kind: "article", id: s.id }) };
    case "system": return null;
    default: return s.label ? { label: s.label, open: () => undefined } : null;
  }
}

/* ── activity labels ── */
export const ACTOR_KIND: Record<ActivityEvent["actor"]["kind"], string> = {
  staff: "staff", client: "client", agent: "simulated agent", integration: "simulated integration", system: "workflow engine",
};
export const EVENT_STATUS: Record<ActivityEvent["status"], { tone: Tone; icon: string; label: string }> = {
  ok: { tone: "ok", icon: "check", label: "Recorded" },
  info: { tone: "info", icon: "info", label: "Information" },
  attention: { tone: "warn", icon: "alert", label: "Needs attention" },
  failed: { tone: "bad", icon: "x", label: "Failed" },
  retry: { tone: "warn", icon: "refresh", label: "Retried" },
};
export function EventStatus({ s }: { s: ActivityEvent["status"] }) {
  const x = EVENT_STATUS[s];
  return <Badge tone={x.tone} icon={x.icon}>{x.label}</Badge>;
}

export const RUN_STATUS: Record<AutomationRun["result"], { tone: Tone; icon: string }> = {
  Success: { tone: "ok", icon: "check" },
  Failed: { tone: "bad", icon: "x" },
  Retried: { tone: "warn", icon: "refresh" },
  "Skipped: duplicate": { tone: "info", icon: "layers" },
  Stopped: { tone: "neutral", icon: "pause" },
};
export function RunStatus({ r }: { r: AutomationRun["result"] }) {
  const x = RUN_STATUS[r];
  return <Badge tone={x.tone} icon={x.icon}>{r}</Badge>;
}

/** A failed client message that a failed run refers to (for Retry). */
export function failedMessageFor(d: DemoState, run: AutomationRun): Message | undefined {
  const failed = Object.values(d.messages).filter((m) => m.delivery === "Failed");
  const pid = projectOfSubject(d, run.subject);
  return failed.find((m) => m.eventKey === run.eventKey) || failed.find((m) => !!pid && m.projectId === pid && (m.templateId === "tpl-ready" || /ready/i.test(m.subject || "")));
}

/* ── tasks ── */
export type DueState = "all" | "overdue" | "today" | "week" | "paused" | "done";
export const DUE_LABEL: Record<DueState, string> = { all: "All open", overdue: "Overdue", today: "Due today", week: "Due this week", paused: "Paused", done: "Done" };

export function taskTz(d: DemoState, t: Task) { return d.staff[t.assigneeId]?.tz || TZ_OFFICE; }

export function matchesDue(d: DemoState, t: Task, f: DueState): boolean {
  if (t.state === "Cancelled") return false;
  if (f === "done") return t.state === "Done";
  if (t.state === "Done") return false;
  if (f === "all") return true;
  if (f === "paused") return t.state === "Paused";
  if (f === "overdue") return S.isOverdue(d, t);
  if (t.state === "Paused" || t.due < d.now) return false;
  const days = calendarDaysBetween(d.now, t.due);
  if (f === "today") return days === 0;
  const wd = localParts(d.now).wd;
  const toNextMonday = wd === 0 ? 1 : 8 - wd;
  return days < toNextMonday;
}

export const TASK_KIND: Record<Task["kind"], string> = {
  drawing: "Drawing assignment", amendment: "Amendment", chase: "Client chase", followup: "Lead follow-up", review: "Review",
  pack: "Planning pack", admin: "Admin", fi: "Further information", survey: "Site survey", planning: "Planning status", qa: "Office QA",
};

export function TaskState({ d, t }: { d: DemoState; t: Task }) {
  if (t.state === "Done") return <Badge tone="ok" icon="check">Done</Badge>;
  if (t.state === "Cancelled") return <Badge tone="neutral" icon="x">Cancelled</Badge>;
  if (t.state === "Paused") return <Badge tone="neutral" icon="pause" title={t.pauseReason}>Paused{t.pauseReason ? ": " + t.pauseReason : ""}</Badge>;
  if (S.isOverdue(d, t)) return <Badge tone="bad" icon="alert">Overdue</Badge>;
  return <Badge tone="info" icon={t.state === "In progress" ? "play" : "clock"}>{t.state}</Badge>;
}

export function Priority({ p }: { p: Task["priority"] }) {
  return <Badge tone={p === "High" ? "accent" : "neutral"} icon={p === "High" ? "flag" : false}>{p}</Badge>;
}

/** Due date with the assignee's zone, and overdue spelled out in words. */
export function TaskDue({ d, t }: { d: DemoState; t: Task }) {
  const tz = taskTz(d, t);
  const open = t.state === "Open" || t.state === "In progress";
  return (
    <span className="jo-due">
      <DateTag ts={t.due} tz={tz} showZone={tz === TZ_PH} now={open ? d.now : undefined} kind={t.due !== t.originalDue ? "Moved target" : "Internal target"} />
      {open && t.due < d.now && <span className="jo-late"><Icon name="alert" size={11} stroke={2.2} /> {dueLabel(t.due, d.now, tz)}</span>}
    </span>
  );
}

export function taskRecordRef(d: DemoState, t: Task): Ref | null {
  if (t.projectId) return refFor(d, t.projectId);
  if (t.leadId) return refFor(d, t.leadId);
  return null;
}

/* ── days ── */
export const dayKey = (ts: number, tz: string = TZ_OFFICE) => { const p = localParts(ts, tz); return p.y * 10000 + p.m * 100 + p.d; };
export function groupByDay<T>(items: T[], at: (x: T) => number): { key: number; label: string; items: T[] }[] {
  const out: { key: number; label: string; items: T[] }[] = [];
  for (const x of items) {
    const k = dayKey(at(x));
    let g = out.find((y) => y.key === k);
    if (!g) { g = { key: k, label: fmtDate(at(x)), items: [] }; out.push(g); }
    g.items.push(x);
  }
  return out;
}

/** Working days (Dublin) starting today, as start-of-day instants. */
export function nextWorkingDays(now: number, n: number): number[] {
  const out: number[] = [];
  let t = atLocal(now, 0, 0);
  while (out.length < n) {
    const wd = localParts(t).wd;
    if (wd !== 0 && wd !== 6) out.push(t);
    t = atLocal(t + 36 * 3600000, 0, 0);
  }
  return out;
}

export const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const round1 = (n: number) => Math.round(n * 10) / 10;

/** Horizontal bar with the count as text. Clickable when onClick is given. */
export function Bar({ label, count, max, onClick, on, sub }: { label: ReactNode; count: number; max: number; onClick?: () => void; on?: boolean; sub?: ReactNode }) {
  const pct = max > 0 ? Math.max(count ? 3 : 0, Math.round((count / max) * 100)) : 0;
  const inner = (
    <>
      <span className="jo-bar-label">{label}{sub && <span className="jo-bar-sub">{sub}</span>}</span>
      <span className="jo-bar-track" aria-hidden="true"><span className="jo-bar-fill" style={{ width: pct + "%" }} /></span>
      <span className="jo-bar-count">{count}</span>
    </>
  );
  return onClick
    ? <button type="button" className={"jo-bar" + (on ? " on" : "")} aria-pressed={on} onClick={onClick}>{inner}</button>
    : <div className="jo-bar static">{inner}</div>;
}
