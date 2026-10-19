/* Project record overview: stage and holder first, then the gate, client
   waiting items, decisions, planning records, the drawing brief, the site
   visit and (for office roles) the linked fee. */
import { useState } from "react";
import type { PlanningOutcome } from "../../../types";
import { act, gateFor, useDemo } from "../../../store";
import * as S from "../../../selectors";
import { openDetail } from "../../../ui";
import { stageDef } from "../../../template";
import { Badge, Btn, DateTag, Field, Icon, KV, Panel, type Tone } from "../../../kit";
import { ago, fmtDateTime } from "../../../time";
import { AdvanceStage, ReasonBadges, isExternal, isOffice } from "../common";
import BriefPanel from "./BriefPanel";

const OUTCOMES: PlanningOutcome[] = ["Granted", "Granted with conditions", "Refused", "Withdrawn", "Other"];
const OUTCOME_TONE: Record<PlanningOutcome, Tone> = { Granted: "ok", "Granted with conditions": "ok", Refused: "bad", Withdrawn: "neutral", Other: "info" };

export default function Overview({ id }: { id: string }) {
  const d = useDemo();
  const p = d.projects[id];
  const row = S.projectRows(d).find((r) => r.p.id === id);
  const holder = S.currentHolder(d, p);
  const office = isOffice(d);
  const sd = stageDef(p.stage);
  const days = S.stageAgeDays(d, p);
  const reasons = row?.reasons || [];

  return (
    <div className="j-stack">
      {id === "JMA-26025" && !d.keys["survey:JMA-26025"] && office && (
        <div className="j-note warn jp-bar-row">
          <span>Guided demo: the site visit, the client's site map and the brief meeting have not happened yet on this job.</span>
          <Btn icon="bolt" onClick={() => act.simulateSurveyAndBrief("JMA-26025")}>Simulate survey and brief completed (shortcut through elapsed work)</Btn>
        </div>
      )}

      <Panel title="Where this job is" actions={<Badge tone="neutral" icon="layers">Template {p.templateVersion}</Badge>}>
        <div className="j-stack">
          <KV cols={3} items={[
            ["Stage", sd.n + ". " + sd.name],
            ["Days in stage", days + (days === 1 ? " day" : " days") + ", since " + fmtDateTime(p.stageEnteredAt)],
            ["Target", <DateTag key="t" ts={p.nextTarget} kind={p.nextTargetKind} now={d.now} />],
            ["Next action", S.nextAction(d, p)],
            ["Accountable owner", S.staffName(d, p.ownerId) + " (answers for the job)"],
            ["Current holder", <span key="h">{holder.name}{holder.id !== p.ownerId ? <span className="j-cell-sub" style={{ display: "block" }}>Holds the work: {holder.why}</span> : <span className="j-cell-sub" style={{ display: "block" }}>Owner holds it</span>}</span>],
          ]} />
          <div className="jp-bar-row">
            <ReasonBadges reasons={reasons} />
            <button type="button" className="j-link" onClick={() => openDetail({ kind: "client", id: p.clientId })}>{S.household(d, id)} household, {p.locality}</button>
          </div>
          {p.note && !isExternal(d) && <div className="j-small">Office note: {p.note}</div>}
        </div>
      </Panel>

      <div className="j-grid j-grid-main">
        <div className="j-stack" style={{ gap: 16 }}>
          <GatePanel id={id} />
          {(["lodged", "fi", "decision"].includes(p.stage) || p.decision) && <DecisionPanel id={id} />}
          <CouncilPanel id={id} />
          <BriefPanel pid={id} />
        </div>
        <div className="j-stack" style={{ gap: 16 }}>
          {!isExternal(d) && <WaitingPanel id={id} />}
          <DecisionsPanel id={id} />
          <VisitPanel id={id} />
          {S.canSeeFees(d) && <FeesPanel id={id} />}
          <Panel title="ArcTech Pro" sub="Phase 2 candidate · connection not verified">
            <p className="j-small" style={{ margin: 0 }}>A possible link to the office's drawing software is being considered for a later phase. Nothing is connected in this demo and no ArcTech data is shown.</p>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function GatePanel({ id }: { id: string }) {
  const d = useDemo();
  const p = d.projects[id];
  const gates = gateFor(d, id);
  const done = gates.filter((g) => g.done).length;
  const office = isOffice(d);
  return (
    <Panel title={"Stage gate: " + stageDef(p.stage).name} sub={"Exit: " + stageDef(p.stage).exit + "."}
      actions={<Badge tone={done === gates.length ? "ok" : "warn"} icon={done === gates.length ? "check" : "clock"}>{done} of {gates.length} satisfied</Badge>}>
      <div className="j-stack">
        <div className="jp-gatelist">
          {gates.map((g) => g.source === "record" ? (
            <div key={g.key} className="jp-gaterow">
              <span className={"jp-gate-ico " + (g.done ? "done" : "todo")}><Icon name={g.done ? "check" : "clock"} size={12} stroke={2.2} /></span>
              <div style={{ minWidth: 0 }}>
                <div>{g.label}<span className="j-sr">{g.done ? " (satisfied)" : " (not satisfied)"}</span></div>
                <div className="jp-src">From records, not tickable{g.hint ? ": " + g.hint : ""}</div>
              </div>
            </div>
          ) : (
            <label key={g.key} className="jp-gaterow j-check" style={{ cursor: office ? "pointer" : "default" }}>
              <input type="checkbox" checked={g.done} disabled={!office} onChange={() => act.toggleCheck(id, g.key)} />
              <div style={{ minWidth: 0 }}>
                <div>{g.label}</div>
                <div className="jp-src">Manual checklist item{p.checks[g.key]?.at ? ", ticked " + fmtDateTime(p.checks[g.key]!.at!) + " by " + S.staffName(d, p.checks[g.key]!.by) : ""}{p.checks[g.key]?.note ? ". " + p.checks[g.key]!.note : ""}</div>
              </div>
            </label>
          ))}
        </div>
        <AdvanceStage pid={id} />
      </div>
    </Panel>
  );
}

function DecisionPanel({ id }: { id: string }) {
  const d = useDemo();
  const p = d.projects[id];
  const [outcome, setOutcome] = useState<PlanningOutcome>("Granted");
  const [cond, setCond] = useState("");
  const canRecord = isOffice(d) && ["lodged", "fi", "decision"].includes(p.stage);
  return (
    <Panel title="Planning decision" sub="A manual record of what the council decided. The system does not decide, predict or grant anything.">
      <div className="j-stack">
        {p.decision ? (
          <div className="j-stack" style={{ gap: 8 }}>
            <div className="j-row-wrap"><Badge tone={OUTCOME_TONE[p.decision.outcome]} icon={p.decision.outcome === "Refused" ? "alert" : p.decision.outcome.startsWith("Granted") ? "check" : "info"}>Recorded outcome: {p.decision.outcome}</Badge>
              <span className="j-small">Recorded {fmtDateTime(p.decision.at)} by {S.staffName(d, p.decision.by)}</span></div>
            {p.decision.conditions && <div className="j-note">Conditions: {p.decision.conditions}</div>}
            {p.decision.outcome === "Refused" && <div className="j-note warn">A refused outcome does not move the job on. Agree the next step with the client; any move needs an override with a reason.</div>}
          </div>
        ) : <p className="j-small" style={{ margin: 0 }}>No decision recorded yet. The decision date is set by the council and is not calculated here.</p>}
        {canRecord && (
          <div className="j-stack" style={{ gap: 10 }}>
            <div className="j-grid j-grid-2">
              <Field label="Outcome" htmlFor={"dec-o-" + id}>
                <select id={"dec-o-" + id} className="j-select" value={outcome} onChange={(e) => setOutcome(e.target.value as PlanningOutcome)}>
                  {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Conditions or notes" htmlFor={"dec-c-" + id} hint="Copy the council's wording where it applies.">
                <textarea id={"dec-c-" + id} className="j-textarea" style={{ minHeight: 60 }} value={cond} onChange={(e) => setCond(e.target.value)} />
              </Field>
            </div>
            <div className="j-actions"><Btn icon="check" onClick={() => { const r = act.recordDecision(id, outcome, cond); if (r.ok) setCond(""); }}>Record planning decision</Btn></div>
          </div>
        )}
      </div>
    </Panel>
  );
}

function CouncilPanel({ id }: { id: string }) {
  const d = useDemo();
  const crs = Object.values(d.council).filter((c) => c.projectId === id);
  if (!crs.length) return null;
  return (
    <>
      {crs.map((c) => {
        const doc = d.documents[c.docId];
        const tasks = Object.values(d.tasks).filter((t) => t.links.councilId === c.id);
        return (
          <Panel key={c.id} title={c.kind} sub={c.authority} actions={<Badge tone={c.state === "Response in preparation" ? "warn" : "info"} icon={c.state === "Response in preparation" ? "clock" : "check"}>{c.state}</Badge>}>
            <div className="j-stack">
              <KV items={[
                ["Reference", c.ref + " (illustrative)"],
                ["Received", fmtDateTime(c.receivedAt)],
                ["Internal target", <span key="i"><DateTag ts={c.internalTarget} kind="Internal target" now={d.now} /><span className="j-cell-sub" style={{ display: "block" }}>Sample, not a statutory calculation</span></span>],
                ["Recorded external date", <span key="e"><DateTag ts={c.externalDate} kind="Recorded external date" now={d.now} /><span className="j-cell-sub" style={{ display: "block" }}>Sample, not a statutory calculation. Recorded from correspondence, never calculated.</span></span>],
                ["Owner", S.staffName(d, c.ownerId)],
                ["Linked document", doc ? <button key="d" type="button" className="j-link" onClick={() => openDetail({ kind: "document", id: doc.id })}>{doc.name}</button> : "None"],
              ]} />
              <div className="j-small">{c.summary}</div>
              <div className="j-stack" style={{ gap: 6 }}>
                <div className="j-label">Response tasks</div>
                {tasks.map((t) => (
                  <div key={t.id} className="jp-bar-row">
                    <button type="button" className="j-link" onClick={() => openDetail({ kind: "task", id: t.id })}>{t.title}</button>
                    <span className="j-row-wrap"><span className="j-small">{S.staffName(d, t.assigneeId)}</span><Badge tone={t.state === "Done" ? "ok" : S.isOverdue(d, t) ? "bad" : "neutral"} icon={t.state === "Done" ? "check" : S.isOverdue(d, t) ? "alert" : "clock"}>{t.state}{S.isOverdue(d, t) ? ", overdue" : ""}</Badge><DateTag ts={t.due} now={d.now} /></span>
                  </div>
                ))}
              </div>
              <div className="j-note">Client wording: “We are preparing a response to a request for further information.” Recording a response as sent does not mean the council has accepted it.</div>
            </div>
          </Panel>
        );
      })}
    </>
  );
}

function WaitingPanel({ id }: { id: string }) {
  const d = useDemo();
  const items = S.waitingOnClients(d).filter((r) => r.projectId === id);
  return (
    <Panel title="Waiting on the client" sub={items.length ? items.length + " open item" + (items.length > 1 ? "s" : "") : undefined}>
      {items.length === 0 ? <p className="j-small" style={{ margin: 0 }}>Nothing outstanding from the client.</p> : (
        <div className="j-stack" style={{ gap: 8 }}>
          {items.map((r) => (
            <div key={r.id} className={"j-note" + (r.blocking ? " warn" : "")}>
              <div className="jp-reasons" style={{ marginBottom: 4 }}>
                {r.blocking ? <Badge tone="warn" icon="block">Blocks this stage</Badge> : <Badge tone="neutral" icon="clock">Not blocking</Badge>}
                {r.state === "Paused" && <Badge tone="neutral" icon="pause">Reminders paused</Badge>}
              </div>
              <div style={{ fontWeight: 600 }}>{r.label}</div>
              <div className="j-small">From {d.contacts[r.contactId]?.name}. Asked {ago(r.requestedAt, d.now)} by {S.staffName(d, r.ownerId)}. Reminders {r.remindersSent} of {r.maxReminders}{r.nextReminderAt ? ", next " + fmtDateTime(r.nextReminderAt) : ""}.</div>
              {r.taskId && d.tasks[r.taskId] && <button type="button" className="j-link" style={{ fontSize: 12 }} onClick={() => openDetail({ kind: "task", id: r.taskId! })}>Chase task: {d.tasks[r.taskId].title}</button>}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function DecisionsPanel({ id }: { id: string }) {
  const d = useDemo();
  const evs = S.visibleEvents(d).filter((e) => e.subject.kind === "project" && e.subject.id === id && ["stage.entered", "approval.recorded", "planning.decision", "drawing.released"].includes(e.type)).slice().sort((a, b) => b.at - a.at).slice(0, 6);
  return (
    <Panel title="Recent decisions" sub="Approvals, releases and stage moves.">
      {evs.length === 0 ? <p className="j-small" style={{ margin: 0 }}>None recorded yet.</p> : (
        <div className="j-list">
          {evs.map((e) => (
            <div key={e.id} className="j-list-item">
              <Icon name={e.type === "approval.recorded" ? "check" : e.type === "stage.entered" ? "arrow" : e.type === "drawing.released" ? "send" : "flag"} size={14} style={{ marginTop: 2, color: e.status === "attention" ? "var(--warn)" : "var(--dim)" }} />
              <div style={{ minWidth: 0 }}>
                <div className="j-text" style={{ fontSize: 13 }}>{e.summary}</div>
                <div className="j-cell-sub">{fmtDateTime(e.at)} · {e.actor.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function VisitPanel({ id }: { id: string }) {
  const d = useDemo();
  const vs = Object.values(d.visits).filter((v) => v.projectId === id);
  return (
    <Panel title="Site visit">
      {vs.length === 0 ? <p className="j-small" style={{ margin: 0 }}>No site visit recorded in the demo for this job.</p> : (
        <div className="j-stack" style={{ gap: 10 }}>
          {vs.map((v) => (
            <div key={v.id} className="j-stack" style={{ gap: 6 }}>
              <div className="j-row-wrap"><Badge tone={v.state === "Completed" ? "ok" : "info"} icon={v.state === "Completed" ? "check" : "calendar"}>{v.state}</Badge><DateTag ts={v.at} kind={v.state === "Scheduled" ? "Scheduled event" : "Visit date"} /></div>
              <div className="j-small">With {S.staffName(d, v.ownerId)}. {v.notes}</div>
              <div className="j-small">Outputs: {v.outputs.length ? v.outputs.map((o) => d.documents[o]?.name || o).join(", ") : "none yet. Survey notes and photos are added here after the visit."}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function FeesPanel({ id }: { id: string }) {
  const d = useDemo();
  const p = d.projects[id];
  const q = p.quoteId ? d.quotes[p.quoteId] : undefined;
  return (
    <Panel title="Fee" sub="Office roles only.">
      {q ? (
        <KV cols={1} items={[
          ["Linked quote " + q.id, S.euro(q.amount) + " · Demo fee · tax treatment to confirm"],
          ["Quote status", q.status],
          ["Deposit", S.euro(q.deposit.amount) + ": " + q.deposit.status + (q.deposit.waivedReason ? " (" + q.deposit.waivedReason + ")" : "")],
        ]} />
      ) : <p className="j-small" style={{ margin: 0 }}>No quote record is linked in the demo. This job was accepted before records began; the signed quote is held as a document reference.</p>}
    </Panel>
  );
}
