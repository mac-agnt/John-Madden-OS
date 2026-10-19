/* Shared pieces for the Drawings module: status wording, visibility labels, the
   office QA checklist and the drawing-team brief actions. Everything reads the
   one demo store and changes it only through act.* */
import { useState } from "react";
import type { DemoState, Drawing, DrawingBrief, DrawingVersion, ID, Task, VersionState } from "../../types";
import { act, useDemo } from "../../store";
import * as S from "../../selectors";
import { Badge, Btn, Field, Icon, KV, type Tone } from "../../kit";
import { TZ_OFFICE, TZ_PH, dueLabel, fmtDateTime } from "../../time";

export const isOffice = (d: DemoState) => d.persona.kind === "admin" || d.persona.kind === "mullingar";

export const QA_ITEMS: { key: string; label: string }[] = [
  { key: "brief", label: "Matches the brief" },
  { key: "rooms", label: "Rooms, sheet set and dimensions labelled" },
  { key: "titleblock", label: "Title block, drawing number and revision correct" },
  { key: "scope", label: "Within the agreed scope limits" },
];

export const RELEASE_NOTE = "Uploading alone never makes a drawing client-visible. Release is a workflow sign-off by the office, not proof of regulatory compliance.";

export function versionLabel(state: VersionState): string {
  return state === "Superseded" ? "Superseded for current review" : state;
}
const VTONE: Record<VersionState, [Tone, string]> = {
  "In office review": ["warn", "clock"],
  "Returned for correction": ["bad", "back"],
  Released: ["ok", "check"],
  Superseded: ["neutral", "layers"],
};
export function VersionBadge({ v }: { v: DrawingVersion }) {
  const [tone, icon] = VTONE[v.state];
  return <Badge tone={tone} icon={icon}>{versionLabel(v.state)}</Badge>;
}

/** Who can see a version. Only a released version (and its superseded history) reaches the client. */
export function visibilityOf(v: DrawingVersion): { label: string; icon: string; tone: Tone; note: string } {
  if (v.state === "Released") return { label: "Client-visible", icon: "eye", tone: "accent", note: "Released by the office. The client sees this revision in the portal." };
  if (v.state === "Superseded") return { label: "Client history only", icon: "eye", tone: "neutral", note: "Released earlier and now replaced. The client can still see it as history." };
  return { label: "Internal only", icon: "lock", tone: "neutral", note: "Not visible to the client. Only an office release can change that." };
}
export function VisibilityBadge({ v }: { v: DrawingVersion }) {
  const x = visibilityOf(v);
  return <Badge tone={x.tone} icon={x.icon}>{x.label}</Badge>;
}

const BTONE: Record<DrawingBrief["status"], [Tone, string]> = {
  Draft: ["neutral", "edit"], Issued: ["info", "send"], Acknowledged: ["info", "check"], "In progress": ["accent", "play"],
  "Awaiting clarification": ["warn", "pause"], Submitted: ["ok", "upload"], "In office review": ["warn", "clock"],
  "Returned for correction": ["bad", "back"], Released: ["ok", "check"],
};
export function BriefBadge({ status }: { status: DrawingBrief["status"] }) {
  const [tone, icon] = BTONE[status];
  return <Badge tone={tone} icon={icon}>{status}</Badge>;
}

export const fileName = (dw: Drawing, v: DrawingVersion) => dw.number + "-rev-" + v.rev + ".svg";
export const briefOf = (d: DemoState, drawingId: ID): DrawingBrief | undefined => Object.values(d.briefs).find((b) => b.drawingId === drawingId);
export const versionsNewestFirst = (d: DemoState, drawingId: ID) => S.versionsFor(d, drawingId).slice().reverse();
export const amendmentsOnDrawing = (d: DemoState, drawingId: ID) =>
  Object.values(d.amendments).filter((a) => d.versions[a.versionId]?.drawingId === drawingId).sort((a, b) => a.createdAt - b.createdAt);

/** Client-facing approval position of a drawing, from its records. */
export type ApprovalKey = "none" | "review" | "awaiting" | "changes" | "approved";
export function approvalState(d: DemoState, dw: Drawing): { key: ApprovalKey; label: string; tone: Tone; icon: string } {
  const rel = S.latestReleased(d, dw.id);
  const up = S.latestUploaded(d, dw.id);
  if (!rel) {
    if (up && up.state === "In office review") return { key: "review", label: "Not issued: Rev " + up.rev + " in office review", tone: "warn", icon: "clock" };
    return { key: "none", label: up ? "Not issued" : "No revision yet", tone: "neutral", icon: "info" };
  }
  const ap = S.approvalFor(d, rel.id);
  if (ap) return { key: "approved", label: "Approved Rev " + rel.rev, tone: "ok", icon: "check" };
  const open = amendmentsOnDrawing(d, dw.id).filter((a) => a.state !== "Released");
  if (open.length) return { key: "changes", label: "Changes requested (" + open.length + ")", tone: "warn", icon: "edit" };
  return { key: "awaiting", label: "Awaiting client on Rev " + rel.rev, tone: "info", icon: "clock" };
}

