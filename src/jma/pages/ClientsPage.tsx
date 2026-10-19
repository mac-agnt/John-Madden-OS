/* Clients: households, messages, what we are waiting on, and the portal
   preview. Every list reads the demo store, so a reminder, upload or retry
   here shows up on the project, the portal and the activity log at once. */
import { useState, type FormEvent } from "react";
import type { Channel, Client, ClientRequest, Message } from "../types";
import { act, useDemo } from "../store";
import { MODULES, getFilter, go, openDetail, setFilter, tabOf, tabsFor, useUi } from "../ui";
import * as S from "../selectors";
import { Badge, Btn, Empty, Field, Page, PageHead, Panel, SearchBox, Seg, rowProps, cls } from "../kit";
import { stageDef } from "../template";
import { calendarDaysBetween, fmtShortDate } from "../time";
import { MessageItem, PortalButton, canOpenPortal, clientProjects, openPortal, portalStatus } from "./sales/clientBits";
import { isPreviewChannel, plural, when } from "./sales/shared";

export default function ClientsPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Clients")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Clients")) ? tabOf("Clients") : tabs[0].id;
  const attention = visibleMessages(d).filter((m) => m.delivery === "Failed" || m.delivery === "Retrying").length;
  return (
    <Page className="jx-scope">
      <PageHead
        title="Clients"
        sub="Households, every message with its delivery record, and what we are waiting on from clients. All households and messages are fictional; nothing is sent."
        actions={attention > 0 ? <Btn icon="alert" onClick={() => { setFilter("clients.msgView", "attention"); go("Clients", "messages"); }}>{plural(attention, "message")} {attention === 1 ? "needs" : "need"} attention</Btn> : undefined}
      />
      {tab === "directory" && <Directory />}
      {tab === "messages" && <Messages />}
      {tab === "waiting" && <Waiting />}
      {tab === "portal" && <PortalPreview />}
    </Page>
  );
}

function visibleMessages(d: ReturnType<typeof useDemo>): Message[] {
  const vis = S.visibleProjectIds(d);
  return Object.values(d.messages).filter((m) => (m.projectId ? vis.has(m.projectId) : !!m.leadId));
}
function visibleClients(d: ReturnType<typeof useDemo>): Client[] {
  return Object.values(d.clients).filter((c) => clientProjects(d, c.id).length > 0).sort((a, b) => a.household.localeCompare(b.household));
}

