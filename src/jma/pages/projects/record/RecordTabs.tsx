/* Project record tabs: Drawings, Documents, Messages and History. */
import { useState } from "react";
import type { Channel, Message } from "../../../types";
import { act, useDemo } from "../../../store";
import * as S from "../../../selectors";
import { openDetail } from "../../../ui";
import { stageDef } from "../../../template";
import { Badge, Btn, DateTag, Empty, Field, Seg, rowProps, type Tone } from "../../../kit";
import { fmtDateTime } from "../../../time";
import { ACTOR_LABEL, ACTOR_TONE, isOffice } from "../common";

/* ── Drawings ── */
export function DrawingsTab({ id }: { id: string }) {
  const d = useDemo();
  const list = S.drawingsFor(d, id);
  if (!list.length) return <Empty title="No drawings yet" body="A drawing record is created with the brief. Versions appear here when the drawing team uploads them." />;
  return (
    <div className="j-tablewrap">
      <table className="j-table jp-table">
        <thead><tr><th>Drawing</th><th>Latest uploaded</th><th>Latest issued to client</th><th>Approval</th><th>Open changes</th></tr></thead>
        <tbody>
          {list.map((dw) => {
            const up = S.latestUploaded(d, dw.id);
            const rel = S.latestReleased(d, dw.id);
            const ap = rel ? S.approvalFor(d, rel.id) : undefined;
            const am = S.openAmendments(d, id).filter((a) => S.versionsFor(d, dw.id).some((v) => v.id === a.versionId));
            return (
              <tr key={dw.id} {...rowProps(() => openDetail({ kind: "drawing", id: dw.id }), "Open drawing " + dw.number)}>
                <td><div className="j-cell-main">{dw.number}</div><div className="j-cell-sub">{dw.title}</div></td>
                <td>{up ? <><div>Rev {up.rev}</div><div className="j-cell-sub">{up.state}, {fmtDateTime(up.uploadedAt)}</div></> : <span className="j-dim">Nothing uploaded</span>}</td>
                <td>{rel ? <><div>Rev {rel.rev}</div><div className="j-cell-sub">Released {fmtDateTime(rel.releasedAt)}</div></> : <span className="j-dim">Not issued</span>}</td>
                <td>{ap ? <Badge tone="ok" icon="check">Approved Rev {rel!.rev} by {S.staffName(d, ap.actorId)}</Badge> : rel ? <Badge tone="warn" icon="clock">Awaiting client decision</Badge> : <Badge tone="neutral" icon="info">Nothing to approve</Badge>}</td>
                <td>{am.length ? <Badge tone="warn" icon="edit">{am.length} open</Badge> : <span className="j-dim">None</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Documents ── */
const kindOf = (mime?: string, asset?: string) => {
  const ext = (asset || "").split(".").pop()?.toLowerCase();
  if (mime === "image/svg+xml" || ext === "svg") return "SVG image";
  if (mime === "application/pdf" || ext === "pdf") return "PDF";
  if (mime === "text/plain" || ext === "txt") return "text file";
  return (ext || "file").toUpperCase() + " file";
};
export function DocumentsTab({ id }: { id: string }) {
  const d = useDemo();
  const docs = S.visibleDocs(d).filter((x) => x.projectId === id).sort((a, b) => b.at - a.at);
  if (!docs.length) return <Empty title="No documents visible" body="Documents for this job appear here when they are uploaded or published." />;
  return (
    <div className="j-stack">
      <div className="j-small">Storage paths are proposed SharePoint references only. The demo does not connect to SharePoint; sample files download where one is attached.</div>
      <div className="j-tablewrap">
        <table className="j-table jp-table">
          <thead><tr><th>Document</th><th>Type</th><th>Visibility</th><th>Uploaded</th><th>Storage reference</th><th>File</th></tr></thead>
          <tbody>
            {docs.map((x) => {
              const file = x.asset ? x.asset.split("/").pop() : undefined;
              return (
                <tr key={x.id}>
                  <td style={{ minWidth: 200 }}><button type="button" className="j-link" onClick={() => openDetail({ kind: "document", id: x.id })}>{x.name}</button><div className="j-cell-sub">Version {x.version}</div></td>
                  <td>{x.type}</td>
                  <td><Badge tone={x.visibility === "Client" ? "info" : "neutral"} icon={x.visibility === "Client" ? "eye" : "lock"}>{x.visibility}{x.visibility === "Client" ? (x.published ? ", published" : ", not published") : ""}</Badge></td>
                  <td><div>{fmtDateTime(x.at)}</div><div className="j-cell-sub">{S.staffName(d, x.uploadedBy)}</div></td>
                  <td style={{ minWidth: 200 }}><div className="j-cell-sub" style={{ marginTop: 0 }}>Reference only: {x.storage}</div></td>
                  <td>{x.asset && file ? <a className="j-btn j-btn-secondary j-btn-sm" href={x.asset} download={file}>Download {kindOf(x.mime, x.asset)}{x.size ? " (" + x.size + ")" : ""}</a> : <span className="j-dim">No sample file</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Messages ── */
const DELIVERY: Record<Message["delivery"], { tone: Tone; icon: string }> = {
  Queued: { tone: "neutral", icon: "clock" }, Sent: { tone: "info", icon: "send" }, Delivered: { tone: "ok", icon: "check" }, Failed: { tone: "bad", icon: "alert" }, Retrying: { tone: "warn", icon: "refresh" },
};
type Aud = "Client" | "Internal";
export function MessagesTab({ id }: { id: string }) {
  const d = useDemo();
  const pk = d.persona.kind;
  const msgs = Object.values(d.messages).filter((m) => m.projectId === id && m.at <= d.now + 60000)
    .filter((m) => (pk === "admin" || pk === "mullingar" || pk === "sales") ? true : pk === "client" ? m.audience === "Client" : m.audience === "Supplier")
    .sort((a, b) => a.at - b.at);
  const canInternal = isOffice(d) || pk === "sales";
  const canSend = canInternal || pk === "client";
  const [aud, setAud] = useState<Aud>("Client");
  const [channel, setChannel] = useState<Channel>("Email");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const send = () => {
    if (!body.trim()) { setErr("Write a message first."); return; }
    const r = act.sendMessage({ projectId: id, body: body.trim(), channel: aud === "Internal" ? "Internal note" : pk === "client" ? "Portal" : channel, audience: aud });
    if (r.ok) { setBody(""); setErr(""); } else setErr(r.message);
  };
  const who = (m: Message) => S.staffName(d, m.fromId);

  return (
    <div className="j-stack">
      {msgs.length === 0 ? <Empty title="No messages on this job" /> : msgs.map((m) => {
        const internal = m.audience === "Internal";
        const dv = DELIVERY[m.delivery];
        return (
          <article key={m.id} className={internal ? "j-note internal" : "jp-msg" + (m.direction === "in" ? " in" : "")} aria-label={(internal ? "Internal note" : m.direction === "in" ? "Received" : "Sent") + " " + fmtDateTime(m.at)}>
            <div className="jp-msg-head">
              <strong>{who(m)}</strong>
              <span>{fmtDateTime(m.at)}</span>
              {internal ? <Badge tone="neutral" icon="lock">Internal note · never shown to the client</Badge> : (
                <>
                  <Badge tone="neutral" icon={m.direction === "in" ? "back" : "send"}>{m.direction === "in" ? "From client" : "To " + m.audience.toLowerCase()}</Badge>
                  <Badge tone="info" icon="chat">{m.channel}</Badge>
                  {m.automated && <Badge tone="neutral" icon="bolt">Automated</Badge>}
                  <Badge tone={dv.tone} icon={dv.icon}>{m.delivery}</Badge>
                </>
              )}
            </div>
            {m.subject && <div className="j-cell-main" style={{ marginTop: 4 }}>{m.subject}</div>}
            <div className="jp-msg-body" style={{ marginTop: 4 }}>{m.body}</div>
            {!internal && (
              <div className="jp-bar-row" style={{ marginTop: 6 }}>
                <details className="jp-log"><summary>Delivery log ({m.deliveryLog.length})</summary>
                  <ol>{m.deliveryLog.map((l, i) => <li key={i}>{l.state}, {fmtDateTime(l.at)}{l.note ? ": " + l.note : ""}</li>)}</ol>
                </details>
                {m.delivery === "Failed" && canInternal && <Btn size="sm" icon="refresh" onClick={() => act.retryMessage(m.id)}>Retry</Btn>}
              </div>
            )}
          </article>
        );
      })}

      {canSend && (
        <div className="j-stack" style={{ gap: 10, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
          <div className="j-label">New message</div>
          {canInternal && (
            <div className="j-row-wrap">
              <Seg<Aud> label="Audience" value={aud} onChange={setAud} options={[{ id: "Client", label: "Client" }, { id: "Internal", label: "Internal note" }]} />
              {aud === "Client" && (
                <label className="jp-filter" style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><span>Channel</span>
                  <select className="j-select" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
                    {(["Email", "Portal", "WhatsApp", "SMS"] as Channel[]).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
          <Field label={aud === "Internal" ? "Internal note (staff only)" : "Message to the client"} htmlFor={"msg-" + id} error={err}
            hint={aud === "Internal" ? "Never shown to the client or the Philippines team." : "Simulated: nothing is sent outside this demo."}>
            <textarea id={"msg-" + id} className="j-textarea" value={body} onChange={(e) => { setBody(e.target.value); setErr(""); }} />
          </Field>
          {aud === "Client" && pk !== "client" && body.trim() && (channel === "WhatsApp" || channel === "SMS") && (
            <div className="j-note">
              <div className="j-label" style={{ marginBottom: 4 }}>{channel} preview (simulated)</div>
              <div className="jp-msg-body">{channel === "SMS" ? body.trim().slice(0, 160) : body.trim()}</div>
              {channel === "SMS" && <div className="j-small" style={{ marginTop: 4 }}>{body.trim().length} characters{body.trim().length > 160 ? ", would send as " + Math.ceil(body.trim().length / 153) + " parts" : ""}</div>}
            </div>
          )}
          <div className="j-actions"><Btn variant="primary" icon="send" onClick={send}>{aud === "Internal" ? "Save internal note" : "Send (simulated)"}</Btn></div>
        </div>
      )}
    </div>
  );
}

/* ── History ── */
export function HistoryTab({ id }: { id: string }) {
  const d = useDemo();
  const p = d.projects[id];
  const evs = S.visibleEvents(d).filter((e) => e.subject.id === id).slice().sort((a, b) => b.at - a.at);
  const office = isOffice(d) || d.persona.kind === "sales";
  return (
    <div className="j-stack">
      {office && (
        <div className="j-stack" style={{ gap: 8 }}>
          <div className="j-h3">Stage history</div>
          <div className="j-small">Template snapshot for this job: {p.templateVersion}. Later template versions do not change it.</div>
          <div className="j-tablewrap">
            <table className="j-table jp-table">
              <thead><tr><th>Stage</th><th>Entered</th><th>Exited</th><th>By</th><th>Override reason</th></tr></thead>
              <tbody>
                {p.history.slice().reverse().map((h, i) => (
                  <tr key={i}>
                    <td>{stageDef(h.stage).n}. {stageDef(h.stage).name}</td>
                    <td><DateTag ts={h.enteredAt} /></td>
                    <td>{h.exitedAt ? <DateTag ts={h.exitedAt} /> : <Badge tone="info" icon="clock">Current</Badge>}</td>
                    <td>{S.staffName(d, h.by)}</td>
                    <td>{h.override ? <Badge tone="warn" icon="shield">{h.override}</Badge> : <span className="j-dim">None</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <div className="j-h3">Activity on this job</div>
      {evs.length === 0 ? <Empty title="No activity visible" /> : (
        <div className="j-list">
          {evs.map((e) => (
            <div key={e.id} className="j-list-item">
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className="j-text" style={{ fontSize: 13 }}>{e.summary}</div>
                <div className="j-row-wrap" style={{ marginTop: 4 }}>
                  <span className="j-cell-sub" style={{ marginTop: 0 }}>{fmtDateTime(e.at)} · {e.actor.name}</span>
                  <Badge tone={ACTOR_TONE[e.actor.kind]} icon={e.actor.kind === "agent" ? "bolt" : e.actor.kind === "staff" ? "user" : "info"}>{ACTOR_LABEL[e.actor.kind]}</Badge>
                  {e.status === "attention" && <Badge tone="warn" icon="alert">Needs attention</Badge>}
                  {e.status === "failed" && <Badge tone="bad" icon="alert">Failed</Badge>}
                </div>
              </div>
              <Btn size="sm" variant="ghost" icon="eye" onClick={() => openDetail({ kind: "event", id: e.id })} ariaLabel={"Open event: " + e.summary} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
