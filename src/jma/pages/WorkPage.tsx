/* Work: every assigned task in one place, the approval queue, the automation
   rules with their run history, and the next ten working days. */
import { useMemo, useState } from "react";
import type { AutomationRun, DemoState, ID, Task } from "../types";
import { act, useDemo } from "../store";
import * as S from "../selectors";
import { MODULES, getFilter, openDetail, setFilter, setTab, tabOf, tabsFor, useUi } from "../ui";
import { Badge, Btn, Empty, Field, Icon, Page, PageHead, Panel, SearchBox, Seg, type Tone } from "../kit";
import { TZ_OFFICE, TZ_PH, atLocal, fmtDateTime, fmtTime } from "../time";
import TaskList from "./ops/TaskList";
import { type DueState, DUE_LABEL, LinkBtn, RowMain, RunStatus, clickRow, failedMessageFor, groupByDay, matchesDue, nd, nextWorkingDays, subjectRef } from "./ops/shared";

export default function WorkPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Work")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Work")) ? tabOf("Work") : tabs[0].id;
  return (
    <Page>
      {tab === "tasks" && <Tasks d={d} />}
      {tab === "approvals" && <Approvals d={d} />}
      {tab === "workflows" && <Workflows d={d} />}
      {tab === "schedules" && <Schedules d={d} />}
    </Page>
  );
}

/* ── Tasks ── */
function baseTasks(d: DemoState): Task[] {
  const all = Object.values(d.tasks).filter((t) => t.state !== "Cancelled");
  if (d.persona.kind === "philippines") return all.filter((t) => t.assigneeId === d.persona.staffId);
  if (d.persona.kind === "sales") return all.filter((t) => !!t.leadId);
  return all;
}

