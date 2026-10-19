/* Drawings: control briefs, drawing production, versions and review. Tabs are
   rendered by the shell; this page renders the active one. The Philippines
   preview only gets its own assignments. */
import { useState } from "react";
import type { DemoState, DrawingBrief, ID, Task } from "../types";
import { act, useDemo } from "../store";
import * as S from "../selectors";
import { MODULES, getFilter, openDetail, setFilter, tabOf, tabsFor, useUi } from "../ui";
import { Avatar, Badge, Btn, Dialog, Empty, Field, Icon, KV, Page, PageHead, Panel, SearchBox, Seg, rowProps } from "../kit";
import { TZ_OFFICE, TZ_PH, fmtDateTime, localParts, zoned } from "../time";
import {
  BothZones, BriefActions, BriefBadge, DueState, QaChecklist, RELEASE_NOTE, VersionBadge, VisibilityBadge,
  BriefSummary, approvalState, isOffice, lastReturnNote, openWorkFor, type ApprovalKey,
} from "./drawings/shared";
import "../../styles/jma-drawings.css";

const HEAD: Record<string, { title: string; sub: string }> = {
  register: { title: "Drawing register", sub: "Every sheet with its latest uploaded revision and its latest issued revision. Only issued revisions reach the client." },
  queue: { title: "Philippines queue", sub: "Active briefs with the drawing team. Targets show Manila and Dublin time; changes keep the original date." },
  review: { title: "Office review", sub: "Returned drawings waiting for an office check before anything is shown to the client." },
  amendments: { title: "Amendments", sub: "Client change requests, each pinned to the revision it was made on, with the owner and the revision that resolved it." },
};

export default function DrawingsPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Drawings")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Drawings")) ? tabOf("Drawings") : (tabs[0]?.id || "register");
  if (d.persona.kind === "philippines") return <MyAssignments />;
  const h = HEAD[tab] || HEAD.register;
  return (
    <Page>
      <PageHead eyebrow="Drawings" title={h.title} sub={h.sub} />
      {tab === "register" && <Register />}
      {tab === "queue" && <Queue />}
      {tab === "review" && <Review />}
      {tab === "amendments" && <Amendments />}
    </Page>
  );
}

