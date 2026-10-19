/* Task drawer body: every field, the records it links to, its dependencies and
   its full date and reassignment history, with the actions a person can take. */
import { useState } from "react";
import { act, useDemo } from "../store";
import * as S from "../selectors";
import { closeDetail, openDetail } from "../ui";
import { Badge, Btn, DateTag, Empty, Field, KV, Panel } from "../kit";
import { TZ_OFFICE, TZ_PH, fmtDateTime, localParts, zoneLabel, zoned } from "../time";
import { Priority, TASK_KIND, TaskDue, TaskState, goTo, nd, refFor } from "./ops/shared";

type Mode = null | "reassign" | "due" | "pause";

const toLocalInput = (ts: number, tz: string) => {
  const p = localParts(ts, tz);
  const z = (n: number) => String(n).padStart(2, "0");
  return p.y + "-" + z(p.m) + "-" + z(p.d) + "T" + z(p.h) + ":" + z(p.min);
};
const fromLocalInput = (v: string, tz: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(v);
  return m ? zoned(+m[1], +m[2], +m[3], +m[4], +m[5], tz) : null;
};

export default function TaskDetail({ id }: { id: string; tab?: string; versionId?: string }) {
  const d = useDemo();
  const t = d.tasks[id];
  const [mode, setMode] = useState<Mode>(null);
  const [reason, setReason] = useState("");
  const [to, setTo] = useState("");
  const [when, setWhen] = useState("");
  const [pauseReason, setPauseReason] = useState("");
  if (!t) return <Empty title="Task not found" body="It may have been removed by a demo reset." />;

  const tz = d.staff[t.assigneeId]?.tz || TZ_OFFICE;
  const persona = d.persona.kind;
  const canAct = persona === "admin" || persona === "mullingar" || (persona === "sales" && !!t.leadId);
  const live = t.state !== "Done" && t.state !== "Cancelled";
  const completesElsewhere =
    t.kind === "drawing" && t.links.briefId ? "Drawing assignments complete when a version is submitted for office review." :
    t.kind === "qa" ? "Office QA tasks complete when the version is released or returned for correction." :
    t.kind === "amendment" ? "Amendment tasks complete when a revision addressing the change is uploaded." :
    t.links.requestId && d.requests[t.links.requestId]?.blocking && d.requests[t.links.requestId].state === "Outstanding" ? "This chase closes when the client's document arrives or the request is cancelled." : "";

  const begin = (m: Mode) => { setMode(m); setReason(""); setTo(""); setPauseReason(d.settings.pauseReasons[0] || ""); setWhen(toLocalInput(t.due, tz)); };
  const finish = (ok: boolean) => { if (ok) setMode(null); };

  const links: { k: string; ref: ReturnType<typeof refFor>; extra?: () => void }[] = [];
  if (t.projectId) links.push({ k: "Project", ref: refFor(d, t.projectId) });
  if (t.leadId) links.push({ k: "Lead", ref: refFor(d, t.leadId) });
  if (t.links.briefId) links.push({ k: "Drawing brief", ref: refFor(d, t.links.briefId) });
  if (t.links.versionId) links.push({ k: "Drawing version", ref: refFor(d, t.links.versionId) });
  if (t.links.amendmentId) links.push({ k: "Amendment", ref: refFor(d, t.links.amendmentId) });
  if (t.links.requestId) links.push({ k: "Client request", ref: refFor(d, t.links.requestId) });
  if (t.links.councilId) links.push({ k: "Council record (sample)", ref: refFor(d, t.links.councilId) });
  if (t.links.programmeId) links.push({ k: "Programme item", ref: { label: "Open programme", open: () => goTo("Projects", "programme") } });
  const deps = t.deps.map((x) => d.tasks[x]).filter(Boolean);
  const dependents = Object.values(d.tasks).filter((x) => x.deps.includes(t.id));
  const staff = Object.values(d.staff).filter((s) => s.id !== t.assigneeId);

  return (
    <div className="j-stack">
      <div className="j-row-wrap">
        <TaskState d={d} t={t} />
        <Priority p={t.priority} />
        <Badge tone="neutral" icon="layers">{TASK_KIND[t.kind]}</Badge>
        <Badge tone="neutral" icon="user">{t.team}</Badge>
      </div>

      <KV items={[
        ["Assignee (does the work)", S.staffName(d, t.assigneeId) + (tz === TZ_PH ? " · Manila" : " · Dublin")],
        ["Accountable owner", S.staffName(d, t.ownerId)],
        ["Current target", <TaskDue key="due" d={d} t={t} />],
        ["Original target", <span key="o">{fmtDateTime(t.originalDue, tz, true)}{t.originalDue !== t.due && <span className="j-dim"> (kept after {t.dueHistory.length} change{t.dueHistory.length === 1 ? "" : "s"})</span>}</span>],
        ["Created", fmtDateTime(t.createdAt)],
        ["Completed", t.completedAt ? fmtDateTime(t.completedAt) : "Not yet"],
        ...(t.state === "Paused" ? [["Pause reason", t.pauseReason || "Not recorded"] as [string, string]] : []),
        ...(tz === TZ_PH ? [["Target in Dublin time", fmtDateTime(t.due, TZ_OFFICE, true)] as [string, string]] : []),
      ]} />

      {canAct && live && (
        <Panel title="Actions" sub="Each change is logged with who, when and why.">
          <div className="j-row-wrap">
            <Btn variant="primary" icon="check" onClick={() => act.completeTask(t.id)}>Mark complete</Btn>
            <Btn icon="user" pressed={mode === "reassign"} onClick={() => begin(mode === "reassign" ? null : "reassign")}>Reassign</Btn>
            <Btn icon="calendar" pressed={mode === "due"} onClick={() => begin(mode === "due" ? null : "due")}>Change target</Btn>
            {t.state === "Paused"
              ? <Btn icon="play" onClick={() => act.resumeTask(t.id)}>Resume</Btn>
              : <Btn icon="pause" pressed={mode === "pause"} onClick={() => begin(mode === "pause" ? null : "pause")}>Pause</Btn>}
          </div>
          {completesElsewhere && <div className="j-small" style={{ marginTop: 8 }}>{completesElsewhere} Mark complete will explain and change nothing.</div>}

          {mode === "reassign" && (
            <div className="j-stack" style={{ marginTop: 12 }}>
              <Field label="Reassign to" htmlFor="td-to">
                <select id="td-to" className="j-select" value={to} onChange={(e) => setTo(e.target.value)}>
                  <option value="">Choose a person</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.team})</option>)}
                </select>
              </Field>
              <Field label="Reason" htmlFor="td-rr" hint="Required. The original due date stays in history.">
                <input id="td-rr" className="j-input" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <div className="j-row-wrap">
                <Btn variant="primary" disabled={!to || !reason.trim()} onClick={() => finish(act.reassignTask(t.id, to, reason).ok)}>Reassign task</Btn>
                <Btn variant="ghost" onClick={() => setMode(null)}>Cancel</Btn>
              </div>
            </div>
          )}
          {mode === "due" && (
            <div className="j-stack" style={{ marginTop: 12 }}>
              <Field label={"New target (" + zoneLabel(tz) + " time)"} htmlFor="td-when">
                <input id="td-when" type="datetime-local" className="j-input" value={when} onChange={(e) => setWhen(e.target.value)} />
              </Field>
              <Field label="Reason" htmlFor="td-dr" hint="Required. The original target is kept.">
                <input id="td-dr" className="j-input" value={reason} onChange={(e) => setReason(e.target.value)} />
              </Field>
              <div className="j-row-wrap">
                <Btn variant="primary" disabled={!fromLocalInput(when, tz) || !reason.trim()} onClick={() => { const ts = fromLocalInput(when, tz); if (ts) finish(act.changeDue(t.id, ts, reason).ok); }}>Save new target</Btn>
                <Btn variant="ghost" onClick={() => setMode(null)}>Cancel</Btn>
              </div>
            </div>
          )}
          {mode === "pause" && (
            <div className="j-stack" style={{ marginTop: 12 }}>
              <Field label="Pause reason" htmlFor="td-pr" hint="Reasons are set in Settings, Workflow rules.">
                <select id="td-pr" className="j-select" value={pauseReason} onChange={(e) => setPauseReason(e.target.value)}>
                  {d.settings.pauseReasons.map((r) => <option key={r}>{r}</option>)}
                </select>
              </Field>
              <div className="j-row-wrap">
                <Btn variant="primary" disabled={!pauseReason} onClick={() => finish(act.pauseTask(t.id, pauseReason).ok)}>Pause task</Btn>
                <Btn variant="ghost" onClick={() => setMode(null)}>Cancel</Btn>
              </div>
            </div>
          )}
        </Panel>
      )}
      {!canAct && live && (
        <div className="j-note">
          {persona === "philippines" ? "Drawing assignments are worked from the Philippines queue: acknowledge, ask a clarification or submit a version there." : "Read-only in this preview."}
          {persona === "philippines" && <div style={{ marginTop: 8 }}><Btn size="sm" icon="arrow" onClick={() => { closeDetail(); goTo("Drawings", "queue"); }}>Open Philippines queue</Btn></div>}
        </div>
      )}

      <Panel title="Linked records">
        {links.length === 0 ? <div className="j-small">No linked records.</div> : (
          <div className="j-list">
            {links.map((l, i) => (
              <div key={i} className="j-list-item" style={{ alignItems: "center" }}>
                <span className="j-small" style={{ width: 150, flex: "none" }}>{l.k}</span>
                {l.ref ? <Btn size="sm" icon="link" onClick={l.ref.open}>{l.ref.label}</Btn> : <span className="j-dim">Record not found</span>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Dependencies">
        {deps.length === 0 && dependents.length === 0 ? <div className="j-small">No dependencies.</div> : (
          <div className="j-list">
            {deps.map((x) => (
              <div key={x.id} className="j-list-item" style={{ alignItems: "center" }}>
                <Badge tone={x.state === "Done" ? "ok" : "warn"} icon={x.state === "Done" ? "check" : "clock"}>{x.state === "Done" ? "Done" : "Waiting on"}</Badge>
                <div className="jo-grow"><Btn size="sm" variant="ghost" onClick={() => openDetail({ kind: "task", id: x.id })}>{nd(x.title)}</Btn></div>
                <span className="j-small">{S.staffName(d, x.assigneeId)}</span>
              </div>
            ))}
            {dependents.map((x) => (
              <div key={x.id} className="j-list-item" style={{ alignItems: "center" }}>
                <Badge tone="info" icon="arrow">Blocks</Badge>
                <div className="jo-grow"><Btn size="sm" variant="ghost" onClick={() => openDetail({ kind: "task", id: x.id })}>{nd(x.title)}</Btn></div>
                <span className="j-small">{S.staffName(d, x.assigneeId)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Target history" sub="The original target is never overwritten.">
        <div className="j-list">
          <div className="j-list-item"><Badge tone="neutral" icon="flag">Original</Badge><div className="jo-grow"><DateTag ts={t.originalDue} tz={tz} showZone={tz === TZ_PH} /></div><span className="j-small">Set {fmtDateTime(t.createdAt)}</span></div>
          {t.dueHistory.map((h, i) => (
            <div key={i} className="j-list-item">
              <Badge tone="info" icon="calendar">Moved</Badge>
              <div className="jo-grow">
                <div className="j-cell-main">{fmtDateTime(h.from, tz)} to {fmtDateTime(h.to, tz)}{tz === TZ_PH ? " Manila" : ""}</div>
                <div className="j-small">{nd(h.reason)}</div>
              </div>
              <span className="j-small">{S.staffName(d, h.by)} · {fmtDateTime(h.at)}</span>
            </div>
          ))}
          {t.dueHistory.length === 0 && <div className="j-small" style={{ paddingTop: 8 }}>Target has not changed.</div>}
        </div>
      </Panel>

      <Panel title="Reassignment history">
        {!t.reassigned?.length ? <div className="j-small">Never reassigned.</div> : (
          <div className="j-list">
            {t.reassigned.map((r, i) => (
              <div key={i} className="j-list-item">
                <Badge tone="info" icon="user">Reassigned</Badge>
                <div className="jo-grow"><div className="j-cell-main">{S.staffName(d, r.from)} to {S.staffName(d, r.to)}</div><div className="j-small">{nd(r.reason)}</div></div>
                <span className="j-small">{fmtDateTime(r.at)}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <div className="j-small">Task {t.id}. Demo record; changes stay in this browser.</div>
    </div>
  );
}
