/* Shared pieces for the Projects module: attention badges, the stage-advance
   control with its controlled override, and small date helpers. */
import { useState } from "react";
import type { DemoState, Project, StageDef } from "../../types";
import { act, gateFor, useDemo } from "../../store";
import * as S from "../../selectors";
import { STAGES, stageIndex, stageDef } from "../../template";
import { Badge, Btn, Dialog, Field, Icon, type Tone } from "../../kit";
import { TZ_OFFICE, localParts, zoned } from "../../time";

export const isOffice = (d: DemoState) => d.persona.kind === "admin" || d.persona.kind === "mullingar";
export const isExternal = (d: DemoState) => d.persona.kind === "philippines" || d.persona.kind === "client";

const REASON: Record<S.Reason["kind"], { tone: Tone; icon: string; label: string }> = {
  overdue: { tone: "bad", icon: "clock", label: "Overdue" },
  blocked: { tone: "warn", icon: "block", label: "Blocked" },
  deadline: { tone: "warn", icon: "calendar", label: "Deadline" },
  conflict: { tone: "bad", icon: "alert", label: "Conflict" },
};

export function ReasonBadges({ reasons, compact }: { reasons: S.Reason[]; compact?: boolean }) {
  if (!reasons.length) return <div className="jp-reasons"><Badge tone="ok" icon="check">On track</Badge></div>;
  const shown = compact ? reasons.slice(0, 2) : reasons;
  return (
    <div className="jp-reasons">
      {shown.map((r, i) => <Badge key={i} tone={REASON[r.kind].tone} icon={REASON[r.kind].icon}>{REASON[r.kind].label}: {r.text}</Badge>)}
      {compact && reasons.length > 2 && <Badge tone="neutral" icon="info">{reasons.length - 2} more</Badge>}
    </div>
  );
}

/** The stage the store would move this job to next (mirrors act.advanceStage). */
export function nextStageFor(p: Project): StageDef | undefined {
  let next: StageDef | undefined = STAGES[stageIndex(p.stage) + 1];
  while (next && (next.key === "fi" || (next.key === "commencement" && !p.scope.commencement) || (next.scoped && !p.scope.planning && next.key !== "commencement"))) next = STAGES[stageIndex(next.key) + 1];
  return next;
}

export function GateProgress({ pid }: { pid: string }) {
  const d = useDemo();
  const g = gateFor(d, pid);
  const done = g.filter((x) => x.done).length;
  return (
    <div className="jp-gate" aria-label={"Stage gate: " + done + " of " + g.length + " items satisfied"}>
      <div className="j-small">Gate {done} of {g.length}{done === g.length ? ", ready to move" : ""}</div>
      {g.map((x) => (
        <div key={x.key} className={"jp-gate-item " + (x.done ? "done" : "todo")}>
          <Icon name={x.done ? "check" : "clock"} size={12} stroke={2.2} style={{ marginTop: 2 }} />
          <span>{x.label}{!x.done && x.hint ? " (" + x.hint + ")" : ""}</span>
        </div>
      ))}
    </div>
  );
}

/** "Move to next stage" with a controlled override that needs a reason. */
export function AdvanceStage({ pid, size = "md", primary = true }: { pid: string; size?: "sm" | "md"; primary?: boolean }) {
  const d = useDemo();
  const p = d.projects[pid];
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  if (!p) return null;
  if (isExternal(d)) return <span className="j-small">Stage moves are made by office staff.</span>;
  const next = nextStageFor(p);
  if (!next) return <Badge tone="neutral" icon="flag">Final stage</Badge>;
  const missing = gateFor(d, pid).filter((g) => !g.done);
  const outcomeHold = p.stage === "decision" && !!p.decision && ["Refused", "Withdrawn", "Other"].includes(p.decision.outcome);
  const needsOverride = missing.length > 0 || outcomeHold;
  const canOverride = isOffice(d);

  const move = () => {
    const r = act.advanceStage(pid);
    if (!r.ok && needsOverride && canOverride) { setReason(""); setErr(""); setOpen(true); }
  };
  const confirm = () => {
    if (!reason.trim()) { setErr("Give a reason. It is saved in the project history."); return; }
    const r = act.advanceStage(pid, reason.trim());
    if (r.ok) setOpen(false); else setErr(r.message);
  };

  return (
    <>
      <div className="j-actions">
        <Btn variant={primary ? "primary" : "secondary"} size={size} icon="arrow" onClick={move}>Move to {next.name}</Btn>
        {needsOverride && canOverride && <Btn variant="ghost" size={size} icon="shield" onClick={() => { setReason(""); setErr(""); setOpen(true); }}>Override with reason</Btn>}
      </div>
      <Dialog open={open} onClose={() => setOpen(false)} title={"Override the stage gate for " + pid}
        footer={<><Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn><Btn variant="danger" icon="shield" onClick={confirm}>Move with override</Btn></>}>
        <p className="j-text" style={{ margin: 0 }}>
          This moves {pid} {S.household(d, pid)} from {stageDef(p.stage).name} to {next.name} even though the gate is not satisfied.
        </p>
        {missing.length > 0 && (
          <div className="j-note warn">
            <strong>Not satisfied:</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{missing.map((m) => <li key={m.key}>{m.label}{m.hint ? " (" + m.hint + ")" : ""}</li>)}</ul>
          </div>
        )}
        {outcomeHold && <div className="j-note warn">The recorded planning outcome is {p.decision!.outcome.toLowerCase()}. Record the agreed next step in the reason.</div>}
        <Field label="Reason for the override" htmlFor={"ovr-" + pid} error={err} hint="Saved with your name in the stage history and the activity log.">
          <textarea id={"ovr-" + pid} className="j-textarea" value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} data-autofocus />
        </Field>
        <div className="j-small">Nothing is lodged, submitted or sent by moving a stage.</div>
      </Dialog>
    </>
  );
}

/* Date inputs work in Dublin (or a named zone) wall-clock time. */
export function toDateInput(ts: number, tz: string = TZ_OFFICE) {
  const p = localParts(ts, tz);
  return p.y + "-" + String(p.m).padStart(2, "0") + "-" + String(p.d).padStart(2, "0");
}
export function toTimeInput(ts: number, tz: string = TZ_OFFICE) {
  const p = localParts(ts, tz);
  return String(p.h).padStart(2, "0") + ":" + String(p.min).padStart(2, "0");
}
export function fromInputs(date: string, time: string, tz: string = TZ_OFFICE): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date); if (!m) return null;
  const t = /^(\d{2}):(\d{2})$/.exec(time || "17:00"); if (!t) return null;
  return zoned(+m[1], +m[2], +m[3], +t[1], +t[2], tz);
}

export const ACTOR_LABEL: Record<string, string> = { staff: "Staff", client: "Client", agent: "Simulated agent", system: "System", integration: "Integration (simulated)" };
export const ACTOR_TONE: Record<string, Tone> = { staff: "info", client: "info", agent: "neutral", system: "neutral", integration: "neutral" };