/* ── Directory ── */
function Directory() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const clients = visibleClients(d);
  const rows = clients.filter((c) => {
    if (!term) return true;
    const hay = [c.household, c.locality, ...c.contactIds.flatMap((x) => [d.contacts[x]?.name || "", d.contacts[x]?.email || ""]), ...clientProjects(d, c.id).map((p) => p.id + " " + p.locality)];
    return hay.some((x) => x.toLowerCase().includes(term));
  });
  return (
    <Panel title="Client directory" sub={plural(rows.length, "household") + ". The same record opens from Records, Clients and contacts."} flush
      actions={<SearchBox value={q} onChange={setQ} placeholder="Search household, contact, email, project" label="Search clients" />}>
      {rows.length === 0 ? <Empty title="No households match" body="Try a surname, a townland or a project number such as JMA-26016." /> : (
        <div className="j-tablewrap" role="region" aria-label="Client directory table" tabIndex={0}>
          <table className="j-table">
            <thead><tr><th>Household</th><th>Contacts</th><th>Projects</th><th>Latest communication</th><th>Outstanding</th></tr></thead>
            <tbody>
              {rows.map((c) => {
                const projects = clientProjects(d, c.id);
                const pids = new Set(projects.map((p) => p.id));
                const latest = Object.values(d.messages).filter((m) => m.projectId && pids.has(m.projectId) && m.audience === "Client").sort((a, b) => b.at - a.at)[0];
                const reqs = Object.values(d.requests).filter((r) => pids.has(r.projectId));
                const open = reqs.filter((r) => r.state === "Outstanding").length;
                const paused = reqs.filter((r) => r.state === "Paused").length;
                const failed = latest?.delivery === "Failed";
                return (
                  <tr key={c.id} {...rowProps(() => openDetail({ kind: "client", id: c.id }), "Open " + c.household + " household")}>
                    <td><div className="j-cell-main">{c.household} household</div><div className="j-cell-sub">{c.locality}</div></td>
                    <td>{c.contactIds.map((x) => <div key={x} className="j-cell-sub" style={{ marginTop: 0 }}>{d.contacts[x]?.name} <span className="j-faint">({d.contacts[x]?.role})</span></div>)}</td>
                    <td>{projects.map((p) => <div key={p.id} className="j-cell-sub" style={{ marginTop: 0 }}><span className="j-cell-main">{p.id}</span> {stageDef(p.stage).name}</div>)}</td>
                    <td style={{ minWidth: 200 }}>
                      {latest ? <><div className="j-cell-main">{latest.channel} · {latest.direction === "in" ? "from client" : "to client"}{failed ? ", failed" : ""}</div><div className="j-cell-sub">{when(latest.at)}{latest.subject ? " · " + latest.subject : ""}</div></> : <span className="j-dim">No messages yet</span>}
                    </td>
                    <td>
                      {open > 0 ? <Badge tone="warn" icon="clock">{plural(open, "action")} outstanding</Badge> : <Badge tone="ok" icon="check">None outstanding</Badge>}
                      {paused > 0 && <div className="j-cell-sub">{paused} paused</div>}
                    </td>
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

/* ── Messages ── */
type View = "all" | "attention" | "client" | "internal";
function Messages() {
  const d = useDemo();
  useUi();
  const view = getFilter<View>("clients.msgView", "all");
  const projectFilter = getFilter<string>("clients.msgProject", "");
  const all = visibleMessages(d);
  const inView = (m: Message) => view === "all" ? true : view === "attention" ? m.delivery === "Failed" || m.delivery === "Retrying" : view === "client" ? m.audience === "Client" : m.audience === "Internal";
  const list = all.filter((m) => inView(m) && (!projectFilter || m.projectId === projectFilter)).sort((a, b) => b.at - a.at);
  const groups = new Map<string, Message[]>();
  for (const m of list) { const k = m.projectId || "lead:" + m.leadId; groups.set(k, [...(groups.get(k) || []), m]); }
  const projects = S.liveProjects(d).filter((p) => S.visibleProjectIds(d).has(p.id));
  const count = (v: View) => all.filter((m) => (v === "all" ? true : v === "attention" ? m.delivery === "Failed" || m.delivery === "Retrying" : v === "client" ? m.audience === "Client" : m.audience === "Internal")).length;

  return (
    <div className="j-grid j-grid-main">
      <Panel title="Messages" sub="Grouped by project, newest first. Delivery states come from each message's log.">
        <div className="j-toolbar" style={{ marginBottom: 14 }}>
          <Seg label="Show messages" value={view} onChange={(v) => setFilter("clients.msgView", v)}
            options={[{ id: "all", label: "All", count: count("all") }, { id: "attention", label: "Needs attention", count: count("attention") }, { id: "client", label: "Client", count: count("client") }, { id: "internal", label: "Internal notes", count: count("internal") }]} />
          <label className="j-field" style={{ flex: "1 1 200px", maxWidth: 300 }}>
            <span className="j-sr">Project</span>
            <select className="j-select" value={projectFilter} onChange={(e) => setFilter("clients.msgProject", e.target.value)} aria-label="Filter by project">
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {S.household(d, p.id)}</option>)}
            </select>
          </label>
        </div>
        {view === "attention" && list.length > 0 && <div className="j-note warn" style={{ marginBottom: 12 }}>These messages did not reach the client. Retry sends them again through the simulated provider; the original failure stays in the log.</div>}
        {list.length === 0 ? <Empty title={view === "attention" ? "Nothing needs attention" : "No messages"} body={view === "attention" ? "Every message in view reached its recipient, according to its delivery log." : "Change the filter or project."} /> : (
          [...groups.entries()].map(([k, msgs]) => (
            <section key={k} className="jx-group" aria-label={k}>
              <div className="j-row-wrap" style={{ justifyContent: "space-between" }}>
                {k.startsWith("lead:") ? (
                  <button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: k.slice(5) })}>Enquiry {k.slice(5)} · {d.leads[k.slice(5)]?.name}</button>
                ) : (
                  <button type="button" className="j-link" onClick={() => go("Projects", "all", { kind: "project", id: k })}>{k} · {S.household(d, k)}, {d.projects[k]?.locality}</button>
                )}
                <span className="j-small">{plural(msgs.length, "message")}</span>
              </div>
              {msgs.map((m) => <MessageItem key={m.id} m={m} />)}
            </section>
          ))
        )}
      </Panel>
      <Compose defaultProject={projectFilter} />
    </div>
  );
}

const CHANNELS: Channel[] = ["Email", "Portal", "WhatsApp", "SMS"];
function Compose({ defaultProject }: { defaultProject: string }) {
  const d = useDemo();
  const projects = S.liveProjects(d).filter((p) => S.visibleProjectIds(d).has(p.id));
  const [pid, setPid] = useState("");
  const [audience, setAudience] = useState<"Client" | "Internal">("Client");
  const [channel, setChannel] = useState<Channel>("Email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const projectId = pid || defaultProject || projects[0]?.id || "";
  const p = d.projects[projectId];
  const contact = p ? d.contacts[d.clients[p.clientId].contactIds[0]] : undefined;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) { setErr("Write a message first."); return; }
    const r = act.sendMessage({ projectId, body, channel, audience, subject: audience === "Client" && channel === "Email" ? subject.trim() || undefined : undefined });
    if (r.ok) { setBody(""); setSubject(""); setErr(""); } else setErr(r.message);
  };
  return (
    <Panel title="Write a message" sub="Sends through the simulated provider. Internal notes are never shown to the client.">
      <form className="j-stack" onSubmit={submit} noValidate>
        <Field label="Project" htmlFor="jx-c-proj">
          <select id="jx-c-proj" className="j-select" value={projectId} onChange={(e) => setPid(e.target.value)}>
            {projects.map((x) => <option key={x.id} value={x.id}>{x.id} · {S.household(d, x.id)}</option>)}
          </select>
        </Field>
        <div className="j-field">
          <span className="j-label" id="jx-c-aud">Audience</span>
          <Seg label="Audience" value={audience} onChange={setAudience} options={[{ id: "Client", label: "Client message" }, { id: "Internal", label: "Internal note" }]} />
        </div>
        {audience === "Client" && (
          <Field label="Channel" htmlFor="jx-c-chan" hint={isPreviewChannel(channel) ? "Simulated · provider to be selected. Preview only; no WhatsApp or SMS provider is connected." : contact ? "To " + contact.name + " (prefers " + contact.channelPref + ")" : undefined}>
            <select id="jx-c-chan" className="j-select" value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {CHANNELS.map((c) => <option key={c} value={c}>{c}{isPreviewChannel(c) ? " (simulated, provider to be selected)" : ""}</option>)}
            </select>
          </Field>
        )}
        {audience === "Client" && channel === "Email" && (
          <Field label="Subject" htmlFor="jx-c-subj">
            <input id="jx-c-subj" className="j-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
        )}
        <Field label={audience === "Internal" ? "Note" : "Message"} htmlFor="jx-c-body" error={err} hint={audience === "Internal" ? "Visible to office staff only." : "Keep it plain. Do not promise planning outcomes or decision dates."}>
          <textarea id="jx-c-body" className={cls("j-textarea")} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        {audience === "Client" && isPreviewChannel(channel) && body.trim() && (
          <div className="j-note"><div className="j-small" style={{ marginBottom: 4 }}>{channel} preview (simulated)</div>{body}</div>
        )}
        <div className="jx-formfoot">
          <Btn type="submit" variant="primary" icon={audience === "Internal" ? "lock" : "send"}>{audience === "Internal" ? "Save internal note" : "Send (simulated)"}</Btn>
        </div>
      </form>
    </Panel>
  );
}

/* ── Waiting on clients ── */
function Waiting() {
  const d = useDemo();
  const reqs = S.waitingOnClients(d);
  return (
    <Panel title="Waiting on clients" sub={plural(reqs.length, "open request") + ", oldest first. Reminders respect the message limit and stop on upload, pause or cancellation."}>
      {reqs.length === 0 ? <Empty title="Nothing outstanding" body="No documents or decisions are waiting on clients." /> : (
        <div className="jx-queue">{reqs.map((r) => <WaitingItem key={r.id} r={r} />)}</div>
      )}
    </Panel>
  );
}

function WaitingItem({ r }: { r: ClientRequest }) {
  const d = useDemo();
  const p = d.projects[r.projectId];
  const c = d.clients[p.clientId];
  const ct = d.contacts[r.contactId];
  const age = calendarDaysBetween(r.requestedAt, d.now);
  const paused = r.state === "Paused";
  const limit = r.remindersSent >= r.maxReminders;
  const next = paused ? "Paused" : r.nextReminderAt ? when(r.nextReminderAt) + (r.nextReminderAt < d.now ? " (due now)" : "") : limit ? "Limit reached, call instead" : "None scheduled";
  return (
    <div className={cls("jx-qitem", r.blocking && "blocking")}>
      <div style={{ minWidth: 0 }}>
        <div className="j-row-wrap">
          <span className="j-cell-main">{r.label}</span>
          <Badge tone="info" icon={r.kind === "Document" ? "doc" : "check"}>{r.kind}</Badge>
          {r.blocking && <Badge tone="warn" icon="block">Blocks {stageDef(p.stage).name.toLowerCase()}</Badge>}
          {paused ? <Badge tone="neutral" icon="pause">Reminders paused</Badge> : <Badge tone="warn" icon="clock">Outstanding</Badge>}
        </div>
        <div className="j-small" style={{ marginTop: 4 }}>
          <button type="button" className="j-link" onClick={() => openDetail({ kind: "client", id: c.id })}>{c.household} household</button>
          {" · "}
          <button type="button" className="j-link" onClick={() => go("Projects", "all", { kind: "project", id: p.id })}>{p.id}, {p.locality}</button>
          {" · from "}{ct?.name}
        </div>
        <div className="jx-qfacts">
          <span><b>Requested</b> {fmtShortDate(r.requestedAt)}</span>
          <span><b>Age</b> {plural(age, "day")}</span>
          <span><b>Next reminder</b> {next}</span>
          <span><b>Reminders</b> {r.remindersSent} of {r.maxReminders} sent</span>
          <span><b>Owner</b> {S.staffName(d, r.ownerId)}</span>
        </div>
      </div>
      <div className="jx-qactions">
        <Btn size="sm" icon="send" disabled={paused || limit} title={limit ? "Message limit reached. Call the client instead." : paused ? "Resume reminders first." : undefined} onClick={() => act.sendReminder(r.id)}>Send reminder</Btn>
        <Btn size="sm" icon={paused ? "play" : "pause"} onClick={() => act.setRequestPaused(r.id, !paused)}>{paused ? "Resume" : "Pause"}</Btn>
        {r.kind === "Document" && !paused && <Btn size="sm" icon="upload" onClick={() => act.uploadClientDocument(r.id)}>Simulate client upload</Btn>}
        {canOpenPortal(d) && <PortalButton clientId={c.id} />}
      </div>
    </div>
  );
}

/* ── Portal preview ── */
function PortalPreview() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const clients = visibleClients(d);
  const dunne = d.projects["JMA-26025"]?.clientId;
  const featured = ["c-26016", "c-26003", ...(dunne ? [dunne] : [])].filter((id) => d.clients[id] && clientProjects(d, id).length);
  const term = q.trim().toLowerCase();
  const rest = clients.filter((c) => !featured.includes(c.id) && (!term || (c.household + " " + c.locality + " " + clientProjects(d, c.id).map((p) => p.id).join(" ")).toLowerCase().includes(term)));
  return (
    <>
      <div className="j-note">
        This shows what one household sees in its portal. It is a UI preview, not security: in production, access would be enforced by sign-in and server-side permissions.
        A household can only see its own projects and cannot browse other households. To switch household, return to the office preview using the button in the demo strip.
      </div>
      <Panel title="Suggested households" sub="Each shows a different portal state.">
        <div className="jx-cards">
          {featured.map((id) => <PortalCard key={id} c={d.clients[id]} highlight />)}
          {!dunne && <div className="jx-pcard"><div className="j-cell-main">Dunne household</div><div className="j-small">Appears here once the Dunne enquiry is converted to JMA-26025 in Sales.</div><div><Btn size="sm" icon="arrow" onClick={() => go("Sales", "pipeline")}>Go to Sales</Btn></div></div>}
        </div>
      </Panel>
      <Panel title="All households" actions={<SearchBox value={q} onChange={setQ} placeholder="Search household or project" label="Search households" />}>
        {rest.length === 0 ? <Empty title="No households match" /> : <div className="jx-cards">{rest.map((c) => <PortalCard key={c.id} c={c} />)}</div>}
      </Panel>
    </>
  );
}

function PortalCard({ c, highlight }: { c: Client; highlight?: boolean }) {
  const d = useDemo();
  const projects = clientProjects(d, c.id);
  const contact = d.contacts[c.contactIds[0]];
  return (
    <div className={cls("jx-pcard", highlight && "hl")}>
      <div className="j-row-wrap" style={{ justifyContent: "space-between" }}>
        <span className="j-cell-main">{c.household} household</span>
        <span className="j-small">{projects.map((p) => p.id).join(", ")}</span>
      </div>
      <div className="j-text">{portalStatus(d, c)}</div>
      <div className="j-small">Signs in as {contact?.name} ({contact?.role.toLowerCase()} contact)</div>
      <div className="j-row-wrap">
        <Btn size="sm" variant={highlight ? "primary" : "secondary"} icon="eye" onClick={() => openPortal(d, c.id)}>Preview portal</Btn>
        <Btn size="sm" variant="ghost" onClick={() => openDetail({ kind: "client", id: c.id })}>Client record</Btn>
      </div>
    </div>
  );
}