function Tasks({ d }: { d: DemoState }) {
  const due = getFilter<DueState>("work.due", "all");
  const [team, setTeam] = useState<"all" | "Mullingar" | "Philippines">("all");
  const [owner, setOwner] = useState<string>("all");
  const [prio, setPrio] = useState<string>("all");
  const [proj, setProj] = useState<string>("all");
  const [q, setQ] = useState("");
  const ph = d.persona.kind === "philippines";
  const sales = d.persona.kind === "sales";
  const base = baseTasks(d);

  const pre = base.filter((t) =>
    (team === "all" || t.team === team) &&
    (owner === "all" || t.assigneeId === owner) &&
    (prio === "all" || t.priority === prio) &&
    (proj === "all" || t.projectId === proj || t.leadId === proj) &&
    (!q.trim() || (t.title + " " + (t.projectId || "") + " " + (t.leadId || "") + " " + S.staffName(d, t.assigneeId) + " " + (t.projectId ? S.household(d, t.projectId) : "")).toLowerCase().includes(q.trim().toLowerCase())));
  const dues: DueState[] = ["all", "overdue", "today", "week", "paused", "done"];
  const shown = pre.filter((t) => matchesDue(d, t, due)).sort((a, b) => due === "done" ? (b.completedAt || 0) - (a.completedAt || 0) : (Number(S.isOverdue(d, b)) - Number(S.isOverdue(d, a))) || a.due - b.due);

  const assignees = Array.from(new Set(base.map((t) => t.assigneeId))).sort((a, b) => S.staffName(d, a).localeCompare(S.staffName(d, b)));
  const recs = Array.from(new Set(base.map((t) => t.projectId || t.leadId).filter((x): x is string => !!x))).sort();
  const filtered = team !== "all" || owner !== "all" || prio !== "all" || proj !== "all" || !!q.trim() || due !== "all";
  const clear = () => { setTeam("all"); setOwner("all"); setPrio("all"); setProj("all"); setQ(""); setFilter("work.due", "all"); };

  return (
    <>
      <PageHead title="Tasks"
        sub={ph ? "Your own assignments only. Drawing assignments complete when you submit a version from the Philippines queue." : sales ? "Lead follow-ups only. Delivery tasks are for office staff." : "Every assigned task across Mullingar and the Philippines. The assignee does the work; the accountable owner answers for it."} />
      <Panel flush>
        <div style={{ padding: "16px 20px 12px", display: "flex", flexDirection: "column", gap: 12 }}>
          <Seg<DueState> label="Due state" value={due} onChange={(v) => setFilter("work.due", v)}
            options={dues.map((x) => ({ id: x, label: DUE_LABEL[x], count: pre.filter((t) => matchesDue(d, t, x)).length }))} />
          <div className="jo-filters">
            <SearchBox value={q} onChange={setQ} placeholder="Search tasks, projects, people" label="Search tasks" />
            {!ph && !sales && (
              <Field label="Team" htmlFor="wf-team">
                <select id="wf-team" className="j-select" value={team} onChange={(e) => setTeam(e.target.value as typeof team)}>
                  <option value="all">Both teams</option><option value="Mullingar">Mullingar</option><option value="Philippines">Philippines</option>
                </select>
              </Field>
            )}
            {!ph && (
              <Field label="Assignee" htmlFor="wf-owner">
                <select id="wf-owner" className="j-select" value={owner} onChange={(e) => setOwner(e.target.value)}>
                  <option value="all">Anyone</option>
                  {assignees.map((a) => <option key={a} value={a}>{S.staffName(d, a)}</option>)}
                </select>
              </Field>
            )}
            <Field label="Priority" htmlFor="wf-prio">
              <select id="wf-prio" className="j-select" value={prio} onChange={(e) => setPrio(e.target.value)}>
                <option value="all">Any priority</option><option>High</option><option>Medium</option><option>Low</option>
              </select>
            </Field>
            <Field label={sales ? "Lead" : "Project or lead"} htmlFor="wf-proj">
              <select id="wf-proj" className="j-select" value={proj} onChange={(e) => setProj(e.target.value)}>
                <option value="all">All</option>
                {recs.map((r) => <option key={r} value={r}>{r} {d.projects[r] ? S.household(d, r) : d.leads[r]?.name || ""}</option>)}
              </select>
            </Field>
            {filtered && <Btn size="sm" variant="ghost" icon="x" onClick={clear}>Clear filters</Btn>}
          </div>
          <div className="j-small" aria-live="polite">{shown.length} of {base.length} tasks shown.</div>
        </div>
        <TaskList d={d} tasks={shown} empty={{ title: "No tasks match these filters", body: due === "overdue" ? "Nothing is overdue for this selection." : "Change or clear the filters to see more." }} />
      </Panel>
    </>
  );
}

