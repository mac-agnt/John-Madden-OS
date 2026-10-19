/* Briefing and Ops Watchdog output, computed from the store on every render.
   Used by the Agents page tabs and by the agent profile drawer. */
import { useState } from "react";
import type { DemoState, ID } from "../../types";
import { act, programmeView } from "../../store";
import * as S from "../../selectors";
import { AGENTS, briefingLines, type AgentDef } from "../../agents";
import { openDetail } from "../../ui";
import { Badge, Btn, Dialog, Empty, Field, type Tone } from "../../kit";
import { dueLabel, fmtDate, fmtDateTime, fmtShortDate, workingDaysBetween } from "../../time";
import AgentFace from "../../../components/AgentFace";
import { goTo, nd } from "./shared";

export function Face({ a, size = 40 }: { a: AgentDef; size?: number }) {
  return <span className="jo-face" style={{ width: size + 4, height: size + 4 }} aria-hidden="true"><AgentFace shape={a.shape} state="idle" tint={a.tint} size={String(size)} /></span>;
}

export const agentEvents = (d: DemoState, a: AgentDef) =>
  S.visibleEvents(d).filter((e) => e.actor.kind === "agent" && a.eventMatch.test(e.actor.name)).sort((x, y) => y.at - x.at);

export const agentFor = (name: string) => AGENTS.find((a) => a.eventMatch.test(name));

/* ── Briefing ── */
export function BriefingList({ d }: { d: DemoState }) {
  const lines = briefingLines(d);
  return (
    <div>
      {lines.map((l, i) => (
        <div key={i} className="jo-brief-line">
          <span className="jo-brief-k">{l.k}</span>
          <span className="jo-brief-v">{nd(l.v)}</span>
          {l.go ? <Btn size="sm" variant="ghost" icon="arrow" onClick={() => goTo(l.go![0], l.go![1], l.go![2] ? { kind: "project", id: l.go![2] } : undefined)}>Open</Btn> : <span />}
        </div>
      ))}
    </div>
  );
}

/* ── Ops Watchdog ── */
export type Flag = { id: string; kind: string; tone: Tone; icon: string; text: string; to?: ID; projectId?: ID; leadId?: ID; open: () => void; openLabel: string };

export function watchdogFlags(d: DemoState): Flag[] {
  const out: Flag[] = [];
  S.overdueTasks(d).forEach((t) => out.push({
    id: "ov-" + t.id, kind: "Overdue task", tone: "bad", icon: "alert",
    text: nd(t.title) + " (" + S.staffName(d, t.assigneeId) + ") is " + dueLabel(t.due, d.now, d.staff[t.assigneeId]?.tz).toLowerCase() + ".",
    to: t.assigneeId, projectId: t.projectId, leadId: t.leadId, open: () => openDetail({ kind: "task", id: t.id }), openLabel: "Open task",
  }));
  S.openTasks(d).forEach((t) => {
    if (!d.staff[t.assigneeId]) out.push({ id: "no-as-" + t.id, kind: "Missing owner", tone: "warn", icon: "user", text: nd(t.title) + " has no assignee.", to: t.ownerId, projectId: t.projectId, leadId: t.leadId, open: () => openDetail({ kind: "task", id: t.id }), openLabel: "Open task" });
    if (!t.due) out.push({ id: "no-due-" + t.id, kind: "Missing target", tone: "warn", icon: "calendar", text: nd(t.title) + " has no target date.", to: t.ownerId, projectId: t.projectId, leadId: t.leadId, open: () => openDetail({ kind: "task", id: t.id }), openLabel: "Open task" });
  });
  S.liveProjects(d).forEach((p) => {
    if (!d.staff[p.ownerId]) out.push({ id: "no-own-" + p.id, kind: "Missing owner", tone: "warn", icon: "user", text: p.id + " " + S.household(d, p.id) + " has no accountable owner.", projectId: p.id, open: () => openDetail({ kind: "project", id: p.id }), openLabel: "Open project" });
    if (!p.nextTarget) out.push({ id: "no-tgt-" + p.id, kind: "Missing target", tone: "warn", icon: "calendar", text: p.id + " " + S.household(d, p.id) + " has no next target.", to: p.ownerId, projectId: p.id, open: () => openDetail({ kind: "project", id: p.id }), openLabel: "Open project" });
    programmeView(d, p.id).filter((v) => v.conflict).forEach((v) => out.push({
      id: "cf-" + v.id, kind: "Programme conflict", tone: "warn", icon: "calendar",
      text: p.id + " " + S.household(d, p.id) + ": forecast work now runs past the fixed date “" + nd(v.label) + "” (" + fmtShortDate(v.start) + ").",
      to: p.ownerId, projectId: p.id, open: () => goTo("Projects", "programme", { kind: "project", id: p.id }), openLabel: "Open project",
    }));
  });
  const seen = new Set<string>();
  Object.values(d.council).filter((c) => c.state === "Response in preparation" && c.externalDate >= d.now && workingDaysBetween(d.now, c.externalDate) <= 5).forEach((c) => {
    seen.add(c.projectId + ":" + fmtDate(c.externalDate));
    out.push({ id: "ext-" + c.id, kind: "External date approaching", tone: "warn", icon: "clock",
      text: S.household(d, c.projectId) + ": recorded council date " + fmtShortDate(c.externalDate) + " (sample) is " + workingDaysBetween(d.now, c.externalDate) + " working days away; internal target " + fmtShortDate(c.internalTarget) + ".",
      to: c.ownerId, projectId: c.projectId, open: () => openDetail({ kind: "project", id: c.projectId }), openLabel: "Open project" });
  });
  Object.values(d.programme).filter((it) => it.fixed && it.fixedStart && it.fixedStart >= d.now && (it.dateKind === "Recorded external date" || it.dateKind === "Client commitment") && workingDaysBetween(d.now, it.fixedStart) <= 5 && d.projects[it.projectId]?.status === "Live").forEach((it) => {
    if (seen.has(it.projectId + ":" + fmtDate(it.fixedStart))) return;
    out.push({ id: "ext-" + it.id, kind: "External date approaching", tone: "warn", icon: "clock",
      text: S.household(d, it.projectId) + ": " + nd(it.label) + " on " + fmtShortDate(it.fixedStart) + " (" + it.dateKind.toLowerCase() + ") is " + workingDaysBetween(d.now, it.fixedStart!) + " working days away.",
      to: d.projects[it.projectId].ownerId, projectId: it.projectId, open: () => openDetail({ kind: "project", id: it.projectId }), openLabel: "Open project" });
  });
  return out;
}

