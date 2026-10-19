/* Body of the drawing drawer: version selector, canvas with revision-bound
   comment pins, compare, issue history, approvals, brief and clarifications,
   and the office QA actions. Reads the one store; changes go through act.* */
import { useEffect, useState } from "react";
import type { Amendment, DrawingVersion } from "../types";
import { act, useDemo } from "../store";
import * as S from "../selectors";
import { go } from "../ui";
import { Badge, Btn, Empty, Field, Icon, KV, Panel, Seg } from "../kit";
import { TZ_OFFICE, TZ_PH, fmtDateTime } from "../time";
import DrawingCanvas, { type CanvasPin } from "./drawings/DrawingCanvas";
import {
  BothZones, BriefActions, BriefSummary, QaChecklist, VersionBadge, VisibilityBadge, briefOf, fileName,
  isOffice, versionLabel, versionsNewestFirst, visibilityOf,
} from "./drawings/shared";
import "../../styles/jma-drawings.css";

type Mode = "view" | "compare";

export default function DrawingDetail({ id, versionId }: { id: string; tab?: string; versionId?: string }) {
  const d = useDemo();
  const [sel, setSel] = useState<string | undefined>(versionId);
  const [mode, setMode] = useState<Mode>("view");
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => { setSel(versionId); setMode("view"); setActive(null); }, [id, versionId]);

  const dw = d.drawings[id];
  if (!dw) return <Empty title="Drawing not found" body={id} />;
  const versions = versionsNewestFirst(d, id);
  const v = sel && d.versions[sel]?.drawingId === id ? d.versions[sel] : versions[0];
  const brief = briefOf(d, id);
  const office = isOffice(d);
  const ph = d.persona.kind === "philippines";
  const who = (pid: string) => (ph && !d.staff[pid] ? "Client" : S.staffName(d, pid));
  const p = d.projects[dw.projectId];

  return (
    <div className="jd-detail">
      {ph && brief && brief.assigneeId === d.persona.staffId && (
        <Panel title="Your assignment" sub={brief.status}><BriefActions brief={brief} /></Panel>
      )}

      {!v ? (
        <Panel><Empty title="No revision uploaded yet" body={brief ? "The brief is " + brief.status.toLowerCase() + ". A revision appears here once the drawing team submits it." : "Nothing has been uploaded for this sheet."} /></Panel>
      ) : (
        <>
          <div className="jd-bar">
            <Seg label="Revision" value={v.id} onChange={(x) => { setSel(x); setActive(null); }}
              options={versions.map((x) => ({ id: x.id, label: "Rev " + x.rev + " · " + (x.state === "Superseded" ? "Superseded" : x.state) }))} />
            <span className="jd-bar-grow" />
            <Seg label="View mode" value={mode} onChange={(m) => setMode(m)} options={[{ id: "view", label: "Review" }, { id: "compare", label: "Compare" }]} />
            <a className="j-btn j-btn-secondary j-btn-sm" href={v.asset} download={fileName(dw, v)}><Icon name="download" size={13} />Download SVG</a>
          </div>
          <div className="jd-vis">
            <VersionBadge v={v} /><VisibilityBadge v={v} />
            <span>{v.state === "Superseded" ? "Superseded for current review. " : ""}{visibilityOf(v).note}</span>
          </div>
          {mode === "compare" && versions.length < 2 && <div className="j-note">Only one revision exists, so there is nothing to compare yet.</div>}
          {mode === "compare" && versions.length >= 2
            ? <Compare versions={versions} current={v} number={dw.number} />
            : <ReviewView v={v} active={active} setActive={setActive} onPick={(x) => { setSel(x); setActive(null); }} who={who} />}
          {office && v.state === "In office review" && <Panel title="Office review" sub="Explicit office check before anything reaches the client"><QaChecklist v={v} /></Panel>}
        </>
      )}

      <div className="j-grid j-grid-2">
        <Panel title="Issue history" sub="Uploaded, reviewed, released and superseded, with who and when">
          <History drawingId={id} who={who} />
        </Panel>
        <Panel title="Approvals" sub="Stored against an exact version. Read-only.">
          <Approvals drawingId={id} who={who} />
        </Panel>
      </div>

      <Panel title="Brief and clarifications" actions={<Badge tone="neutral" icon="lock">Internal: office and drawing team</Badge>}>
        {brief ? <BriefThread briefId={brief.id} /> : <div className="j-small">No drawing brief is linked to this sheet.</div>}
      </Panel>

      {office && p && (
        <div className="j-row-wrap"><Btn size="sm" icon="arrow" onClick={() => go("Projects", "all", { kind: "project", id: p.id })}>Open {p.id}</Btn></div>
      )}
    </div>
  );
}

