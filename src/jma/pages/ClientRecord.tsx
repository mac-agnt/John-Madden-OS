/* Client (household) record, the drawer body opened from Clients, Records and
   project pages alike. */
import { act, useDemo } from "../store";
import { go, openDetail, setFilter } from "../ui";
import * as S from "../selectors";
import { Badge, Btn, Empty, KV, Panel } from "../kit";
import { stageDef } from "../template";
import { calendarDaysBetween, fmtShortDate } from "../time";
import { MessageItem, PortalButton, clientProjects, portalStatus } from "./sales/clientBits";
import { DepositBadge, QuoteStatusBadge, plural, when } from "./sales/shared";

export default function ClientRecord({ id }: { id: string; tab?: string; versionId?: string }) {
  const d = useDemo();
  const c = d.clients[id];
  if (!c) return <Empty title="Client not found" />;
  const projects = clientProjects(d, c.id);
  const pids = new Set(projects.map((p) => p.id));
  const restricted = d.persona.kind === "philippines";
  const fees = S.canSeeFees(d);
  const reqs = Object.values(d.requests).filter((r) => pids.has(r.projectId) && (r.state === "Outstanding" || r.state === "Paused")).sort((a, b) => a.requestedAt - b.requestedAt);
  const msgs = Object.values(d.messages).filter((m) => m.projectId && pids.has(m.projectId)).sort((a, b) => b.at - a.at);
  const docs = S.visibleDocs(d).filter((x) => x.clientId === c.id || (x.projectId && pids.has(x.projectId))).sort((a, b) => b.at - a.at);
  const leads = Object.values(d.leads).filter((l) => l.clientId === c.id || l.duplicateOfClientId === c.id);

  if (restricted) {
    return (
      <div className="j-stack jx-scope">
        <div className="j-note">Contact details, messages and fees are not shown in the Philippines preview. Drawing inputs are in your brief.</div>
        {projects.map((p) => <div key={p.id} className="j-text">{p.id} · {p.locality} · {stageDef(p.stage).name}</div>)}
      </div>
    );
  }

  return (
    <div className="j-stack jx-scope">
      <KV items={[
        ["Household", c.household + ", " + c.locality],
        ["Portal state", portalStatus(d, c)],
        ["Client since", fmtShortDate(c.createdAt)],
        ["Outstanding from client", reqs.length ? plural(reqs.length, "request") : "Nothing outstanding"],
      ]} />

      <Panel title="Contacts" sub="Email addresses at example.com are fictional. Nothing is sent from this demo.">
        <div className="j-list">
          {c.contactIds.map((cid) => {
            const ct = d.contacts[cid];
            if (!ct) return null;
            return (
              <div key={cid} className="j-list-item">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="j-row-wrap"><span className="j-cell-main">{ct.name}</span><Badge tone="neutral" icon="user">{ct.role}</Badge></div>
                  <div className="j-small">{ct.email} · {ct.phone || "No phone"}</div>
                  <div className="j-small">Prefers {ct.channelPref}{ct.channelPref === "WhatsApp" || ct.channelPref === "SMS" ? " (simulated, provider to be selected)" : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel title="Projects">
        {projects.length === 0 ? <Empty title="No visible project" /> : (
          <div className="j-list">
            {projects.map((p) => {
              const q = p.quoteId ? d.quotes[p.quoteId] : undefined;
              return (
                <div key={p.id} className="j-list-item" style={{ flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                    <div className="j-row-wrap"><span className="j-cell-main">{p.id}</span><span className="j-small">{p.locality}</span><Badge tone="info" icon="layers">{stageDef(p.stage).name}</Badge></div>
                    <div className="j-small">Owner {S.staffName(d, p.ownerId)} · {S.nextAction(d, p)}</div>
                    {fees && q && <div className="j-small">Quote {q.id}: {S.euro(q.amount)} demo fee, tax treatment to confirm · <QuoteStatusBadge status={q.status} /> <DepositBadge status={q.deposit.status} /></div>}
                  </div>
                  <div className="j-row-wrap">
                    <Btn size="sm" icon="arrow" onClick={() => go("Projects", "all", { kind: "project", id: p.id })}>Open project</Btn>
                    <PortalButton clientId={c.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {leads.length > 0 && (
          <div className="j-small" style={{ marginTop: 10 }}>
            Enquiries linked to this household:{" "}
            {leads.map((l, i) => <span key={l.id}>{i > 0 && ", "}<button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: l.id })}>{l.id} ({l.locality}, {l.status.toLowerCase()})</button></span>)}
          </div>
        )}
      </Panel>

      <Panel title="Outstanding requests">
        {reqs.length === 0 ? <div className="j-small">Nothing outstanding from this household.</div> : (
          <div className="j-list">
            {reqs.map((r) => {
              const paused = r.state === "Paused";
              const limit = r.remindersSent >= r.maxReminders;
              return (
                <div key={r.id} className="j-list-item" style={{ flexWrap: "wrap" }}>
                  <div style={{ minWidth: 0, flex: "1 1 240px" }}>
                    <div className="j-row-wrap">
                      <span className="j-cell-main">{r.label}</span>
                      {r.blocking && <Badge tone="warn" icon="block">Blocking</Badge>}
                      {paused && <Badge tone="neutral" icon="pause">Paused</Badge>}
                    </div>
                    <div className="j-small">{r.projectId} · requested {fmtShortDate(r.requestedAt)} ({plural(calendarDaysBetween(r.requestedAt, d.now), "day")}) · reminders {r.remindersSent} of {r.maxReminders} · next {paused ? "paused" : r.nextReminderAt ? when(r.nextReminderAt) : "none scheduled"}</div>
                  </div>
                  <div className="j-row-wrap">
                    <Btn size="sm" icon="send" disabled={paused || limit} onClick={() => act.sendReminder(r.id)}>Send reminder</Btn>
                    {r.kind === "Document" && !paused && <Btn size="sm" icon="upload" onClick={() => act.uploadClientDocument(r.id)}>Simulate client upload</Btn>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Recent messages" sub={msgs.length > 5 ? "Latest 5 of " + msgs.length + "." : undefined}
        actions={msgs.length > 0 ? <Btn size="sm" variant="ghost" onClick={() => { setFilter("clients.msgProject", projects.length === 1 ? projects[0].id : ""); setFilter("clients.msgView", "all"); go("Clients", "messages"); }}>All messages</Btn> : undefined}>
        {msgs.length === 0 ? <div className="j-small">No messages yet.</div> : <div className="j-stack">{msgs.slice(0, 5).map((m) => <MessageItem key={m.id} m={m} showProject={projects.length > 1} />)}</div>}
      </Panel>

      <Panel title="Documents" sub="References to the proposed SharePoint locations. The demo does not connect to SharePoint.">
        {docs.length === 0 ? <div className="j-small">No documents visible.</div> : (
          <div className="j-list">
            {docs.map((x) => (
              <div key={x.id} className="j-list-item">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <button type="button" className="j-link" onClick={() => openDetail({ kind: "document", id: x.id })}>{x.name}</button>
                  <div className="j-small">{x.type} · {x.projectId || "No project"} · {when(x.at)}</div>
                </div>
                <Badge tone={x.visibility === "Client" ? "accent" : "neutral"} icon={x.visibility === "Client" ? "eye" : "lock"}>{x.visibility}{x.published ? ", published" : ""}</Badge>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
