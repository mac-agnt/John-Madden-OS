/* Dashboard: the owner's read of the practice. Every figure comes from the
   selectors and opens the records behind it. The four executive KPIs sit in
   DashboardKpiBand above this page and are not repeated here. */
import { useState } from "react";
import type { DemoState, LeadSource, StageKey, Task } from "../types";
import { useDemo } from "../store";
import * as S from "../selectors";
import { MODULES, openDetail, tabOf, tabsFor, useUi } from "../ui";
import { Avatar, Badge, Btn, DateTag, Empty, Icon, Page, PageHead, Panel, type Tone } from "../kit";
import { TZ_PH, calendarDaysBetween, fmtDate, fmtDateTime, localParts } from "../time";
import { stageDef } from "../template";
import TaskList from "./ops/TaskList";
import { Bar, LinkBtn, RowMain, clickRow, goTo, median, nd, round1 } from "./ops/shared";

const REASON: Record<S.Reason["kind"], { tone: Tone; icon: string; label: string }> = {
  overdue: { tone: "bad", icon: "alert", label: "Overdue" },
  blocked: { tone: "bad", icon: "block", label: "Blocked" },
  deadline: { tone: "warn", icon: "clock", label: "Deadline risk" },
  conflict: { tone: "warn", icon: "calendar", label: "Programme conflict" },
};

export default function DashboardPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Dashboard")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Dashboard")) ? tabOf("Dashboard") : tabs[0].id;
  return (
    <Page>
      {tab === "executive" && <Executive d={d} />}
      {tab === "delivery" && <Delivery d={d} />}
      {tab === "workload" && <Workload d={d} />}
      {tab === "sales" && <Sales d={d} />}
    </Page>
  );
}

