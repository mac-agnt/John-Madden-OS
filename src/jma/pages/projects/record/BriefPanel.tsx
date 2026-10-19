/* Drawing brief in the project record: an editable draft with its missing
   inputs and a blocked-or-ready issue action, or the issued brief's timeline
   in Dublin and Manila time. */
import { useState } from "react";
import type { DrawingBrief } from "../../../types";
import { act, briefMissing, useDemo } from "../../../store";
import * as S from "../../../selectors";
import { openDetail } from "../../../ui";
import { Badge, Btn, DateTag, Field, Icon, KV, Panel } from "../../../kit";
import { TZ_OFFICE, TZ_PH, addWorkingDays, fmtDateTime, localParts, zoned } from "../../../time";
import { fromInputs, isOffice, toDateInput } from "../common";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const both = (ts: number) => fmtDateTime(ts, TZ_OFFICE, true) + " · " + fmtDateTime(ts, TZ_PH, true);

export default function BriefPanel({ pid }: { pid: string }) {
  const d = useDemo();
  const b = S.briefFor(d, pid);
  if (!b) return <Panel title="Drawing brief"><p className="j-small" style={{ margin: 0 }}>No drawing brief on this job. A draft brief is created when a job is converted from an accepted quote.</p></Panel>;
  if (b.status === "Draft") {
    const sig = [b.house, b.space, b.priorities, b.designNotes, b.references.join("|"), b.sheets.join("|"), b.scopeLimits, b.approverId].join("§");
    return <BriefDraft key={b.id + sig} b={b} />;
  }
  return <BriefIssued b={b} />;
}

function defaultDue(now: number, tz: string) {
  const p = localParts(addWorkingDays(now, 3, tz), tz);
  return zoned(p.y, p.m, p.d, 17, 0, tz);
}