/* ───────── Register ───────── */
function Register() {
  const d = useDemo();
  const q = getFilter<string>("drawings.register.q", "");
  const f = getFilter<"all" | ApprovalKey>("drawings.register.f", "all");
  const vis = S.visibleProjectIds(d);
  const rows = Object.values(d.drawings).filter((x) => vis.has(x.projectId)).sort((a, b) => a.number.localeCompare(b.number)).map((dw) => {
    const up = S.latestUploaded(d, dw.id);
    const rel = S.latestReleased(d, dw.id);
    const st = approvalState(d, dw);
    const work = openWorkFor(d, dw);
    const brief = Object.values(d.briefs).find((b) => b.drawingId === dw.id);
    return { dw, up, rel, st, work, brief, hh: S.household(d, dw.projectId) };
  });
  const count = (k: ApprovalKey) => rows.filter((r) => r.st.key === k).length;
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => (f === "all" || r.st.key === f) && (!needle || [r.dw.number, r.dw.projectId, r.hh, r.dw.title, r.dw.sheet].join(" ").toLowerCase().includes(needle)));
  return (
    <Panel flush title="All sheets" sub={rows.length + " drawings across " + new Set(rows.map((r) => r.dw.projectId)).size + " projects"}
      actions={<SearchBox value={q} onChange={(v) => setFilter("drawings.register.q", v)} placeholder="Search number, project or household" label="Search drawings" />}>
      <div style={{ padding: "0 20px 12px" }}>
        <Seg label="Filter by approval status" value={f} onChange={(v) => setFilter("drawings.register.f", v)} options={[
          { id: "all", label: "All", count: rows.length },
          { id: "review", label: "In office review", count: count("review") },
          { id: "awaiting", label: "Awaiting client", count: count("awaiting") },
          { id: "changes", label: "Changes requested", count: count("changes") },
          { id: "approved", label: "Approved", count: count("approved") },
          { id: "none", label: "Not issued", count: count("none") },
        ]} />
      </div>
      {shown.length === 0 ? <Empty title="No drawings match" body="Clear the search or pick another filter." /> : (
        <div className="j-tablewrap">
          <table className="j-table">
            <thead><tr><th>Drawing</th><th>Project</th><th>Latest uploaded</th><th>Latest issued</th><th>Approval status</th><th>With</th><th>Target</th></tr></thead>
            <tbody>
              {shown.map(({ dw, up, rel, st, work, brief, hh }) => (
                <tr key={dw.id} {...rowProps(() => openDetail({ kind: "drawing", id: dw.id }), "Open " + dw.number)}>
                  <td><div className="j-cell-main">{dw.number}</div><div className="j-cell-sub">{dw.title}</div></td>
                  <td><div className="j-cell-main">{dw.projectId}</div><div className="j-cell-sub">{hh}</div></td>
                  <td>{up ? <div className="j-stack" style={{ gap: 4 }}><span className="j-cell-main">Rev {up.rev}</span><VersionBadge v={up} />{up.state !== "Released" && up.state !== "Superseded" && <VisibilityBadge v={up} />}</div> : <span className="j-dim">{brief ? "Brief " + brief.status.toLowerCase() : "Nothing uploaded"}</span>}</td>
                  <td>{rel ? <div className="j-stack" style={{ gap: 4 }}><span className="j-cell-main">Rev {rel.rev}</span><Badge tone="accent" icon="eye">Issued {fmtDateTime(rel.releasedAt)}</Badge></div> : <Badge tone="neutral" icon="lock">Not issued</Badge>}</td>
                  <td><Badge tone={st.tone} icon={st.icon}>{st.label}</Badge></td>
                  <td>{work ? <div className="j-row-wrap" style={{ flexWrap: "nowrap" }}><Avatar name={S.staffName(d, work.assigneeId)} colour={d.staff[work.assigneeId]?.colour} size={22} /><div><div className="j-cell-main">{S.staffName(d, work.assigneeId)}</div><div className="j-cell-sub">{kindLabel(work)}</div></div></div> : <span className="j-dim">No open work</span>}</td>
                  <td>{work ? <div className="j-stack" style={{ gap: 4 }}><span className="j-mono" style={{ whiteSpace: "nowrap" }}>{fmtDateTime(work.due, d.staff[work.assigneeId]?.tz || TZ_OFFICE, true)}</span><DueState d={d} task={work} /></div> : <span className="j-dim">None</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}
function kindLabel(t: Task) {
  return t.kind === "amendment" ? "Amendment" : t.kind === "qa" ? "Office QA" : t.kind === "drawing" ? "Drawing" : t.kind;
}

/* ───────── Philippines queue (office view) ───────── */
type QF = "all" | "Issued" | "Acknowledged" | "In progress" | "Awaiting clarification" | "Submitted" | "Returned for correction" | "overdue";
function queueFilter(rows: S.QueueRow[], f: QF) { return rows.filter((r) => f === "all" || (f === "overdue" ? r.overdue : r.brief.status === f)); }
function queueOptions(rows: S.QueueRow[]) {
  const c = (f: QF) => queueFilter(rows, f).length;
  const base: { id: QF; label: string; count: number }[] = [
    { id: "all", label: "All", count: rows.length },
    { id: "Issued", label: "Issued", count: c("Issued") },
    { id: "Acknowledged", label: "Acknowledged", count: c("Acknowledged") },
    { id: "In progress", label: "In progress", count: c("In progress") },
    { id: "Awaiting clarification", label: "Awaiting clarification", count: c("Awaiting clarification") },
    { id: "Submitted", label: "Submitted", count: c("Submitted") },
    { id: "overdue", label: "Overdue", count: c("overdue") },
  ];
  if (c("Returned for correction")) base.splice(6, 0, { id: "Returned for correction", label: "Returned", count: c("Returned for correction") });
  return base;
}

function Queue() {
  const d = useDemo();
  const f = getFilter<QF>("drawings.queue.f", "all");
  const [dlg, setDlg] = useState<{ mode: "reassign" | "due"; taskId: ID } | null>(null);
  const rows = S.philippinesQueue(d);
  const shown = queueFilter(rows, f);
  const office = isOffice(d);
  return (
    <>
      <Panel flush title="Active assignments" sub={rows.length + " active, " + rows.filter((r) => r.overdue).length + " overdue. Times shown in Manila, then Dublin."}>
        <div style={{ padding: "0 20px 12px" }}>
          <Seg label="Filter assignments" value={f} onChange={(v) => setFilter("drawings.queue.f", v)} options={queueOptions(rows)} />
        </div>
        {shown.length === 0 ? <Empty title="Nothing in this filter" body="Pick another filter to see the rest of the queue." /> : (
          <div className="j-tablewrap">
            <table className="j-table">
              <thead><tr><th>Project</th><th>Assignee</th><th>Status</th><th>Target</th><th>Office contact</th><th>Accountable owner</th><th>Acknowledged</th><th>Overdue</th>{office && <th><span className="j-sr">Actions</span></th>}</tr></thead>
              <tbody>
                {shown.map(({ brief, task, project }) => {
                  const dw = d.drawings[brief.drawingId];
                  const moved = task && task.originalDue !== task.due;
                  return (
                    <tr key={brief.id}>
                      <td>
                        <button type="button" className="j-link" onClick={() => openDetail({ kind: "drawing", id: brief.drawingId })}>{project.id} · {S.household(d, project.id)}</button>
                        <div className="j-cell-sub">{dw?.number} · {project.locality}</div>
                      </td>
                      <td><div className="j-row-wrap" style={{ flexWrap: "nowrap" }}><Avatar name={S.staffName(d, brief.assigneeId)} colour={d.staff[brief.assigneeId || ""]?.colour} size={22} /><span className="j-cell-main">{S.staffName(d, brief.assigneeId)}</span></div></td>
                      <td><BriefBadge status={brief.status} /></td>
                      <td>
                        <BothZones ts={task?.due ?? brief.due} />
                        {moved && <div className="jd-orig">Originally {fmtDateTime(task!.originalDue, TZ_PH, true)}</div>}
                      </td>
                      <td>{S.staffName(d, brief.officeContactId)}</td>
                      <td>{S.staffName(d, project.ownerId)}</td>
                      <td>{brief.ackAt ? <BothZones ts={brief.ackAt} /> : <Badge tone="warn" icon="clock">Not yet</Badge>}</td>
                      <td><DueState d={d} task={task} /></td>
                      {office && (
                        <td>
                          {task && <div className="j-row-wrap" style={{ flexWrap: "nowrap" }}>
                            <Btn size="sm" icon="user" onClick={() => setDlg({ mode: "reassign", taskId: task.id })}>Reassign</Btn>
                            <Btn size="sm" icon="calendar" onClick={() => setDlg({ mode: "due", taskId: task.id })}>Change target</Btn>
                          </div>}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="j-note internal"><Icon name="lock" size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />The drawing team sees only their own briefs and the permitted inputs (site map and survey). Fees, quotes, deposits, client contact details and commercial notes are never shown to them.</div>
      {dlg && d.tasks[dlg.taskId] && (dlg.mode === "reassign"
        ? <ReassignDialog task={d.tasks[dlg.taskId]} onClose={() => setDlg(null)} />
        : <DueDialog task={d.tasks[dlg.taskId]} onClose={() => setDlg(null)} />)}
    </>
  );
}

function ReassignDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const d = useDemo();
  const team = Object.values(d.staff).filter((s) => s.team === "Philippines" && s.id !== task.assigneeId);
  const [to, setTo] = useState(team[0]?.id || "");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  return (
    <Dialog open onClose={onClose} title="Reassign assignment" footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" onClick={() => {
        if (!reason.trim()) { setErr("A reason is required. It is kept in the history."); return; }
        const r = act.reassignTask(task.id, to, reason); if (r.ok) onClose();
      }}>Reassign</Btn>
    </>}>
      <div className="j-small">{task.title}. Currently with {S.staffName(d, task.assigneeId)}. The brief goes back to Issued so the new assignee acknowledges it.</div>
      <Field label="New assignee" htmlFor="rs-to">
        <select id="rs-to" className="j-select" value={to} onChange={(e) => setTo(e.target.value)}>
          {team.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.role})</option>)}
        </select>
      </Field>
      <Field label="Reason" htmlFor="rs-why" error={err}>
        <textarea id="rs-why" className="j-textarea" value={reason} onChange={(e) => { setReason(e.target.value); if (e.target.value.trim()) setErr(""); }} placeholder="For example: Carlo is on leave from Thursday." />
      </Field>
      {(task.reassigned || []).length > 0 && <div className="j-small">Earlier changes: {(task.reassigned || []).map((x) => S.staffName(d, x.from) + " to " + S.staffName(d, x.to) + " (" + x.reason + ")").join("; ")}</div>}
    </Dialog>
  );
}

function DueDialog({ task, onClose }: { task: Task; onClose: () => void }) {
  const d = useDemo();
  const tz = d.staff[task.assigneeId]?.tz || TZ_PH;
  const p = localParts(task.due, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  const [date, setDate] = useState(p.y + "-" + pad(p.m) + "-" + pad(p.d));
  const [time, setTime] = useState(pad(p.h) + ":" + pad(p.min));
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<{ date?: string; reason?: string }>({});
  const parse = () => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date); const t = /^(\d{2}):(\d{2})$/.exec(time);
    if (!m || !t) return null;
    return zoned(+m[1], +m[2], +m[3], +t[1], +t[2], tz);
  };
  const next = parse();
  const zone = tz === TZ_PH ? "Manila" : "Dublin";
  return (
    <Dialog open onClose={onClose} title="Change target" footer={<>
      <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
      <Btn variant="primary" onClick={() => {
        const e: typeof err = {};
        if (!next) e.date = "Enter a valid date and time.";
        if (!reason.trim()) e.reason = "A reason is required. The original date stays on record.";
        setErr(e); if (e.date || e.reason || !next) return;
        const r = act.changeDue(task.id, next, reason); if (r.ok) onClose();
      }}>Save new target</Btn>
    </>}>
      <KV cols={2} items={[
        ["Original target", fmtDateTime(task.originalDue, tz, true)],
        ["Current target", fmtDateTime(task.due, tz, true)],
      ]} />
      <div className="j-grid j-grid-2" style={{ gap: 10 }}>
        <Field label={"New date (" + zone + ")"} htmlFor="due-d" error={err.date}><input id="due-d" type="date" className="j-input" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label={"Time (" + zone + ")"} htmlFor="due-t"><input id="due-t" type="time" className="j-input" value={time} onChange={(e) => setTime(e.target.value)} /></Field>
      </div>
      {next && <div className="j-small">That is {fmtDateTime(next, TZ_PH, true)} and {fmtDateTime(next, TZ_OFFICE, true)}.</div>}
      <Field label="Reason" htmlFor="due-why" error={err.reason}>
        <textarea id="due-why" className="j-textarea" value={reason} onChange={(e) => { setReason(e.target.value); if (e.target.value.trim()) setErr((x) => ({ ...x, reason: undefined })); }} placeholder="For example: client clarification took two days." />
      </Field>
      {task.dueHistory.length > 0 && (
        <div className="j-small">History: {task.dueHistory.map((h) => fmtDateTime(h.from, tz) + " to " + fmtDateTime(h.to, tz) + " (" + h.reason + ")").join("; ")}</div>
      )}
    </Dialog>
  );
}

/* ───────── Philippines persona: my assignments ───────── */
function MyAssignments() {
  const d = useDemo();
  const me = d.persona.staffId || "";
  const f = getFilter<QF>("drawings.mine.f", "all");
  const rows = S.philippinesQueue(d).filter((r) => r.brief.assigneeId === me);
  const shown = queueFilter(rows, f);
  return (
    <Page>
      <PageHead eyebrow="Drawings" title="My assignments" sub={"Your drawing briefs, " + S.staffName(d, me) + ". Targets are shown in Manila time first, with Dublin underneath."} />
      <Seg label="Filter my assignments" value={f} onChange={(v) => setFilter("drawings.mine.f", v)} options={queueOptions(rows)} />
      {shown.length === 0 ? (
        <Panel><Empty title={rows.length ? "Nothing in this filter" : "No active assignments"} body={rows.length ? "Pick another filter." : "New briefs from the Mullingar office appear here."} /></Panel>
      ) : (
        <div className="jd-cards">
          {shown.map((r) => <AssignmentCard key={r.brief.id} d={d} row={r} />)}
        </div>
      )}
      <div className="j-note internal"><Icon name="lock" size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />This preview shows your own briefs and the permitted inputs only. It is a UI preview of access, not security.</div>
    </Page>
  );
}

function AssignmentCard({ d, row }: { d: DemoState; row: S.QueueRow }) {
  const { brief, task, project } = row;
  const dw = d.drawings[brief.drawingId];
  const docs = S.visibleDocs(d).filter((x) => x.projectId === project.id);
  const returned = lastReturnNote(brief);
  return (
    <Panel title={project.id + " · " + project.locality} sub={dw?.number + " · " + dw?.title}
      actions={<Btn size="sm" icon="eye" onClick={() => openDetail({ kind: "drawing", id: brief.drawingId })}>Open</Btn>}>
      <div className="j-stack">
        <div className="j-row-wrap"><BriefBadge status={brief.status} /><DueState d={d} task={task} /></div>
        <KV cols={2} items={[
          ["Target", <BothZones key="t" ts={task?.due ?? brief.due} />],
          ["Acknowledged", <BothZones key="a" ts={brief.ackAt} />],
          ["Office contact", S.staffName(d, brief.officeContactId)],
          ["Accountable owner", S.staffName(d, project.ownerId)],
        ]} />
        {returned && brief.status === "Returned for correction" && <div className="j-note warn"><strong>Office return note:</strong> {returned}</div>}
        <details className="jd-details">
          <summary>Brief</summary>
          <div><BriefSummary brief={brief} /></div>
        </details>
        <div>
          <div className="j-h3" style={{ marginBottom: 6 }}>Permitted inputs</div>
          {docs.length === 0 ? <div className="j-small">No inputs shared yet.</div> : docs.map((x) => (
            <div key={x.id} className="j-row-wrap" style={{ justifyContent: "space-between", padding: "4px 0" }}>
              <span className="j-small"><Icon name="doc" size={12} style={{ verticalAlign: "-2px" }} /> {x.name} ({x.type})</span>
              {x.asset ? <a className="j-btn j-btn-secondary j-btn-sm" href={x.asset} download>Download</a> : <span className="j-faint" style={{ fontSize: 11.5 }}>Record only</span>}
            </div>
          ))}
        </div>
        <BriefActions brief={brief} />
      </div>
    </Panel>
  );
}

/* ───────── Office review ───────── */
function Review() {
  const d = useDemo();
  const vis = S.visibleProjectIds(d);
  const pending = Object.values(d.versions).filter((v) => v.state === "In office review" && vis.has(d.drawings[v.drawingId]?.projectId)).sort((a, b) => a.uploadedAt - b.uploadedAt);
  const recent = Object.values(d.versions).filter((v) => v.reviewedAt && vis.has(d.drawings[v.drawingId]?.projectId)).sort((a, b) => (b.reviewedAt || 0) - (a.reviewedAt || 0)).slice(0, 6);
  return (
    <>
      <div className="j-note"><Icon name="shield" size={13} style={{ verticalAlign: "-2px", marginRight: 6 }} />{RELEASE_NOTE}</div>
      {pending.length === 0 ? <Panel><Empty title="Nothing waiting for office review" body="Returned drawings appear here as soon as they are uploaded." /></Panel> : pending.map((v) => {
        const dw = d.drawings[v.drawingId];
        const addressed = v.addresses.map((id) => d.amendments[id]).filter(Boolean);
        return (
          <Panel key={v.id} title={dw.number + " Rev " + v.rev} sub={dw.projectId + " · " + S.household(d, dw.projectId) + " · " + dw.title}
            actions={<><VersionBadge v={v} /><VisibilityBadge v={v} /><Btn size="sm" icon="eye" onClick={() => openDetail({ kind: "drawing", id: dw.id, versionId: v.id })}>Open drawing</Btn></>}>
            <div className="jd-review">
              <button type="button" className="j-card" style={{ padding: 6 }} onClick={() => openDetail({ kind: "drawing", id: dw.id, versionId: v.id })} aria-label={"Open " + dw.number + " Rev " + v.rev}>
                <img className="jd-thumb" src={v.asset} alt="" />
              </button>
              <div className="j-stack">
                <KV cols={2} items={[
                  ["Uploaded by", S.staffName(d, v.authorId) + (d.staff[v.authorId]?.team === "Philippines" ? " (Philippines)" : "")],
                  ["Uploaded", <BothZones key="u" ts={v.uploadedAt} first={TZ_OFFICE} />],
                  ["Change summary", v.changeSummary],
                  ["Addresses", addressed.length ? addressed.map((a) => "“" + a.text + "” (Rev " + (d.versions[a.versionId]?.rev || "?") + ")").join("; ") : "No client amendments"],
                ]} />
                <QaChecklist v={v} />
              </div>
            </div>
          </Panel>
        );
      })}
      {recent.length > 0 && (
        <Panel title="Recent office decisions" sub="Read-only history">
          <ul className="jd-timeline">
            {recent.map((v) => {
              const dw = d.drawings[v.drawingId];
              const released = v.state === "Released" || v.state === "Superseded";
              return (
                <li key={v.id}>
                  <span className="jd-ti"><Icon name={released ? "check" : "back"} size={14} /></span>
                  <span>
                    <button type="button" className="j-link" onClick={() => openDetail({ kind: "drawing", id: dw.id, versionId: v.id })}>{dw.number} Rev {v.rev}</button>
                    {" "}{released ? "released" : "returned for correction"} by {S.staffName(d, v.reviewerId)}, {fmtDateTime(v.reviewedAt)}. <VersionBadge v={v} />
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}

/* ───────── Amendments ───────── */
type AF = "all" | "Open" | "Addressed" | "Released";
function Amendments() {
  const d = useDemo();
  const f = getFilter<AF>("drawings.amend.f", "all");
  const vis = S.visibleProjectIds(d);
  const all = Object.values(d.amendments).filter((a) => vis.has(a.projectId)).sort((a, b) => b.createdAt - a.createdAt);
  const shown = all.filter((a) => f === "all" || a.state === f);
  const c = (s: AF) => all.filter((a) => a.state === s).length;
  const stateBadge = (s: "Open" | "Addressed" | "Released") =>
    s === "Open" ? <Badge tone="warn" icon="edit">Open</Badge> : s === "Addressed" ? <Badge tone="info" icon="clock">Addressed, in office review</Badge> : <Badge tone="ok" icon="check">Released</Badge>;
  return (
    <Panel flush title="Change requests" sub={c("Open") + " open, " + c("Addressed") + " drawn and waiting for release. Provisional SLA: " + d.settings.amendmentSlaWD + " working days."}>
      <div style={{ padding: "0 20px 12px" }}>
        <Seg label="Filter amendments" value={f} onChange={(v) => setFilter("drawings.amend.f", v)} options={[
          { id: "all", label: "All", count: all.length }, { id: "Open", label: "Open", count: c("Open") },
          { id: "Addressed", label: "Addressed", count: c("Addressed") }, { id: "Released", label: "Released", count: c("Released") },
        ]} />
      </div>
      {shown.length === 0 ? <Empty title="No amendments here" body="Client comments on a released drawing appear here, one task each." /> : (
        <div className="j-tablewrap">
          <table className="j-table">
            <thead><tr><th>Request</th><th>Project</th><th>Original revision</th><th>Owner</th><th>SLA target</th><th>Priority</th><th>State</th><th>Resulting revision</th></tr></thead>
            <tbody>
              {shown.map((a) => {
                const v = d.versions[a.versionId]; const dw = v ? d.drawings[v.drawingId] : undefined;
                const t = a.taskId ? d.tasks[a.taskId] : undefined;
                const res = a.resolvedByVersionId ? d.versions[a.resolvedByVersionId] : undefined;
                const late = !!t && S.isOverdue(d, t);
                return (
                  <tr key={a.id} {...rowProps(() => dw && openDetail({ kind: "drawing", id: dw.id, versionId: a.versionId }), "Open " + (dw?.number || "") + " Rev " + (v?.rev || "") + " at this comment")}>
                    <td style={{ minWidth: 220 }}><div className="j-cell-main">{"“" + a.text + "”"}</div><div className="j-cell-sub">{S.staffName(d, a.requesterId)} · {fmtDateTime(a.createdAt)}</div></td>
                    <td><div className="j-cell-main">{a.projectId}</div><div className="j-cell-sub">{S.household(d, a.projectId)}</div></td>
                    <td>{dw?.number}<div className="j-cell-sub">Rev {v?.rev} · {v ? (v.state === "Superseded" ? "Superseded" : v.state) : ""}</div></td>
                    <td>{t ? S.staffName(d, t.assigneeId) : "Unassigned"}</td>
                    <td>{t ? <div className="j-stack" style={{ gap: 4 }}><span className={late ? "j-ink-bad" : undefined} style={{ whiteSpace: "nowrap" }}>{fmtDateTime(t.due, TZ_OFFICE, true)}</span>{t.state !== "Done" ? <DueState d={d} task={t} /> : <Badge tone="ok" icon="check">Done {fmtDateTime(t.completedAt)}</Badge>}</div> : <span className="j-dim">None</span>}</td>
                    <td>{t ? <Badge tone={t.priority === "High" ? "warn" : "neutral"} icon={t.priority === "High" ? "flag" : "info"}>{t.priority}</Badge> : "None"}</td>
                    <td>{stateBadge(a.state)}</td>
                    <td>{res ? <div className="j-stack" style={{ gap: 4 }}><span className="j-cell-main">Rev {res.rev}</span><VersionBadge v={res} /></div> : <span className="j-dim">Not drawn yet</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