/* ── Executive ── */
function Executive({ d }: { d: DemoState }) {
  const [stage, setStage] = useState<string>("all");
  const rows = S.projectRows(d);
  const shown = stage === "all" ? rows : rows.filter((r) => r.p.stage === stage);
  const counts = S.stageCounts(d);
  const max = Math.max(1, ...counts.map((c) => c.count));
  const att = S.attention(d);
  const queue = [...S.philippinesQueue(d)].sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.task?.due || 0) - (b.task?.due || 0));
  return (
    <>
      <div className="jo-two">
        <Panel title="Needs attention, ranked" sub="Overdue work first, then blocked work, programme conflicts and deadline risk. Needs attention is wider than overdue." flush>
          {att.length === 0 ? <Empty title="Nothing flagged" body="No overdue, blocked, conflicting or deadline-risk work on live projects." /> : (
            <div className="j-list" style={{ padding: "0 20px 8px" }}>
              {att.map((a, i) => {
                const taskIds = Array.from(new Set(a.reasons.map((r) => r.taskId).filter((x): x is string => !!x)));
                return (
                  <div key={a.project.id} className="j-list-item">
                    <span className="jo-rank" aria-label={"Rank " + (i + 1)}>{i + 1}</span>
                    <div className="jo-grow">
                      <div className="j-cell-main">{a.project.id} · {S.household(d, a.project.id)}, {a.project.locality}</div>
                      <div className="j-cell-sub">{stageDef(a.project.stage).name} · owner {S.staffName(d, a.project.ownerId)}</div>
                      <div className="jo-reasons">
                        {a.reasons.map((r, k) => (
                          <div key={k} className="jo-reason"><Badge tone={REASON[r.kind].tone} icon={REASON[r.kind].icon}>{REASON[r.kind].label}</Badge><span>{nd(r.text)}</span></div>
                        ))}
                      </div>
                      <div className="j-row-wrap" style={{ marginTop: 8 }}>
                        <Btn size="sm" onClick={() => openDetail({ kind: "project", id: a.project.id })}>Open project</Btn>
                        {taskIds.map((tid) => <Btn key={tid} size="sm" variant="ghost" icon="arrow" onClick={() => openDetail({ kind: "task", id: tid })}>Open task</Btn>)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Philippines queue" sub={"Active drawing assignments, overdue first. Targets in Manila time (Dublin is " + (localOffsetNote(d)) + ")."}
          actions={<Btn size="sm" variant="ghost" icon="arrow" onClick={() => goTo("Drawings", "queue")}>Open queue</Btn>} flush>
          {queue.length === 0 ? <Empty title="No active assignments" /> : (
            <div className="j-tablewrap">
              <table className="j-table">
                <thead><tr><th>Project</th><th>Assignee</th><th>Due (Manila)</th></tr></thead>
                <tbody>
                  {queue.map((q) => {
                    const open = () => (q.task ? openDetail({ kind: "task", id: q.task.id }) : openDetail({ kind: "drawing", id: q.brief.drawingId }));
                    return (
                      <tr key={q.brief.id} {...clickRow(open)}>
                        <td>
                          <RowMain onClick={open}>{q.project.id} · {S.household(d, q.project.id)}</RowMain>
                          <div className="j-cell-sub">{q.brief.status}</div>
                        </td>
                        <td>{S.staffName(d, q.brief.assigneeId)}</td>
                        <td>
                          {q.task ? <DateTag ts={q.task.due} tz={q.assigneeTz} showZone now={d.now} /> : <span className="j-dim">No task</span>}
                          {q.overdue && <div className="jo-late">Overdue</div>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <div className="jo-aside">
        <Panel title="Live jobs" sub={stage === "all" ? "Every live project. Select a row to open the project." : "Filtered to " + stageDef(stage as StageKey).name + ": " + shown.length + " of " + rows.length + "."}
          actions={stage !== "all" ? <Btn size="sm" icon="x" onClick={() => setStage("all")}>Clear stage filter</Btn> : undefined} flush>
          {shown.length === 0 ? <Empty title="No live jobs in this stage" action={<Btn size="sm" onClick={() => setStage("all")}>Show all stages</Btn>} /> : (
            <div className="j-tablewrap">
              <table className="j-table">
                <thead>
                  <tr><th>Project / client</th><th>Locality</th><th>Stage</th><th>Accountable owner</th><th>Current task holder</th><th>Days in stage</th><th>Next action</th><th>Target</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {shown.map((r) => {
                    const open = () => openDetail({ kind: "project", id: r.p.id });
                    return (
                      <tr key={r.p.id} {...clickRow(open)}>
                        <td><RowMain onClick={open} label={"Open " + r.p.id}>{r.p.id}</RowMain><div className="j-cell-sub">{r.household}</div></td>
                        <td>{r.p.locality}</td>
                        <td style={{ minWidth: 130 }}>{r.stageName}</td>
                        <td>{r.owner}</td>
                        <td style={{ minWidth: 140 }}><div className="j-cell-main">{r.holder}</div><div className="j-cell-sub">{nd(r.holderWhy)}</div></td>
                        <td className="jo-num">{r.days} {r.days === 1 ? "day" : "days"}</td>
                        <td style={{ minWidth: 180 }}>{nd(r.next)}</td>
                        <td><DateTag ts={r.target} kind={r.targetKind} now={d.now} /></td>
                        <td>
                          <div className="j-row-wrap" style={{ gap: 4 }}>
                            {Array.from(new Set(r.reasons.map((x) => x.kind))).map((k) => <Badge key={k} tone={REASON[k].tone} icon={REASON[k].icon}>{REASON[k].label}</Badge>)}
                            {!r.reasons.length && (r.ready ? <Badge tone="ok" icon="check">Gate ready</Badge> : <Badge tone="neutral" icon="info">No flags</Badge>)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <div className="jo-sticky">
          <Panel title="Stage distribution" sub="Live projects per stage. Select a stage to filter the table.">
            <div className="jo-bars">
              {counts.map((c) => (
                <Bar key={c.stage.key} label={c.stage.n + ". " + c.stage.name} count={c.count} max={max} on={stage === c.stage.key}
                  onClick={() => setStage(stage === c.stage.key ? "all" : c.stage.key)} />
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function localOffsetNote(d: DemoState) {
  const diff = (localParts(d.now, TZ_PH).h - localParts(d.now).h + 24) % 24;
  return diff + " hours behind";
}

/* ── Delivery ── */
const BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "0 to 6 days", min: 0, max: 6 },
  { label: "7 to 13 days", min: 7, max: 13 },
  { label: "14 to 20 days", min: 14, max: 20 },
  { label: "21 days or more", min: 21, max: Infinity },
];

function Delivery({ d }: { d: DemoState }) {
  const [bucket, setBucket] = useState<number | null>(null);
  const rows = S.projectRows(d);
  const inBucket = (i: number) => rows.filter((r) => r.days >= BUCKETS[i].min && r.days <= BUCKETS[i].max);
  const bmax = Math.max(1, ...BUCKETS.map((_, i) => inBucket(i).length));

  const blocked = Object.values(d.requests).filter((r) => r.blocking && r.state === "Outstanding" && d.projects[r.projectId]?.status === "Live");
  const paused = S.openTasks(d).filter((t) => t.state === "Paused");
  const clar = Object.values(d.briefs).filter((b) => b.status === "Awaiting clarification");

  const measured = rows.filter((r) => r.reasons.some((x) => x.kind === "blocked") || r.overdueCount > 0);
  const blockedDays = (pid: string) => { const r = blocked.find((x) => x.projectId === pid); return r ? calendarDaysBetween(r.requestedAt, d.now) : null; };
  const overdueDays = (pid: string) => { const ts = S.overdueTasks(d).filter((t) => t.projectId === pid); return ts.length ? Math.max(...ts.map((t) => calendarDaysBetween(t.due, d.now))) : null; };

  const counts = S.stageCounts(d).filter((c) => c.count);
  const busiest = [...counts].sort((a, b) => b.count - a.count)[0];
  const ages = counts.map((c) => { const rs = rows.filter((r) => r.p.stage === c.stage.key); return { stage: c.stage, avg: rs.reduce((n, r) => n + r.days, 0) / rs.length }; }).sort((a, b) => b.avg - a.avg);
  const oldest = ages[0];
  const blockedStages = Array.from(new Set(blocked.map((r) => stageDef(d.projects[r.projectId].stage).name)));

  const handoffs = Object.values(d.briefs).filter((b) => b.issuedAt && b.assigneeId).map((b) => {
    const first = S.versionsFor(d, b.drawingId)[0];
    return { b, ackH: b.ackAt ? (b.ackAt - b.issuedAt!) / 3600000 : null, retD: first && first.uploadedAt >= b.issuedAt! ? calendarDaysBetween(b.issuedAt!, first.uploadedAt) : null, first };
  }).sort((a, b) => (a.b.issuedAt || 0) - (b.b.issuedAt || 0));
  const ackMed = median(handoffs.map((h) => h.ackH).filter((x): x is number => x != null));
  const retMed = median(handoffs.map((h) => h.retD).filter((x): x is number => x != null));
  const earliest = handoffs[0]?.b.issuedAt;

  return (
    <>
      <PageHead title="Delivery" sub="How long work sits, what is blocked and how drawing handoffs run. Stage age, time blocked and task overdue are three separate measures." />
      <div className="jo-two">
        <Panel title="Stage age" sub="Live projects by calendar days in their current stage, demo clock. Select a band to list the projects.">
          <div className="jo-bars">
            {BUCKETS.map((b, i) => <Bar key={b.label} label={b.label} count={inBucket(i).length} max={bmax} on={bucket === i} onClick={() => setBucket(bucket === i ? null : i)} />)}
          </div>
          {bucket != null && (
            <div className="j-list" style={{ marginTop: 10 }}>
              {inBucket(bucket).length === 0 ? <div className="j-small">No projects in this band.</div> : inBucket(bucket).map((r) => (
                <div key={r.p.id} className="j-list-item">
                  <div className="jo-grow"><LinkBtn onClick={() => openDetail({ kind: "project", id: r.p.id })}>{r.p.id} · {r.household}</LinkBtn><div className="j-cell-sub">{r.stageName}</div></div>
                  <span className="jo-num">{r.days} days</span>
                </div>
              ))}
            </div>
          )}
          <div className="j-note" style={{ marginTop: 12 }}>
            Busiest stage: {busiest ? busiest.stage.name + " (" + busiest.count + " jobs)" : "none"}. Longest average stage age: {oldest ? oldest.stage.name + " (" + round1(oldest.avg) + " days)" : "none"}.
            {" "}Blocked work sits in: {blockedStages.length ? blockedStages.join(", ") : "no stage"}. The busiest stage is not necessarily the worst bottleneck; long waits and blocks matter more than volume.
          </div>
        </Panel>
        <Panel title="Blocked work" sub="Work that cannot move until something arrives. Time blocked is counted from the request date.">
          {blocked.length + paused.length + clar.length === 0 ? <Empty title="Nothing blocked" body="No blocking client request, paused task or open clarification." /> : (
            <div className="j-list">
              {blocked.map((r) => (
                <div key={r.id} className="j-list-item">
                  <Badge tone="bad" icon="block">Blocked</Badge>
                  <div className="jo-grow">
                    <LinkBtn onClick={() => openDetail({ kind: "project", id: r.projectId })}>{r.projectId} · {S.household(d, r.projectId)}</LinkBtn>
                    <div className="j-small">{nd(r.label)} from {S.staffName(d, r.contactId)}. Requested {fmtDate(r.requestedAt)}; {calendarDaysBetween(r.requestedAt, d.now)} days blocked; reminders {r.remindersSent} of {r.maxReminders}.</div>
                  </div>
                </div>
              ))}
              {clar.map((b) => (
                <div key={b.id} className="j-list-item">
                  <Badge tone="warn" icon="chat">Clarification</Badge>
                  <div className="jo-grow">
                    <LinkBtn onClick={() => openDetail({ kind: "drawing", id: b.drawingId })}>{b.projectId} · {S.household(d, b.projectId)}</LinkBtn>
                    <div className="j-small">{S.staffName(d, b.assigneeId)} is waiting on an answer from the office. Return forecast on hold.</div>
                  </div>
                </div>
              ))}
              {paused.map((t) => (
                <div key={t.id} className="j-list-item">
                  <Badge tone="neutral" icon="pause">Paused</Badge>
                  <div className="jo-grow">
                    <LinkBtn onClick={() => openDetail({ kind: "task", id: t.id })}>{nd(t.title)}</LinkBtn>
                    <div className="j-small">{t.pauseReason || "No reason recorded"} · {S.staffName(d, t.assigneeId)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Three measures, kept apart" sub="For projects that are blocked or have overdue tasks. Stage age is ordinary time in the stage; time blocked is waiting on an input; overdue is past an internal target. Calendar days, demo clock." flush>
        {measured.length === 0 ? <Empty title="No blocked or overdue projects" /> : (
          <div className="j-tablewrap">
            <table className="j-table">
              <thead><tr><th>Project</th><th>Stage</th><th>Stage age</th><th>Time blocked</th><th>Most overdue task</th></tr></thead>
              <tbody>
                {measured.map((r) => {
                  const bd = blockedDays(r.p.id); const od = overdueDays(r.p.id);
                  const open = () => openDetail({ kind: "project", id: r.p.id });
                  return (
                    <tr key={r.p.id} {...clickRow(open)}>
                      <td><RowMain onClick={open}>{r.p.id} · {r.household}</RowMain></td>
                      <td>{r.stageName}</td>
                      <td className="jo-num">{r.days} days</td>
                      <td className="jo-num">{bd == null ? <span className="j-dim">Not blocked</span> : bd + " days"}</td>
                      <td className="jo-num">{od == null ? <span className="j-dim">None overdue</span> : <span className="jo-late">{od === 0 ? "Overdue today" : od + (od === 1 ? " day" : " days") + " overdue"}</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Drawing handoff times" sub={"Issued to acknowledged in hours, issued to first returned version in calendar days. Sample period: seed history, fictional" + (earliest ? ", briefs issued from " + fmtDate(earliest) : "") + ". Too few records to be a benchmark."} flush>
        <div className="j-row-wrap" style={{ padding: "0 20px 12px" }}>
          <Badge tone="info" icon="clock">Median acknowledgement: {ackMed == null ? "no data" : round1(ackMed) + " h"} ({handoffs.filter((h) => h.ackH != null).length} briefs)</Badge>
          <Badge tone="info" icon="clock">Median return: {retMed == null ? "no returns yet" : round1(retMed) + " days"} ({handoffs.filter((h) => h.retD != null).length} returned)</Badge>
        </div>
        {handoffs.length === 0 ? <Empty title="No issued briefs" /> : (
          <div className="j-tablewrap">
            <table className="j-table">
              <thead><tr><th>Project</th><th>Assignee</th><th>Issued (Dublin)</th><th>Acknowledged after</th><th>Returned after</th><th>Brief status</th></tr></thead>
              <tbody>
                {handoffs.map((h) => {
                  const open = () => openDetail({ kind: "drawing", id: h.b.drawingId });
                  return (
                    <tr key={h.b.id} {...clickRow(open)}>
                      <td><RowMain onClick={open}>{h.b.projectId} · {S.household(d, h.b.projectId)}</RowMain></td>
                      <td>{S.staffName(d, h.b.assigneeId)}<div className="j-cell-sub">{d.staff[h.b.assigneeId!]?.team}</div></td>
                      <td>{fmtDateTime(h.b.issuedAt)}</td>
                      <td className="jo-num">{h.ackH == null ? <span className="j-dim">Not acknowledged</span> : round1(h.ackH) + " h"}</td>
                      <td className="jo-num">{h.retD == null ? <span className="j-dim">Not returned yet</span> : h.retD + " days (Rev " + h.first!.rev + ")"}</td>
                      <td>{h.b.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

/* ── Team workload ── */
function Workload({ d }: { d: DemoState }) {
  const [open, setOpen] = useState<string | null>(null);
  const rows = S.workload(d);
  const team = (t: "Philippines" | "Mullingar") => rows.filter((r) => r.staff.team === t);
  const block = (t: "Philippines" | "Mullingar", title: string, sub: string) => (
    <Panel title={title} sub={sub} flush>
      <div className="j-list" style={{ padding: "0 20px 8px" }}>
        {team(t).map((r) => {
          const ph = t === "Philippines";
          const work: Task[] = r.tasks;
          return (
            <div key={r.staff.id} className="j-list-item" style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Avatar name={r.staff.name} colour={r.staff.colour} size={30} />
                <div className="jo-grow">
                  <LinkBtn onClick={() => openDetail({ kind: "staff", id: r.staff.id })}>{r.staff.name}</LinkBtn>
                  <div className="j-cell-sub">{r.staff.role}</div>
                </div>
                <div className="j-row-wrap" style={{ justifyContent: "flex-end" }}>
                  <Badge tone="info" icon="layers">{r.open} open</Badge>
                  {r.overdue > 0 ? <Badge tone="bad" icon="alert">{r.overdue} overdue</Badge> : <Badge tone="neutral" icon="check">None overdue</Badge>}
                </div>
              </div>
              <div className="j-row-wrap" style={{ justifyContent: "space-between" }}>
                <span className="j-small">{ph ? r.drawing + " drawing assignment" + (r.drawing === 1 ? "" : "s") + (r.office ? ", " + r.office + " other" : "") : r.office + " client, revision and office task" + (r.office === 1 ? "" : "s") + (r.drawing ? ", " + r.drawing + " drawing" : "")}</span>
                <Btn size="sm" variant="ghost" icon={open === r.staff.id ? "x" : "down"} pressed={open === r.staff.id} onClick={() => setOpen(open === r.staff.id ? null : r.staff.id)}>{open === r.staff.id ? "Hide tasks" : "Show tasks"}</Btn>
              </div>
              {open === r.staff.id && (
                <div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
                  <TaskList d={d} tasks={work} compact empty={{ title: "No open tasks", body: r.staff.name.split(" ")[0] + " has nothing open." }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
  return (
    <>
      <PageHead title="Team workload" sub="Open and overdue tasks per person, from the store. No utilisation percentages: the demo has no capacity or hours inputs, so any percentage would be a guess." />
      <div className="jo-two even">
        {block("Philippines", "Philippines drawing team", "Outsourced drawing assignments. Targets are set in Manila time.")}
        {block("Mullingar", "Mullingar office", "Client follow-ups, amendments, office QA, planning and survey work.")}
      </div>
    </>
  );
}

/* ── Sales performance ── */
const SOURCES: LeadSource[] = ["Website", "Email", "Phone", "Referral", "Walk-in"];

function Sales({ d }: { d: DemoState }) {
  const leads = Object.values(d.leads).sort((a, b) => a.receivedAt - b.receivedAt);
  const open = S.openLeads(d);
  const bySource = SOURCES.map((s) => ({ s, all: leads.filter((l) => l.source === s).length, open: open.filter((l) => l.source === s).length }));
  const smax = Math.max(1, ...bySource.map((x) => x.all));
  const acks = leads.map((l) => ({ l, s: S.ackSeconds(l) }));
  const human = leads.map((l) => ({ l, h: S.humanResponseHours(l) }));
  const ackMed = median(acks.map((x) => x.s).filter((x): x is number => x != null));
  const humMed = median(human.map((x) => x.h).filter((x): x is number => x != null));
  const follow = S.openTasks(d).filter((t) => t.kind === "followup").sort((a, b) => a.due - b.due);
  const quotes = S.sentQuotes(d).sort((a, b) => (a.sentAt || 0) - (b.sentAt || 0));
  const fees = S.canSeeFees(d);
  return (
    <>
      <PageHead title="Sales performance" sub="How enquiries arrive and how fast they are answered. The pipeline itself lives in Sales; this view only measures it."
        actions={<Btn icon="arrow" onClick={() => goTo("Sales", "pipeline")}>Open Sales pipeline</Btn>} />
      <div className="jo-two">
        <Panel title="Lead source mix" sub={"All " + leads.length + " leads in the demo by source. Open leads in brackets."}>
          <div className="jo-bars">
            {bySource.map((x) => <Bar key={x.s} label={x.s} sub={x.open + " open"} count={x.all} max={smax} onClick={() => goTo("Sales", "enquiries")} />)}
          </div>
        </Panel>
        <Panel title="Quoted pipeline" sub="Sent quotes awaiting a decision. Demo fees, not revenue." flush>
          {!fees ? <Empty title="Fees hidden in this preview" /> : quotes.length === 0 ? <Empty title="No quotes sent" /> : (
            <>
              <div className="j-tablewrap">
                <table className="j-table">
                  <thead><tr><th>Lead</th><th>Demo fee</th><th>Sent</th><th>Expires</th></tr></thead>
                  <tbody>
                    {quotes.map((q) => {
                      const o = () => openDetail({ kind: "lead", id: q.leadId });
                      return (
                        <tr key={q.id} {...clickRow(o)}>
                          <td><RowMain onClick={o}>{d.leads[q.leadId]?.name}</RowMain><div className="j-cell-sub">{q.id} · {d.leads[q.leadId]?.locality}</div></td>
                          <td className="jo-num">{S.euro(q.amount)}</td>
                          <td>{q.sentAt ? fmtDate(q.sentAt) : "Not sent"}</td>
                          <td><DateTag ts={q.expiresAt} now={d.now} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="j-note" style={{ margin: "12px 20px 16px" }}><strong>{S.euro(S.quotedPipeline(d))}</strong> across {quotes.length} sent quotes. Illustrative demo fees; not revenue, not a forecast, tax treatment to confirm.</div>
            </>
          )}
        </Panel>
      </div>
      <div className="jo-two even">
        <Panel title="Automated acknowledgement" sub={"Seconds from receipt to the templated acknowledgement. Median " + (ackMed == null ? "n/a" : ackMed + " s") + ". Phone and walk-in enquiries have no automated reply."} flush>
          <div className="j-tablewrap">
            <table className="j-table">
              <thead><tr><th>Lead</th><th>Source</th><th>Acknowledged</th></tr></thead>
              <tbody>
                {acks.map(({ l, s }) => {
                  const o = () => openDetail({ kind: "lead", id: l.id });
                  return (
                    <tr key={l.id} {...clickRow(o)}>
                      <td><RowMain onClick={o}>{l.name}</RowMain><div className="j-cell-sub">{l.id}</div></td>
                      <td>{l.source}</td>
                      <td className="jo-num">{s == null ? <span className="j-dim">Manual channel, none sent</span> : s + " s"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title="First human response" sub={"Hours from receipt to the first logged call or reply by a person. Median " + (humMed == null ? "n/a" : round1(humMed) + " h") + ". Kept separate from the automated acknowledgement."} flush>
          <div className="j-tablewrap">
            <table className="j-table">
              <thead><tr><th>Lead</th><th>Owner</th><th>First human response</th></tr></thead>
              <tbody>
                {human.map(({ l, h }) => {
                  const o = () => openDetail({ kind: "lead", id: l.id });
                  return (
                    <tr key={l.id} {...clickRow(o)}>
                      <td><RowMain onClick={o}>{l.name}</RowMain><div className="j-cell-sub">{l.status}</div></td>
                      <td>{S.staffName(d, l.ownerId)}</td>
                      <td className="jo-num">{h == null ? <span className="jo-late">Not yet responded</span> : round1(h) + " h"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
      <Panel title="Follow-ups due" sub="Open lead follow-up tasks, soonest first." actions={<Btn size="sm" variant="ghost" icon="arrow" onClick={() => goTo("Sales", "followups")}>Open follow-ups</Btn>} flush>
        <TaskList d={d} tasks={follow} empty={{ title: "No follow-ups open", body: "Every lead follow-up is done." }} />
      </Panel>
      <div className="j-small" style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="info" size={13} />No conversion rate is shown: the demo has no historical sales record to calculate one honestly.</div>
    </>
  );
}