export function FlagList({ d, flags, inDrawer }: { d: DemoState; flags: Flag[]; inDrawer?: boolean }) {
  const [draft, setDraft] = useState<Flag | null>(null);
  const [body, setBody] = useState("");
  const me = d.persona.staffId ? S.firstName(d, d.persona.staffId) : "Ciaran";
  const start = (f: Flag) => {
    const first = f.to ? S.firstName(d, f.to) : "team";
    setBody("Hi " + first + ", " + f.text.charAt(0).toLowerCase() + f.text.slice(1) + " Can you confirm a realistic date or tell me what is blocking it? I can reassign the work or move the target with a reason if that helps. " + me);
    setDraft(f);
  };
  const save = () => {
    if (!draft) return;
    const r = act.sendMessage({ projectId: draft.projectId, leadId: draft.projectId ? undefined : draft.leadId, body: "Escalation draft to " + (draft.to ? S.staffName(d, draft.to) : "the team") + ": " + body, channel: "Internal note", audience: "Internal" });
    if (r.ok) setDraft(null);
  };
  if (!flags.length) return <Empty title="No flags" body="No overdue tasks, missing owners or targets, programme conflicts or approaching recorded dates." />;
  return (
    <>
      <div className="j-list">
        {flags.map((f) => (
          <div key={f.id} className="j-list-item">
            <Badge tone={f.tone} icon={f.icon}>{f.kind}</Badge>
            <div className="jo-grow">
              <div className="j-text">{f.text}</div>
              <div className="j-row-wrap" style={{ marginTop: 6 }}>
                {inDrawer
                  ? <Btn size="sm" icon="edit" onClick={() => goTo("Agents", "watchdog")}>Draft escalation in Ops Watchdog</Btn>
                  : <Btn size="sm" icon="edit" onClick={() => start(f)}>Draft escalation</Btn>}
                <Btn size="sm" variant="ghost" icon="arrow" onClick={f.open}>{f.openLabel}</Btn>
              </div>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!draft} onClose={() => setDraft(null)} title="Draft escalation"
        footer={<><Btn variant="ghost" onClick={() => setDraft(null)}>Cancel</Btn><Btn variant="primary" icon="doc" disabled={!body.trim()} onClick={save}>Save as internal note</Btn></>}>
        {draft && (
          <>
            <div className="j-small">To: {draft.to ? S.staffName(d, draft.to) : "No named recipient"} · About: {draft.projectId ? draft.projectId + " " + S.household(d, draft.projectId) : draft.leadId ? draft.leadId + " " + (d.leads[draft.leadId]?.name || "") : "General"}</div>
            <Field label="Message" htmlFor="esc-body" hint="Edit freely. Saving keeps it as an internal note on the record; nothing is sent outside the app.">
              <textarea id="esc-body" className="j-textarea" rows={6} value={body} onChange={(e) => setBody(e.target.value)} data-autofocus />
            </Field>
            <div className="j-note">Ops Watchdog drafted this from the store at {fmtDateTime(d.now)}. A person decides whether to send, reassign or move a date; the agent does none of these itself.</div>
          </>
        )}
      </Dialog>
    </>
  );
}