/* ── Canvas beside the comments column ── */
function ReviewView({ v, active, setActive, onPick, who }: { v: DrawingVersion; active: string | null; setActive: (x: string | null) => void; onPick: (vid: string) => void; who: (id: string) => string }) {
  const d = useDemo();
  const dw = d.drawings[v.drawingId];
  const onThis = Object.values(d.amendments).filter((a) => a.versionId === v.id).sort((a, b) => a.createdAt - b.createdAt);
  const addressed = v.addresses.map((x) => d.amendments[x]).filter((a): a is Amendment => !!a);
  const pins: CanvasPin[] = onThis.map((a, i) => ({ id: a.id, x: a.pin.x, y: a.pin.y, n: i + 1, tone: a.state === "Open" ? "open" : "done", active: active === a.id, label: "Comment " + (i + 1) + ": " + a.text + " (" + a.state + ")" }));
  return (
    <div className="jd-split">
      <div className="j-stack">
        <DrawingCanvas src={v.asset} label={dw.number + " Rev " + v.rev} pins={pins} onPinClick={(x) => setActive(active === x ? null : x)} />
        <KV cols={2} items={[
          ["Change summary", v.changeSummary],
          ["Uploaded", S.staffName(d, v.authorId) + ", " + fmtDateTime(v.uploadedAt, TZ_OFFICE, true)],
        ]} />
      </div>
      <aside className="jd-side" aria-label={"Comments on Rev " + v.rev}>
        <div className="j-row-wrap" style={{ justifyContent: "space-between" }}>
          <h3 className="j-h3">Comments on Rev {v.rev}</h3>
          <Badge tone="accent" icon="eye">Client comments</Badge>
        </div>
        {onThis.length === 0 ? <div className="j-small">No comments were pinned on this revision.</div> : onThis.map((a, i) => {
          const res = a.resolvedByVersionId ? d.versions[a.resolvedByVersionId] : undefined;
          const t = a.taskId ? d.tasks[a.taskId] : undefined;
          return (
            <div key={a.id} className="j-stack" style={{ gap: 6 }}>
              <button type="button" className={"jd-comment" + (active === a.id ? " on" : "")} aria-pressed={active === a.id} onClick={() => setActive(active === a.id ? null : a.id)}>
                <span className="jd-comment-n" aria-hidden="true">{i + 1}</span>
                <span className="jd-comment-body">
                  <span className="jd-comment-text">{"“" + a.text + "”"}</span>
                  <span className="jd-meta">{who(a.requesterId)} · {fmtDateTime(a.createdAt, TZ_OFFICE, true)} · sheet {a.sheet}</span>
                  <span className="j-row-wrap" style={{ gap: 6 }}>
                    <AmendState a={a} />
                    {t && d.persona.kind !== "philippines" && <span className="jd-meta">Owner {S.staffName(d, t.assigneeId)}, due {fmtDateTime(t.due)}</span>}
                  </span>
                </span>
              </button>
              {res && <div className="jd-meta" style={{ paddingLeft: 12 }}>Resulting revision: <button type="button" className="j-link" onClick={() => onPick(res.id)}>Rev {res.rev}</button> ({versionLabel(res.state)})</div>}
            </div>
          );
        })}
        {addressed.length > 0 && (
          <div className="j-stack" style={{ gap: 6 }}>
            <h3 className="j-h3">This revision addresses</h3>
            {addressed.map((a) => (
              <div key={a.id} className="j-note">
                {"“" + a.text + "”"}
                <div className="jd-meta">Pinned on <button type="button" className="j-link" onClick={() => onPick(a.versionId)}>Rev {d.versions[a.versionId]?.rev}</button>. The pin stays on that revision.</div>
              </div>
            ))}
          </div>
        )}
        <div className="j-small">Pins stay attached to the revision they were made on. The office reviews every request; nothing is approved or assessed by AI.</div>
      </aside>
    </div>
  );
}

function AmendState({ a }: { a: Amendment }) {
  if (a.state === "Open") return <Badge tone="warn" icon="edit">Open</Badge>;
  if (a.state === "Addressed") return <Badge tone="info" icon="clock">Addressed, in office review</Badge>;
  return <Badge tone="ok" icon="check">Released</Badge>;
}