/* ── Approvals ── */
function Approvals({ d }: { d: DemoState }) {
  const queue = S.approvalQueue(d);
  const decided = S.decidedApprovals(d).slice(0, 25);
  const openVersion = (versionId?: ID, projectId?: ID) => {
    const v = versionId ? d.versions[versionId] : undefined;
    if (v) openDetail({ kind: "drawing", id: v.drawingId, versionId: v.id });
    else if (projectId) openDetail({ kind: "project", id: projectId });
  };
  const tone: Record<string, Tone> = { "Office release": "accent", "Client decision": "info", Override: "warn" };
  return (
    <>
      <PageHead title="Approvals" sub="Office releases waiting for QA and client decisions waiting on a household. Each item names the exact drawing and revision. Office release is the practice's workflow sign-off, not a compliance certificate." />
      <div className="jo-two">
        <Panel title="Waiting for a decision" sub="Oldest first." flush>
          {queue.length === 0 ? <Empty title="Nothing waiting" body="No version is in office review and no released revision is waiting on a client." /> : (
            <div className="j-tablewrap">
              <table className="j-table">
                <thead><tr><th>Decision</th><th>Subject</th><th>With</th><th>Since</th></tr></thead>
                <tbody>
                  {queue.map((a, i) => {
                    const o = () => openVersion(a.versionId, a.projectId);
                    return (
                      <tr key={i} {...clickRow(o)}>
                        <td><Badge tone={tone[a.kind]} icon={a.kind === "Office release" ? "shield" : "user"}>{a.kind}</Badge><div className="j-cell-sub">{a.state}</div></td>
                        <td><RowMain onClick={o} label={"Open " + a.subject}>{a.subject}</RowMain><div className="j-cell-sub">{a.projectId} · {S.household(d, a.projectId)}</div></td>
                        <td>{a.who}</td>
                        <td>{a.at ? fmtDateTime(a.at) : "Not recorded"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
        <Panel title="Recent decisions" sub="Releases, client approvals and stage overrides, newest first. Approvals apply to the exact revision only." flush>
          {decided.length === 0 ? <Empty title="No decisions recorded" /> : (
            <div className="j-list" style={{ padding: "0 20px 8px" }}>
              {decided.map((x, i) => (
                <div key={i} className="j-list-item">
                  <Badge tone={tone[x.kind]} icon={x.kind === "Override" ? "alert" : "check"}>{x.kind}</Badge>
                  <div className="jo-grow">
                    <LinkBtn onClick={() => openVersion(x.versionId, x.projectId)}>{nd(x.text)}</LinkBtn>
                    <div className="j-cell-sub">{x.projectId} · {S.household(d, x.projectId)} · {fmtDateTime(x.at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ── Workflows ── */
type RunFilter = "all" | "Failed" | "Retried" | "Skipped: duplicate" | "Stopped" | "Success";
function Workflows({ d }: { d: DemoState }) {
  const [f, setF] = useState<RunFilter>("all");
  const admin = S.canConfigure(d);
  const rules = Object.values(d.rules);
  const runs = useMemo(() => Object.values(d.runs).sort((a, b) => b.at - a.at), [d.runs]);
  const shown = f === "all" ? runs : runs.filter((r) => r.result === f);
  const failedMsgs = Object.values(d.messages).filter((m) => m.delivery === "Failed");
  const opts: RunFilter[] = ["all", "Failed", "Retried", "Skipped: duplicate", "Stopped", "Success"];
  return (
    <>
      <PageHead title="Workflows" sub="Each rule is an event, a condition and an action, with a stop or recovery rule. These are local simulated transitions: they run when an action in this app triggers them. No external scheduler or message provider exists in the demo." />
      {failedMsgs.length > 0 && (
        <Panel title="Failed notifications" sub="A client message the simulated provider rejected. Retry records a new attempt; nothing leaves this browser.">
          <div className="j-list">
            {failedMsgs.map((m) => (
              <div key={m.id} className="j-list-item">
                <Badge tone="bad" icon="x">Failed</Badge>
                <div className="jo-grow">
                  <div className="j-cell-main">{nd(m.subject || "Message")}</div>
                  <div className="j-small">{m.projectId ? m.projectId + " · " + S.household(d, m.projectId) + " · " : ""}{m.channel} to {S.staffName(d, m.contactId)} · {nd(m.deliveryLog[m.deliveryLog.length - 1]?.note || "Delivery failed")}</div>
                </div>
                <Btn size="sm" variant="primary" icon="refresh" onClick={() => act.retryMessage(m.id)}>Retry</Btn>
              </div>
            ))}
          </div>
        </Panel>
      )}
      <Panel title="Automation rules" sub={admin ? "Pause a rule to stop it acting; runs then show as Stopped." : "Read-only in this preview. An administrator can pause or resume rules."} flush>
        <div className="j-list" style={{ padding: "0 20px 8px" }}>
          {rules.map((r) => {
            const n = runs.filter((x) => x.ruleId === r.id).length;
            return (
              <div key={r.id} className="j-list-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <div className="jo-grow"><div className="j-cell-main">{r.name}</div><div className="j-cell-sub">{n} run{n === 1 ? "" : "s"} recorded</div></div>
                  {r.enabled ? <Badge tone="ok" icon="play">Active</Badge> : <Badge tone="neutral" icon="pause">Paused</Badge>}
                  <Btn size="sm" disabled={!admin} icon={r.enabled ? "pause" : "play"} onClick={() => act.toggleRule(r.id)}
                    title={admin ? undefined : "Administrator only"}>{r.enabled ? "Pause rule" : "Resume rule"}</Btn>
                </div>
                <div className="jo-chain">
                  <div className="jo-chain-step"><b>Event</b>{r.trigger}</div>
                  <div className="jo-chain-arrow"><Icon name="arrow" size={14} /></div>
                  <div className="jo-chain-step"><b>Condition</b>{r.guard}</div>
                  <div className="jo-chain-arrow"><Icon name="arrow" size={14} /></div>
                  <div className="jo-chain-step"><b>Action</b>{r.action}</div>
                </div>
                <div className="j-small" style={{ marginTop: 6 }}><strong>Stop and recovery:</strong> {r.stop}</div>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel title="Run history" sub="Newest first. Failures, retries and duplicate events stay visible alongside successes." flush>
        <div style={{ padding: "0 20px 12px" }}>
          <Seg<RunFilter> label="Result" value={f} onChange={setF} options={opts.map((o) => ({ id: o, label: o === "all" ? "All results" : o, count: o === "all" ? runs.length : runs.filter((r) => r.result === o).length }))} />
        </div>
        {shown.length === 0 ? <Empty title="No runs with this result" body="Choose another result filter." /> : <RunTable d={d} runs={shown} />}
      </Panel>
    </>
  );
}

function RunTable({ d, runs }: { d: DemoState; runs: AutomationRun[] }) {
  return (
    <div className="j-tablewrap">
      <table className="j-table">
        <thead><tr><th>When (Dublin)</th><th>Rule</th><th>Result</th><th>Detail</th><th>Subject</th></tr></thead>
        <tbody>
          {runs.map((r) => {
            const ref = subjectRef(d, r.subject);
            const failed = r.result === "Failed" ? failedMessageFor(d, r) : undefined;
            return (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(r.at)}</td>
                <td style={{ minWidth: 170 }}><div className="j-cell-main">{d.rules[r.ruleId]?.name || r.ruleId}</div><div className="jo-mono">{r.eventKey}</div></td>
                <td><RunStatus r={r.result} /></td>
                <td style={{ minWidth: 220 }}>{nd(r.detail)}{failed && <div style={{ marginTop: 6 }}><Btn size="sm" variant="primary" icon="refresh" onClick={() => act.retryMessage(failed.id)}>Retry notification</Btn></div>}</td>
                <td>{ref ? <LinkBtn onClick={ref.open}>{ref.label}</LinkBtn> : <span className="j-dim">{r.subject.kind}</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Schedules ── */
type Item = { at: number; type: string; tone: Tone; icon: string; label: string; who?: ID; open?: () => void; openLabel?: string; zone?: string };

function Schedules({ d }: { d: DemoState }) {
  const days = nextWorkingDays(d.now, 10);
  const start = days[0];
  const end = atLocal(days[days.length - 1] + 36 * 3600000, 0, 0);
  const inWin = (ts?: number) => ts != null && ts >= start && ts < end;
  const sales = d.persona.kind === "sales";
  const items: Item[] = [];
  if (!sales) {
    Object.values(d.visits).filter((v) => inWin(v.at) && d.projects[v.projectId]).forEach((v) => items.push({ at: v.at, type: "Site visit", tone: "accent", icon: "pin", label: "Site visit: " + S.household(d, v.projectId) + ", " + d.projects[v.projectId].locality + (v.state === "Completed" ? " (completed)" : ""), who: v.ownerId, open: () => openDetail({ kind: "project", id: v.projectId }), openLabel: v.projectId }));
    Object.values(d.programme).filter((p) => p.fixed && inWin(p.fixedStart) && d.projects[p.projectId]?.status === "Live").forEach((p) => items.push({ at: p.fixedStart!, type: p.kind === "client" ? "Client meeting" : p.dateKind === "Recorded external date" ? "Recorded external date" : "Fixed date", tone: p.kind === "external" ? "warn" : "info", icon: "calendar", label: nd(p.label), who: d.projects[p.projectId].ownerId, open: () => openDetail({ kind: "project", id: p.projectId }), openLabel: p.projectId + " " + S.household(d, p.projectId) }));
    Object.values(d.requests).filter((r) => r.state === "Outstanding" && inWin(r.nextReminderAt)).forEach((r) => items.push({ at: r.nextReminderAt!, type: "Reminder", tone: "neutral", icon: "send", label: "Reminder " + (r.remindersSent + 1) + " of " + r.maxReminders + ": " + nd(r.label) + " (" + S.staffName(d, r.contactId) + ")", who: r.ownerId, open: () => openDetail({ kind: "project", id: r.projectId }), openLabel: r.projectId + " " + S.household(d, r.projectId) }));
  }
  S.openTasks(d).filter((t) => t.state !== "Paused" && inWin(t.due) && (!sales || !!t.leadId)).forEach((t) => items.push({ at: t.due, type: "Due", tone: "info", icon: "clock", label: nd(t.title), who: t.assigneeId, open: () => openDetail({ kind: "task", id: t.id }), openLabel: "Open task", zone: d.staff[t.assigneeId]?.tz }));
  items.sort((a, b) => a.at - b.at);
  const groups = groupByDay(items, (x) => x.at);
  const overdue = S.overdueTasks(d).filter((t) => !sales || !!t.leadId).length;
  return (
    <>
      <PageHead title="Schedules" sub={"Site visits, client meetings and fixed dates, reminders and internal due dates for the next 10 working days, grouped by day in Dublin time." + (sales ? " Showing lead follow-ups only." : "")} />
      <div className="j-note warn" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><Icon name="info" size={14} style={{ marginTop: 2 }} /><span>Simulated calendar. Microsoft Calendar not connected; these entries come from the demo store and no invitation is sent. Working days are Monday to Friday; holidays are not modelled.</span></div>
      {overdue > 0 && <div className="j-small">{overdue} overdue task{overdue === 1 ? " is" : "s are"} not listed here because the date has passed. <LinkBtn onClick={() => { setFilter("work.due", "overdue"); setTab("Work", "tasks"); }}>Show overdue tasks</LinkBtn></div>}
      <Panel flush>
        {items.length === 0 ? <Empty title="Nothing scheduled" body="No visits, fixed dates, reminders or due dates in the next 10 working days." /> : groups.map((g) => (
          <div key={g.key} className="jo-day">
            <div className="jo-day-head">{g.label}</div>
            {g.items.map((x, i) => (
              <div key={i} className="jo-ev">
                <span className="jo-ev-time">{fmtTime(x.at)}</span>
                <div style={{ minWidth: 0 }}>
                  <div className="j-cell-main">{x.label}</div>
                  <div className="jo-ev-meta">
                    <Badge tone={x.tone} icon={x.icon}>{x.type}</Badge>
                    {x.who && <span>{S.staffName(d, x.who)}</span>}
                    {x.zone === TZ_PH && <span>{fmtTime(x.at, TZ_PH)} Manila</span>}
                    {x.zone && x.zone !== TZ_PH && x.zone !== TZ_OFFICE && <span>{x.zone}</span>}
                  </div>
                </div>
                {x.open ? <LinkBtn onClick={x.open}>{x.openLabel || "Open"}</LinkBtn> : <span />}
              </div>
            ))}
          </div>
        ))}
      </Panel>
    </>
  );
}
