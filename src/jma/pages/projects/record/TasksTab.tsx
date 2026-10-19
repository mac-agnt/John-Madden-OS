/* Tasks on a project: assignee vs accountable owner, due with its history,
   and the four office actions (complete, reassign, change target, pause). */
import { useState } from "react";
import type { Task } from "../../../types";
import { act, useDemo } from "../../../store";
import * as S from "../../../selectors";
import { openDetail } from "../../../ui";
import { Badge, Btn, DateTag, Dialog, Empty, Field, type Tone } from "../../../kit";
import { dueLabel, fmtDateTime } from "../../../time";
import { fromInputs, isOffice, toDateInput, toTimeInput } from "../common";

type Mode = { kind: "reassign" | "due" | "pause"; id: string } | null;
const STATE_TONE: Record<Task["state"], Tone> = { Open: "neutral", "In progress": "info", Paused: "warn", Done: "ok", Cancelled: "neutral" };
const STATE_ICON: Record<Task["state"], string> = { Open: "clock", "In progress": "play", Paused: "pause", Done: "check", Cancelled: "x" };

export default function TasksTab({ id }: { id: string }) {
  const d = useDemo();
  const office = isOffice(d);
  const [mode, setMode] = useState<Mode>(null);
  const all = Object.values(d.tasks).filter((t) => t.projectId === id && (d.persona.kind !== "philippines" || t.assigneeId === d.persona.staffId));
  if (d.persona.kind === "client") return <Empty title="Not shown in the client preview" body="Clients see milestones in the portal, not internal tasks." />;
  const open = all.filter(S.isOpen).sort((a, b) => a.due - b.due);
  const closed = all.filter((t) => !S.isOpen(t)).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
  const t = mode ? d.tasks[mode.id] : undefined;

  const row = (t: Task) => {
    const od = S.isOverdue(d, t);
    const changed = t.dueHistory.length > 0 || t.originalDue !== t.due;
    return (
      <tr key={t.id}>
        <td style={{ minWidth: 220 }}>
          <button type="button" className="j-link" onClick={() => openDetail({ kind: "task", id: t.id })}>{t.title}</button>
          <div className="j-cell-sub">{t.id} · {t.kind} · {t.priority} priority</div>
          {t.pauseReason && <div className="j-cell-sub">Paused: {t.pauseReason}</div>}
          {t.reassigned?.length ? <div className="j-cell-sub">Reassigned {t.reassigned.length}×, last: {t.reassigned[t.reassigned.length - 1].reason}</div> : null}
        </td>
        <td><div>{S.staffName(d, t.assigneeId)}</div><div className="j-cell-sub">{d.staff[t.assigneeId]?.team}</div></td>
        <td>{S.staffName(d, t.ownerId)}</td>
        <td>
          <DateTag ts={t.due} kind={t.state === "Done" ? "Was due" : "Current target"} now={S.isOpen(t) && t.state !== "Paused" ? d.now : undefined} />
          {od && <div className="j-cell-sub j-ink-bad">{dueLabel(t.due, d.now)}</div>}
          {changed && <div className="j-cell-sub">Original {fmtDateTime(t.originalDue)}{t.dueHistory.length ? ", changed " + t.dueHistory.length + "×" : ""}</div>}
        </td>
        <td><Badge tone={od ? "bad" : STATE_TONE[t.state]} icon={od ? "alert" : STATE_ICON[t.state]}>{t.state}{od ? ", overdue" : ""}</Badge>{t.completedAt && <div className="j-cell-sub">{fmtDateTime(t.completedAt)}</div>}</td>
        <td>
          {office && S.isOpen(t) ? (
            <div className="jp-taskacts">
              <Btn size="sm" icon="check" onClick={() => act.completeTask(t.id)}>Complete</Btn>
              <Btn size="sm" icon="user" onClick={() => setMode({ kind: "reassign", id: t.id })}>Reassign</Btn>
              <Btn size="sm" icon="calendar" onClick={() => setMode({ kind: "due", id: t.id })}>Change target</Btn>
              {t.state === "Paused" ? <Btn size="sm" icon="play" onClick={() => act.resumeTask(t.id)}>Resume</Btn> : <Btn size="sm" icon="pause" onClick={() => setMode({ kind: "pause", id: t.id })}>Pause</Btn>}
            </div>
          ) : <Btn size="sm" variant="ghost" icon="eye" onClick={() => openDetail({ kind: "task", id: t.id })}>Open</Btn>}
        </td>
      </tr>
    );
  };

  const table = (list: Task[]) => (
    <div className="j-tablewrap">
      <table className="j-table jp-table">
        <thead><tr><th>Task</th><th>Assignee</th><th>Accountable owner</th><th>Due</th><th>State</th><th>Actions</th></tr></thead>
        <tbody>{list.map(row)}</tbody>
      </table>
    </div>
  );

  return (
    <div className="j-stack">
      <div className="j-small">The assignee does the work; the accountable owner answers for it. Some tasks close themselves from records (drawing returns, QA, amendments, client uploads); the store explains why if you try to complete one.</div>
      {open.length ? table(open) : <Empty title="No open tasks" body="Everything on this job is done or not yet created by a stage." />}
      {closed.length > 0 && (
        <details className="jp-log"><summary>Completed or cancelled ({closed.length})</summary>{table(closed)}</details>
      )}
      {t && mode?.kind === "reassign" && <ReassignDialog t={t} onClose={() => setMode(null)} />}
      {t && mode?.kind === "due" && <DueDialog t={t} onClose={() => setMode(null)} />}
      {t && mode?.kind === "pause" && <PauseDialog t={t} onClose={() => setMode(null)} />}
    </div>
  );
}