/* ── Compare: side by side, or overlay with an opacity slider ── */
function Compare({ versions, current, number }: { versions: DrawingVersion[]; current: DrawingVersion; number: string }) {
  const idx = versions.findIndex((x) => x.id === current.id);
  const [left, setLeft] = useState((versions[idx + 1] || versions[1] || versions[0]).id);
  const [right, setRight] = useState(current.id);
  const [how, setHow] = useState<"side" | "overlay">("side");
  const [op, setOp] = useState(50);
  const d = useDemo();
  const L = d.versions[left] || versions[1], R = d.versions[right] || versions[0];
  const pick = (val: string, set: (x: string) => void, idp: string, label: string) => (
    <label className="jd-range" htmlFor={idp}>
      <span>{label}</span>
      <select id={idp} className="jd-select" value={val} onChange={(e) => set(e.target.value)}>
        {versions.map((x) => <option key={x.id} value={x.id}>Rev {x.rev} ({versionLabel(x.state)})</option>)}
      </select>
    </label>
  );
  return (
    <div className="j-stack">
      <div className="jd-bar">
        {pick(left, setLeft, "cmp-l", how === "overlay" ? "Base" : "Left")}
        {pick(right, setRight, "cmp-r", how === "overlay" ? "On top" : "Right")}
        <span className="jd-bar-grow" />
        <Seg label="Compare layout" value={how} onChange={(x) => setHow(x)} options={[{ id: "side", label: "Side by side" }, { id: "overlay", label: "Overlay" }]} />
      </div>
      {how === "side" ? (
        <div className="jd-compare">
          <div className="jd-compare-col"><div className="j-row-wrap"><span className="j-h3">Rev {L.rev}</span><VersionBadge v={L} /></div><DrawingCanvas src={L.asset} label={number + " Rev " + L.rev} compact /></div>
          <div className="jd-compare-col"><div className="j-row-wrap"><span className="j-h3">Rev {R.rev}</span><VersionBadge v={R} /></div><DrawingCanvas src={R.asset} label={number + " Rev " + R.rev} compact /></div>
        </div>
      ) : (
        <div className="j-stack">
          <label className="jd-range" htmlFor="cmp-op">
            <span>Rev {R.rev} opacity</span>
            <input id="cmp-op" type="range" min={0} max={100} value={op} onChange={(e) => setOp(+e.target.value)} />
            <span className="j-mono">{op}%</span>
          </label>
          <DrawingCanvas src={L.asset} label={number + " Rev " + L.rev + " with Rev " + R.rev + " overlaid"} overlay={{ src: R.asset, opacity: op / 100, label: number + " Rev " + R.rev }} compact />
        </div>
      )}
      <div className="j-small">Visual comparison of the two sheets only. This is not an automatic CAD difference check; read the change summary and the revision cloud on the sheet.</div>
    </div>
  );
}

/* ── Issue history ── */
function History({ drawingId, who }: { drawingId: string; who: (id: string) => string }) {
  const d = useDemo();
  const evs: { at: number; icon: string; text: string }[] = [];
  S.versionsFor(d, drawingId).forEach((v) => {
    const author = S.staffName(d, v.authorId) + (d.staff[v.authorId]?.team === "Philippines" ? " (Philippines)" : "");
    evs.push({ at: v.uploadedAt, icon: "upload", text: "Rev " + v.rev + " uploaded by " + author + " to office review (internal)" });
    if (v.state === "Returned for correction" && v.reviewedAt) evs.push({ at: v.reviewedAt, icon: "back", text: "Rev " + v.rev + " returned for correction by " + S.staffName(d, v.reviewerId) });
    if (v.releasedAt) evs.push({ at: v.releasedAt, icon: "send", text: "Rev " + v.rev + " reviewed and released to the client by " + S.staffName(d, v.reviewerId) });
    if (v.supersededAt) evs.push({ at: v.supersededAt, icon: "layers", text: "Rev " + v.rev + " superseded by a newer release" });
    const ap = S.approvalFor(d, v.id);
    if (ap) evs.push({ at: ap.at, icon: "check", text: "Rev " + v.rev + " approved by " + who(ap.actorId) });
  });
  evs.sort((a, b) => b.at - a.at);
  if (!evs.length) return <div className="j-small">No history yet.</div>;
  return (
    <ul className="jd-timeline">
      {evs.map((e, i) => (
        <li key={i}><span className="jd-ti"><Icon name={e.icon} size={14} /></span><span>{e.text}<div className="jd-meta">{fmtDateTime(e.at, TZ_OFFICE, true)} · {fmtDateTime(e.at, TZ_PH, true)}</div></span></li>
      ))}
    </ul>
  );
}