/** Open work on a drawing: amendment, QA or drawing task, earliest due first. */
export function openWorkFor(d: DemoState, dw: Drawing): Task | undefined {
  const vids = new Set(S.versionsFor(d, dw.id).map((v) => v.id));
  const brief = briefOf(d, dw.id);
  return Object.values(d.tasks).filter((t) => S.isOpen(t) && (
    (t.links.versionId && vids.has(t.links.versionId)) ||
    (t.links.amendmentId && vids.has(d.amendments[t.links.amendmentId]?.versionId || "")) ||
    (brief && t.links.briefId === brief.id)
  )).sort((a, b) => a.due - b.due)[0];
}

/** A time in Manila and Dublin, stacked. */
export function BothZones({ ts, first = TZ_PH }: { ts?: number; first?: string }) {
  if (ts == null) return <span className="j-dim">Not yet</span>;
  const second = first === TZ_PH ? TZ_OFFICE : TZ_PH;
  return (
    <span className="jd-zones">
      <span>{fmtDateTime(ts, first, true)}</span>
      <span className="jd-z2">{fmtDateTime(ts, second, true)}</span>
    </span>
  );
}

/** Overdue state as text plus icon, never colour alone. */
export function DueState({ d, task }: { d: DemoState; task?: Task }) {
  if (!task) return <Badge tone="neutral" icon="info">No open task</Badge>;
  if (task.state === "Done") return <Badge tone="ok" icon="check">Complete</Badge>;
  if (task.state === "Paused") return <Badge tone="warn" icon="pause">{"On hold: " + (task.pauseReason || "paused").toLowerCase()}</Badge>;
  if (S.isOverdue(d, task)) return <Badge tone="bad" icon="alert">{dueLabel(task.due, d.now, d.staff[task.assigneeId]?.tz || TZ_OFFICE)}</Badge>;
  return <Badge tone="ok" icon="clock">{"On track: " + dueLabel(task.due, d.now, d.staff[task.assigneeId]?.tz || TZ_OFFICE).toLowerCase()}</Badge>;
}