function ReassignDialog({ t, onClose }: { t: Task; onClose: () => void }) {
  const d = useDemo();
  const others = Object.values(d.staff).filter((s) => s.id !== t.assigneeId);
  const [to, setTo] = useState(others[0]?.id || "");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const go = () => { if (!reason.trim()) { setErr("Give a reason for the change."); return; } const r = act.reassignTask(t.id, to, reason.trim()); if (r.ok) onClose(); else setErr(r.message); };
  return (
    <Dialog open onClose={onClose} title={"Reassign: " + t.title} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="user" onClick={go}>Reassign</Btn></>}>
      <div className="j-small">Now with {S.staffName(d, t.assigneeId)}. The accountable owner stays {S.staffName(d, t.ownerId)}; the due date and its history are kept.</div>
      <Field label="New assignee" htmlFor="ra-to">
        <select id="ra-to" className="j-select" value={to} onChange={(e) => setTo(e.target.value)} data-autofocus>
          {others.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.team}, {s.role.toLowerCase()})</option>)}
        </select>
      </Field>
      <Field label="Reason" htmlFor="ra-why" error={err}><textarea id="ra-why" className="j-textarea" value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} /></Field>
    </Dialog>
  );
}

function DueDialog({ t, onClose }: { t: Task; onClose: () => void }) {
  const d = useDemo();
  const [date, setDate] = useState(toDateInput(t.due));
  const [time, setTime] = useState(toTimeInput(t.due));
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const go = () => {
    const ts = fromInputs(date, time);
    if (ts == null) { setErr("Enter a valid date and time."); return; }
    if (!reason.trim()) { setErr("Give a reason for the new date."); return; }
    const r = act.changeDue(t.id, ts, reason.trim()); if (r.ok) onClose(); else setErr(r.message);
  };
  return (
    <Dialog open onClose={onClose} title={"Change target: " + t.title} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="calendar" onClick={go}>Save new target</Btn></>}>
      <div className="j-small">Current {fmtDateTime(t.due, undefined, true)}. Original {fmtDateTime(t.originalDue, undefined, true)} is kept.</div>
      <div className="j-grid j-grid-2">
        <Field label="Date (Dublin)" htmlFor="dd-date"><input id="dd-date" type="date" className="j-input" value={date} onChange={(e) => setDate(e.target.value)} data-autofocus /></Field>
        <Field label="Time (Dublin)" htmlFor="dd-time"><input id="dd-time" type="time" className="j-input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      <Field label="Reason" htmlFor="dd-why" error={err}><textarea id="dd-why" className="j-textarea" value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} /></Field>
      {t.dueHistory.length > 0 && (
        <div className="j-stack" style={{ gap: 4 }}>
          <div className="j-label">Change history</div>
          {t.dueHistory.map((h, i) => <div key={i} className="j-small">{fmtDateTime(h.at)}: {fmtDateTime(h.from)} to {fmtDateTime(h.to)} by {S.staffName(d, h.by)}. {h.reason}</div>)}
        </div>
      )}
    </Dialog>
  );
}

function PauseDialog({ t, onClose }: { t: Task; onClose: () => void }) {
  const d = useDemo();
  const [why, setWhy] = useState(d.settings.pauseReasons[0] || "");
  const go = () => { const r = act.pauseTask(t.id, why); if (r.ok) onClose(); };
  return (
    <Dialog open onClose={onClose} title={"Pause: " + t.title} footer={<><Btn variant="ghost" onClick={onClose}>Cancel</Btn><Btn variant="primary" icon="pause" onClick={go}>Pause task</Btn></>}>
      <Field label="Pause reason" htmlFor="pz-why" hint="Reasons come from Settings, Workflow rules.">
        <select id="pz-why" className="j-select" value={why} onChange={(e) => setWhy(e.target.value)} data-autofocus>
          {d.settings.pauseReasons.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <div className="j-small">A paused task is not flagged as overdue. Its due date stays as it is.</div>
    </Dialog>
  );
}