/* ── Approvals: exact version, actor, time, wording ── */
function Approvals({ drawingId, who }: { drawingId: string; who: (id: string) => string }) {
  const d = useDemo();
  const vers = S.versionsFor(d, drawingId);
  const ids = new Set(vers.map((v) => v.id));
  const list = Object.values(d.approvals).filter((a) => ids.has(a.versionId)).sort((a, b) => b.at - a.at);
  const rel = S.latestReleased(d, drawingId);
  const relApproved = rel && S.approvalFor(d, rel.id);
  return (
    <div className="j-stack">
      {rel && !relApproved && <div className="j-note">No decision recorded on Rev {rel.rev} yet. A new revision never inherits an earlier approval.</div>}
      {!rel && <div className="j-small">Nothing has been issued, so there is nothing to approve.</div>}
      {list.map((a) => {
        const v = d.versions[a.versionId];
        const historical = !rel || rel.id !== v.id;
        return (
          <div key={a.id} className="j-stack" style={{ gap: 6 }}>
            <div className="j-row-wrap">
              <Badge tone="ok" icon="check">Approved Rev {v.rev}</Badge>
              {historical ? <Badge tone="neutral" icon="lock">Historical: applies to Rev {v.rev} only</Badge> : <Badge tone="neutral" icon="lock">Read-only</Badge>}
            </div>
            <div className="jd-meta">Exact version {v.id} · {who(a.actorId)} · {fmtDateTime(a.at, TZ_OFFICE, true)}</div>
            <div className="jd-meta">Purpose: {a.purpose}</div>
            <blockquote className="jd-quote">{a.ackText}</blockquote>
          </div>
        );
      })}
    </div>
  );
}

/* ── Brief summary and clarification thread ── */
function BriefThread({ briefId }: { briefId: string }) {
  const d = useDemo();
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const b = d.briefs[briefId];
  const office = isOffice(d);
  const mine = d.persona.kind === "philippines" && b.assigneeId === d.persona.staffId;
  const canPost = (office || mine) && b.status !== "Draft";
  const fid = "thread-" + b.id;
  const t = b.taskId ? d.tasks[b.taskId] : undefined;
  return (
    <div className="j-stack">
      <KV cols={3} items={[
        ["Assignee", S.staffName(d, b.assigneeId)],
        ["Office contact", S.staffName(d, b.officeContactId)],
        ["Target", t || b.due ? <BothZones key="due" ts={t?.due ?? b.due} /> : "Not set"],
      ]} />
      <details className="jd-details" open={mine}>
        <summary>Brief summary</summary>
        <div><BriefSummary brief={b} /></div>
      </details>
      <div className="j-h3">Clarification thread</div>
      {b.clarifications.length === 0 ? <div className="j-small">No questions yet.</div> : (
        <ul className="jd-timeline">
          {b.clarifications.map((c) => {
            const team = d.staff[c.from]?.team;
            return (
              <li key={c.id}>
                <span className="jd-ti"><Icon name={team === "Philippines" ? "chat" : "send"} size={14} /></span>
                <span>
                  <strong>{S.staffName(d, c.from)}</strong> <span className="j-faint">({team === "Philippines" ? "drawing team" : "office"})</span>
                  <div style={{ margin: "3px 0", overflowWrap: "anywhere" }}>{c.text}</div>
                  <div className="j-row-wrap" style={{ gap: 6 }}>
                    <span className="jd-meta">{fmtDateTime(c.at, TZ_OFFICE, true)} · {fmtDateTime(c.at, TZ_PH, true)}</span>
                    {c.resolved ? <Badge tone="ok" icon="check">Resolved</Badge> : <Badge tone="warn" icon="clock">Waiting for an answer</Badge>}
                  </div>
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {canPost && (
        <div className="j-stack">
          <Field label={office ? "Reply to the drawing team" : "Ask the office"} htmlFor={fid} error={err} hint={office ? "An office reply resolves open questions and resumes the work." : "Asking pauses the return forecast until the office answers."}>
            <textarea id={fid} className="j-textarea" value={text} onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) setErr(""); }} />
          </Field>
          <div className="j-row-wrap">
            <Btn variant="primary" icon="send" onClick={() => {
              if (!text.trim()) { setErr("Write the message first."); return; }
              const r = act.askClarification(b.id, text); if (r.ok) setText("");
            }}>Post to thread</Btn>
          </div>
        </div>
      )}
    </div>
  );
}