function BriefDraft({ b }: { b: DrawingBrief }) {
  const d = useDemo();
  const office = isOffice(d);
  const [f, setF] = useState({
    house: b.house, space: b.space, priorities: b.priorities, designNotes: b.designNotes,
    references: b.references.join("\n"), sheets: b.sheets.join("\n"), scopeLimits: b.scopeLimits, approverId: b.approverId,
  });
  const ph = Object.values(d.staff).filter((s) => s.team === "Philippines");
  const [assignee, setAssignee] = useState(ph[0]?.id || "");
  const [target, setTarget] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  const patch: Partial<DrawingBrief> = { house: f.house, space: f.space, priorities: f.priorities, designNotes: f.designNotes, references: lines(f.references), sheets: lines(f.sheets), scopeLimits: f.scopeLimits, approverId: f.approverId };
  const merged: DrawingBrief = { ...b, ...patch };
  const missing = briefMissing(d, merged);
  const dirty = JSON.stringify(patch) !== JSON.stringify({ house: b.house, space: b.space, priorities: b.priorities, designNotes: b.designNotes, references: b.references, sheets: b.sheets, scopeLimits: b.scopeLimits, approverId: b.approverId });

  const mapReq = Object.values(d.requests).find((r) => r.projectId === b.projectId && (r.docType === "Site map" || r.label === "Site map") && (r.state === "Outstanding" || r.state === "Paused"));
  const chase = mapReq?.taskId ? d.tasks[mapReq.taskId] : undefined;
  const contact = mapReq ? d.contacts[mapReq.contactId] : undefined;

  const who = d.staff[assignee];
  const tz = who?.tz || TZ_PH;
  const due = (target && fromInputs(target, "17:00", tz)) || defaultDue(d.now, tz);

  const save = () => act.updateBrief(b.id, patch);
  const issue = () => {
    if (dirty) { const r = act.updateBrief(b.id, patch); if (!r.ok) return; }
    act.issueBrief(b.id, assignee, due);
  };
  const office_staff = Object.values(d.staff).filter((s) => s.team === "Mullingar");

  return (
    <Panel title="Drawing brief" sub={"Draft for " + S.drawingsFor(d, b.projectId).map((x) => x.number).join(", ") + ". The Philippines team receives it only when it is issued."}
      actions={<Badge tone={missing.length ? "warn" : "ok"} icon={missing.length ? "block" : "check"}>{missing.length ? missing.length + " required input" + (missing.length > 1 ? "s" : "") + " missing" : "Ready to issue"}</Badge>}>
      <div className="j-stack">
        {missing.length > 0 && (
          <div className="j-note warn jp-wrapb" role="status">
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Missing before the brief can be issued</div>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {missing.map((m) => (
                <li key={m}>
                  {m}
                  {m === "Site map" && (contact
                    ? <>: the client provides it. Responsible contact {contact.name} ({contact.role.toLowerCase()} contact, prefers {contact.channelPref}). {chase ? <>Chase task with {S.staffName(d, chase.assigneeId)}: <button type="button" className="j-link" onClick={() => openDetail({ kind: "task", id: chase.id })}>{chase.title}</button>, {chase.due < d.now ? "overdue since " : "due "}{fmtDateTime(chase.due)}.</> : null} {mapReq ? "Reminders sent: " + mapReq.remindersSent + " of " + mapReq.maxReminders + (mapReq.nextReminderAt ? ", next " + fmtDateTime(mapReq.nextReminderAt) : "") + "." : ""}</>
                    : <>: no request to the client is recorded yet.</>)}
                </li>
              ))}
            </ul>
          </div>
        )}
        {office ? (
          <>
            <div className="j-grid j-grid-2">
              <Field label="House type" htmlFor="bf-house"><input id="bf-house" className="j-input" value={f.house} onChange={set("house")} /></Field>
              <Field label="Approximate space needs" htmlFor="bf-space"><input id="bf-space" className="j-input" value={f.space} onChange={set("space")} /></Field>
            </div>
            <Field label="Client priorities" htmlFor="bf-pri"><textarea id="bf-pri" className="j-textarea" value={f.priorities} onChange={set("priorities")} /></Field>
            <Field label="Design notes" htmlFor="bf-notes"><textarea id="bf-notes" className="j-textarea" value={f.designNotes} onChange={set("designNotes")} /></Field>
            <div className="j-grid j-grid-2">
              <Field label="References" htmlFor="bf-ref" hint="One per line."><textarea id="bf-ref" className="j-textarea" value={f.references} onChange={set("references")} /></Field>
              <Field label="Requested sheets" htmlFor="bf-sheets" hint="One per line."><textarea id="bf-sheets" className="j-textarea" value={f.sheets} onChange={set("sheets")} /></Field>
            </div>
            <Field label="Scope limits" htmlFor="bf-scope" hint="What the drawing team should not do."><textarea id="bf-scope" className="j-textarea" value={f.scopeLimits} onChange={set("scopeLimits")} /></Field>
            <div className="j-grid j-grid-2">
              <Field label="Office approver" htmlFor="bf-appr">
                <select id="bf-appr" className="j-select" value={f.approverId} onChange={set("approverId")}>
                  <option value="">Choose</option>
                  {office_staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>
              <div className="j-actions" style={{ alignSelf: "end" }}>
                <Btn icon="check" onClick={save} disabled={!dirty}>{dirty ? "Save brief" : "Saved"}</Btn>
              </div>
            </div>
            <div className="j-divider" />
            <div className="j-grid j-grid-2">
              <Field label="Issue to (Philippines team)" htmlFor="bf-asg">
                <select id="bf-asg" className="j-select" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
                  {ph.map((s) => <option key={s.id} value={s.id}>{s.name}, {s.role.toLowerCase()}</option>)}
                </select>
              </Field>
              <Field label="Return target (Manila date, 17:00 local)" htmlFor="bf-due" hint={"Local target: " + fmtDateTime(due, tz, true) + " (" + fmtDateTime(due, TZ_OFFICE, true) + ")." + (target ? "" : " Default is 3 working days.")}>
                <input id="bf-due" type="date" className="j-input" value={target || toDateInput(due, tz)} onChange={(e) => setTarget(e.target.value)} />
              </Field>
            </div>
            <div className="j-actions">
              <Btn variant="primary" icon="send" onClick={issue} disabled={missing.length > 0 || !assignee}>Issue drawing brief</Btn>
              {missing.length > 0 && <span className="j-small j-ink-warn"><Icon name="block" size={12} style={{ verticalAlign: "-2px" }} /> Blocked until the missing inputs are in.</span>}
              {missing.length === 0 && dirty && <span className="j-small">Unsaved changes are saved when you issue.</span>}
            </div>
            <div className="j-small">Issuing creates one drawing task for the assignee and alerts their team (simulated). The accountable owner stays {S.staffName(d, d.projects[b.projectId].ownerId)}.</div>
          </>
        ) : (
          <KV items={[["House type", b.house || "Not set"], ["Space", b.space || "Not set"], ["Requested sheets", b.sheets.join(", ") || "Not set"], ["Scope limits", b.scopeLimits || "Not set"]]} />
        )}
      </div>
    </Panel>
  );
}

function BriefIssued({ b }: { b: DrawingBrief }) {
  const d = useDemo();
  const p = d.projects[b.projectId];
  const vers = S.versionsFor(d, b.drawingId);
  const reviewed = vers.filter((v) => v.reviewedAt).pop();
  const steps: [string, number | undefined][] = [
    ["Issued", b.issuedAt], ["Acknowledged", b.ackAt], ["In progress", b.startedAt], ["Submitted", b.submittedAt],
    ["Office review", b.status === "Released" ? reviewed?.reviewedAt || b.releasedAt : reviewed && reviewed.state === "Returned for correction" ? reviewed.reviewedAt : undefined],
    ["Released", b.releasedAt],
  ];
  const cur = steps.findIndex(([, t]) => !t);
  const task = b.taskId ? d.tasks[b.taskId] : undefined;
  const tone = b.status === "Released" ? "ok" : b.status === "Awaiting clarification" || b.status === "Returned for correction" ? "warn" : task && S.isOverdue(d, task) ? "bad" : "info";
  return (
    <Panel title="Drawing brief" sub={"Issued to " + S.staffName(d, b.assigneeId) + ". Times shown in Dublin and Manila."}
      actions={<Badge tone={tone} icon={tone === "ok" ? "check" : tone === "bad" ? "alert" : "clock"}>{b.status}{task && S.isOverdue(d, task) ? ", overdue" : ""}</Badge>}>
      <div className="j-stack">
        <KV items={[
          ["Assignee (does the drawing)", S.staffName(d, b.assigneeId) + (b.assigneeId ? ", " + d.staff[b.assigneeId]?.team : "")],
          ["Accountable owner (office)", S.staffName(d, p.ownerId)],
          ["Office approver", S.staffName(d, b.approverId)],
          ["Return target", b.due ? <><DateTag ts={b.due} tz={TZ_PH} showZone kind="Internal target" now={d.now} /><div className="j-cell-sub">{fmtDateTime(b.due, TZ_OFFICE, true)}</div></> : "Not set"],
        ]} />
        <ol className="jp-timeline" aria-label="Brief status timeline">
          {steps.map(([label, t], i) => (
            <li key={label} className={"jp-tl" + (t ? " done" : i === cur ? " cur" : "")}>
              <span className="jp-tl-dot"><Icon name={t ? "check" : i === cur ? "clock" : "info"} size={11} stroke={2.2} /></span>
              <div className="jp-tl-body">
                <div className="jp-tl-title">{label}</div>
                <div>{t ? both(t) : i === cur ? (label === "Office review" ? "Waiting for office QA" : "Current step, not yet recorded") : "Not reached"}</div>
              </div>
            </li>
          ))}
        </ol>
        {b.clarifications.length > 0 && (
          <div className="j-stack" style={{ gap: 6 }}>
            <div className="j-label">Clarifications</div>
            {b.clarifications.map((c) => (
              <div key={c.id} className={"j-note" + (c.resolved ? "" : " warn")}>
                <strong>{S.staffName(d, c.from)}</strong>, {both(c.at)}{c.resolved ? "" : " (open)"}<div>{c.text}</div>
              </div>
            ))}
          </div>
        )}
        {task && <div className="j-actions"><Btn size="sm" icon="eye" onClick={() => openDetail({ kind: "task", id: task.id })}>Open drawing task</Btn>{S.drawingsFor(d, p.id)[0] && <Btn size="sm" icon="layers" onClick={() => openDetail({ kind: "drawing", id: S.drawingsFor(d, p.id)[0].id })}>Open drawing</Btn>}</div>}
        <details className="jp-log"><summary>Brief contents</summary>
          <KV cols={1} items={[["House type", b.house], ["Space", b.space], ["Priorities", b.priorities], ["Design notes", b.designNotes || "None"], ["References", b.references.join(", ") || "None"], ["Sheets", b.sheets.join(", ")], ["Scope limits", b.scopeLimits]]} />
        </details>
      </div>
    </Panel>
  );
}