/* ── Office QA checklist, release and return ── */
export function QaChecklist({ v }: { v: DrawingVersion }) {
  const d = useDemo();
  const [returning, setReturning] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const office = isOffice(d);
  const dw = d.drawings[v.drawingId];
  const done = QA_ITEMS.filter((i) => v.qa[i.key]).length;
  const all = done === QA_ITEMS.length;
  const noteId = "qa-note-" + v.id;
  if (v.state !== "In office review") return null;
  return (
    <div className="j-stack">
      <fieldset className="jd-qa">
        <legend className="j-h3">Office QA checklist for {dw.number} Rev {v.rev} <span className="j-faint">({done} of {QA_ITEMS.length})</span></legend>
        {QA_ITEMS.map((i) => (
          <label key={i.key} className="j-check" htmlFor={"qa-" + v.id + "-" + i.key}>
            <input id={"qa-" + v.id + "-" + i.key} type="checkbox" checked={!!v.qa[i.key]} disabled={!office} onChange={(e) => act.setQa(v.id, i.key, e.target.checked)} />
            <span>{i.label}</span>
          </label>
        ))}
      </fieldset>
      <div className="j-note"><Icon name="shield" size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{RELEASE_NOTE}</div>
      {!office && <div className="j-small">Only office staff can release or return a drawing.</div>}
      {office && (
        <div className="j-row-wrap">
          <Btn variant="primary" icon="send" disabled={!all} onClick={() => act.releaseVersion(v.id)} title={all ? undefined : "Tick every check first"}>Release to client</Btn>
          <Btn icon="back" onClick={() => { setReturning((x) => !x); setErr(""); }} pressed={returning}>Return for correction</Btn>
          {!all && <span className="j-small">Tick all four checks to release.</span>}
        </div>
      )}
      {office && returning && (
        <div className="j-stack">
          <Field label="What needs correcting" htmlFor={noteId} error={err} hint="Goes to the drawing team in the brief thread. The client sees nothing.">
            <textarea id={noteId} className="j-textarea" value={note} onChange={(e) => { setNote(e.target.value); if (e.target.value.trim()) setErr(""); }} placeholder="For example: revision letter missing from the title block." />
          </Field>
          <div className="j-row-wrap">
            <Btn variant="danger" icon="back" onClick={() => {
              if (!note.trim()) { setErr("Add a note so the drawing team knows what to fix."); return; }
              const r = act.returnForCorrection(v.id, note);
              if (r.ok) { setNote(""); setReturning(false); }
            }}>Confirm return</Btn>
            <Btn variant="ghost" onClick={() => { setReturning(false); setErr(""); }}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Drawing-team actions on their own brief ── */
export function nextRev(d: DemoState, drawingId: ID) {
  const vers = S.versionsFor(d, drawingId);
  return String.fromCharCode(65 + vers.filter((v) => /^[A-Z]$/.test(v.rev)).length);
}
export function BriefActions({ brief }: { brief: DrawingBrief }) {
  const d = useDemo();
  const [ask, setAsk] = useState(false);
  const [q, setQ] = useState("");
  const [qErr, setQErr] = useState("");
  const [submit, setSubmit] = useState(false);
  const [summary, setSummary] = useState("");
  const [sErr, setSErr] = useState("");
  const mine = d.persona.kind === "philippines" && brief.assigneeId === d.persona.staffId;
  if (!mine) return null;
  const rev = nextRev(d, brief.drawingId);
  const pending = S.versionsFor(d, brief.drawingId).find((v) => v.state === "In office review");
  const canSubmit = (brief.status === "In progress" || brief.status === "Returned for correction") && !pending;
  const qid = "clar-" + brief.id, sid = "sum-" + brief.id;
  return (
    <div className="j-stack">
      <div className="j-row-wrap">
        {brief.status === "Issued" && <Btn variant="primary" icon="check" onClick={() => act.acknowledgeBrief(brief.id)}>Acknowledge brief</Btn>}
        {(brief.status === "Acknowledged" || brief.status === "Awaiting clarification") && <Btn variant={brief.status === "Acknowledged" ? "primary" : "secondary"} icon="play" onClick={() => act.startBrief(brief.id)}>{brief.status === "Awaiting clarification" ? "Resume drawing" : "Start drawing"}</Btn>}
        {brief.status !== "Submitted" && brief.status !== "Released" && <Btn icon="chat" pressed={ask} onClick={() => { setAsk((x) => !x); setQErr(""); }}>Ask clarification</Btn>}
        {canSubmit && <Btn variant="primary" icon="upload" pressed={submit} onClick={() => { setSubmit((x) => !x); setSErr(""); if (!summary) setSummary(rev === "A" ? "First concept layout for review." : "Corrected revision following the office return note."); }}>{"Load sample Rev " + rev}</Btn>}
      </div>
      {brief.status === "Acknowledged" && <div className="j-small">Start the drawing before you load a revision.</div>}
      {pending && <div className="j-small"><Icon name="clock" size={12} style={{ verticalAlign: "-2px" }} /> Rev {pending.rev} is waiting for office review. It is not visible to the client.</div>}
      {ask && (
        <div className="j-stack">
          <Field label="Question for the office" htmlFor={qid} error={qErr} hint="Pauses the return forecast until the office answers.">
            <textarea id={qid} className="j-textarea" value={q} onChange={(e) => setQ(e.target.value)} placeholder="For example: should the utility have its own external door?" />
          </Field>
          <div className="j-row-wrap">
            <Btn variant="primary" icon="send" onClick={() => { if (!q.trim()) { setQErr("Type the question first."); return; } const r = act.askClarification(brief.id, q); if (r.ok) { setQ(""); setAsk(false); } }}>Send question</Btn>
            <Btn variant="ghost" onClick={() => setAsk(false)}>Cancel</Btn>
          </div>
        </div>
      )}
      {submit && canSubmit && (
        <div className="j-stack">
          <div className="j-note">Simulated upload: this loads the demo sample sheet as Rev {rev}. It goes to office review only and is not shown to the client.</div>
          <Field label="Change summary" htmlFor={sid} error={sErr}>
            <textarea id={sid} className="j-textarea" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </Field>
          <div className="j-row-wrap">
            <Btn variant="primary" icon="upload" onClick={() => {
              if (!summary.trim()) { setSErr("Add a short change summary."); return; }
              const r = act.submitVersion(brief.drawingId, { summary });
              if (r.ok) setSubmit(false);
            }}>{"Submit Rev " + rev + " for office review"}</Btn>
            <Btn variant="ghost" onClick={() => setSubmit(false)}>Cancel</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Brief summary ── */
export function lastReturnNote(b: DrawingBrief) {
  const c = b.clarifications.filter((x) => /^Returned Rev /.test(x.text)).pop();
  return c?.text;
}

export function BriefSummary({ brief }: { brief: DrawingBrief }) {
  return (
    <KV cols={2} items={[
      ["House", brief.house || "Not set"],
      ["Space needs", brief.space || "Not set"],
      ["Priorities", brief.priorities || "Not set"],
      ["Design notes", brief.designNotes || "None"],
      ["Sheets", brief.sheets.join(", ") || "None"],
      ["Scope limits", brief.scopeLimits || "Not set"],
      ["References", brief.references.join(", ") || "None"],
      ["Status", brief.status],
    ]} />
  );
}

