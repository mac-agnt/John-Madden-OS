/* Sales: lead capture, response, quoting and conversion. Every figure is
   computed from the lead and quote records in the demo store. Fees are
   illustrative service-fee placeholders, never revenue or cash. */
import { useState, type FormEvent } from "react";
import type { Lead, LeadSource, LeadStatus, Quote } from "../types";
import { act, useDemo } from "../store";
import { MODULES, go, openDetail, setTab, tabOf, tabsFor, useUi } from "../ui";
import * as S from "../selectors";
import { Badge, Btn, Dialog, Empty, Field, Icon, Page, PageHead, Panel, SearchBox, Seg, Stat, rowProps } from "../kit";
import { dueLabel, fmtDate, fmtShortDate } from "../time";
import { recordManualLead, setQuoteExpiry } from "./sales/actions";
import { DeliveryBadge, DepositBadge, LeadStatusBadge, QuoteStatusBadge, SOURCES, SourceBadge, isAutoSource, plural, quoteFor, when, whenSecs } from "./sales/shared";

const COLS: LeadStatus[] = ["New", "Contacted", "Qualified", "Quote sent", "Accepted", "Lost"];
const DAY = 86400000;

export default function SalesPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Sales")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Sales")) ? tabOf("Sales") : tabs[0].id;
  const fees = S.canSeeFees(d);

  const simulate = () => {
    act.simulateWebsiteEnquiry();
    openDetail({ kind: "lead", id: "LEAD-009" });
  };
  const toForm = () => {
    setTab("Sales", "enquiries");
    setTimeout(() => document.getElementById("jx-lead-name")?.focus(), 60);
  };

  return (
    <Page className="jx-scope">
      <PageHead
        title="Sales"
        sub="Enquiries, first responses, quotes and conversion to a project. Fees shown are illustrative demo placeholders, not revenue or cash. No real messages are sent."
        actions={<>
          <Btn variant="primary" icon="bolt" onClick={simulate}>Simulate website enquiry</Btn>
          <Btn icon="plus" onClick={toForm}>Record an enquiry</Btn>
        </>}
      />
      <div className="jx-stats">
        <Stat label="Open leads" value={S.openLeads(d).length} sub="Not yet converted or lost" onClick={() => setTab("Sales", "pipeline")} />
        <Stat label="Quotes sent" value={S.sentQuotes(d).length} sub="Awaiting the client's decision" onClick={() => setTab("Sales", "quotes")} />
        {fees && <Stat label="Quoted pipeline" value={S.euro(S.quotedPipeline(d))} sub="Demo fees on sent quotes. Not revenue or cash." onClick={() => setTab("Sales", "quotes")} />}
        <Stat label="New enquiries today" value={S.newEnquiriesToday(d)} sub={"Received " + fmtDate(d.now)} onClick={() => setTab("Sales", "enquiries")} />
      </div>
      {tab === "pipeline" && <Pipeline fees={fees} />}
      {tab === "enquiries" && <Enquiries />}
      {tab === "quotes" && <Quotes fees={fees} />}
      {tab === "followups" && <FollowUps />}
    </Page>
  );
}

/* ── Pipeline ── */
function Pipeline({ fees }: { fees: boolean }) {
  const d = useDemo();
  const leads = Object.values(d.leads).sort((a, b) => b.receivedAt - a.receivedAt);
  const colOf = (l: Lead): LeadStatus => (l.status === "Quote sent" && quoteFor(d, l.id)?.status === "Accepted" ? "Accepted" : l.status);
  return (
    <Panel title="Pipeline" sub={plural(S.openLeads(d).length, "open lead") + ". Converted leads leave the open pipeline and are folded under Accepted with their project. Lost leads are folded with the reason."}>
      <div className="jx-boardwrap" role="region" aria-label="Pipeline columns" tabIndex={0}>
        <div className="jx-board">
          {COLS.map((col) => {
            const inCol = leads.filter((l) => colOf(l) === col);
            const open = inCol.filter((l) => l.status !== "Accepted" && l.status !== "Lost");
            const converted = inCol.filter((l) => l.status === "Accepted");
            const lost = inCol.filter((l) => l.status === "Lost");
            return (
              <section key={col} className="jx-col" aria-label={col + " column"}>
                <div className="jx-col-head"><h3 className="j-h3">{col}</h3><span className="jx-col-count">{col === "Lost" ? lost.length : open.length}{col === "Accepted" && converted.length ? " open · " + converted.length + " converted" : ""}</span></div>
                {open.map((l) => <LeadCard key={l.id} l={l} fees={fees} />)}
                {!open.length && !converted.length && !lost.length && <div className="j-small">None</div>}
                {converted.length > 0 && (
                  <details className="jx-fold">
                    <summary><Icon name="down" size={12} />{plural(converted.length, "lead")} converted to projects</summary>
                    <div className="jx-fold-list">
                      {converted.map((l) => (
                        <div key={l.id} className="jx-fold-item">
                          <button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: l.id })}>{l.id} · {l.name}</button>
                          {l.projectId && <button type="button" className="j-link" onClick={() => go("Projects", "all", { kind: "project", id: l.projectId! })}><Icon name="arrow" size={11} /> Project {l.projectId}</button>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
                {lost.length > 0 && (
                  <details className="jx-fold">
                    <summary><Icon name="down" size={12} />{plural(lost.length, "lost lead")}</summary>
                    <div className="jx-fold-list">
                      {lost.map((l) => (
                        <div key={l.id} className="jx-fold-item">
                          <button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: l.id })}>{l.id} · {l.name}</button>
                          <span className="j-small">Reason: {l.lostReason || "Not recorded"}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

function LeadCard({ l, fees }: { l: Lead; fees: boolean }) {
  const d = useDemo();
  const q = quoteFor(d, l.id);
  const awaitingConvert = q?.status === "Accepted" && !l.projectId;
  return (
    <button type="button" className="j-card" onClick={() => openDetail({ kind: "lead", id: l.id })} aria-label={"Open " + l.id + " " + l.name}>
      <div className="jx-card-top">
        <span className="jx-card-name">{l.name}</span>
        <SourceBadge source={l.source} />
      </div>
      <div className="jx-meta">
        <span>{l.locality}</span>
        <span>{l.id}</span>
        <span>Owner {S.firstName(d, l.ownerId)}</span>
      </div>
      <div className="jx-meta">
        <span>Next contact: {l.nextContactAt ? fmtShortDate(l.nextContactAt) : "Not scheduled"}</span>
        {fees && q && q.status !== "Declined" && <span><b>{S.euro(q.amount)}</b> Demo fee</span>}
      </div>
      {awaitingConvert && <Badge tone="warn" icon="clock">Accepted, conversion pending</Badge>}
      {l.duplicateOfClientId && <Badge tone="info" icon="user">Existing client, new site</Badge>}
    </button>
  );
}

/* ── Enquiries ── */
function Enquiries() {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [src, setSrc] = useState<"all" | LeadSource>("all");
  const all = Object.values(d.leads).sort((a, b) => b.receivedAt - a.receivedAt);
  const term = q.trim().toLowerCase();
  const rows = all.filter((l) => (src === "all" || l.source === src) && (!term || [l.id, l.name, l.locality, l.email].some((x) => x.toLowerCase().includes(term))));
  const dupRuns = Object.values(d.runs).filter((r) => r.result === "Skipped: duplicate" && r.subject.kind === "lead").sort((a, b) => b.at - a.at);
  const dedupEvents = d.events.filter((e) => e.type === "lead.deduplicated");
  const linked = all.filter((l) => l.duplicateOfClientId);

  return (
    <>
      <div className="j-note">
        <b>Automated acknowledgement</b> is the simulated email the workflow sends after a website or email enquiry, timed in seconds from receipt.{" "}
        <b>Human response</b> is the first conversation a member of staff logs. They are tracked separately, and one never counts as the other.{" "}
        Phone and walk-in enquiries are captured by staff, so there is no automated acknowledgement and no response promise before capture.
      </div>
      <Panel title="Enquiries" sub={plural(rows.length, "enquiry", "enquiries") + " shown, newest first"} flush
        actions={<SearchBox value={q} onChange={setQ} placeholder="Search name, locality, email" label="Search enquiries" />}>
        <div style={{ padding: "0 20px 12px" }}>
          <Seg label="Filter by source" value={src} onChange={setSrc}
            options={[{ id: "all", label: "All", count: all.length }, ...SOURCES.map((s) => ({ id: s, label: s, count: all.filter((l) => l.source === s).length }))]} />
        </div>
        {rows.length === 0 ? <Empty title="No enquiries match" body="Clear the search or pick another source." /> : (
          <div className="j-tablewrap" role="region" aria-label="Enquiries table" tabIndex={0}>
            <table className="j-table">
              <thead><tr><th>Enquiry</th><th>Source</th><th>Received</th><th>Automated acknowledgement</th><th>Human response</th><th>Owner</th><th>Status</th></tr></thead>
              <tbody>
                {rows.map((l) => <EnquiryRow key={l.id} l={l} />)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className="j-grid j-grid-2">
        <ManualCapture />
        <Panel title="Duplicate handling" sub="Repeat submissions are recorded, never turned into a second lead, task or acknowledgement.">
          {dupRuns.length === 0 && dedupEvents.length === 0 && linked.length === 0 ? <Empty title="No duplicates recorded" /> : (
            <div className="j-list">
              {dupRuns.map((r) => (
                <div key={r.id} className="j-list-item">
                  <Badge tone="info" icon="layers">Skipped: duplicate</Badge>
                  <div style={{ minWidth: 0 }}>
                    <button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: r.subject.id })}>{r.subject.id}{d.leads[r.subject.id] ? " · " + d.leads[r.subject.id].name : ""}</button>
                    <div className="j-small">{r.detail}</div>
                    <div className="j-small">{whenSecs(r.at)}</div>
                  </div>
                </div>
              ))}
              {dedupEvents.map((e) => (
                <div key={e.id} className="j-list-item">
                  <Badge tone="ok" icon="check">Merged</Badge>
                  <div style={{ minWidth: 0 }}>
                    <div className="j-text">{e.summary}</div>
                    <div className="j-small">{e.actor.name} · {when(e.at)}</div>
                  </div>
                </div>
              ))}
              {linked.map((l) => (
                <div key={l.id} className="j-list-item">
                  <Badge tone="info" icon="user">Existing client</Badge>
                  <div style={{ minWidth: 0 }}>
                    <button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: l.id })}>{l.id} · {l.name}</button>
                    <div className="j-small">Same email as the {d.clients[l.duplicateOfClientId!]?.household} household. Kept as a new lead for a different site ({l.locality}) and linked to the existing client record, not merged.</div>
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

function EnquiryRow({ l }: { l: Lead }) {
  const d = useDemo();
  const ack = S.ackSeconds(l);
  const msg = l.ackMessageId ? d.messages[l.ackMessageId] : undefined;
  const hrs = S.humanResponseHours(l);
  return (
    <tr {...rowProps(() => openDetail({ kind: "lead", id: l.id }), "Open " + l.id + " " + l.name)}>
      <td><div className="j-cell-main">{l.name}</div><div className="j-cell-sub">{l.id} · {l.locality}</div></td>
      <td><SourceBadge source={l.source} /></td>
      <td className="j-mono">{whenSecs(l.receivedAt)}</td>
      <td>
        {ack != null ? (
          <><div className="j-cell-main j-mono">+{ack} s after receipt</div><div className="j-cell-sub">{msg ? <DeliveryBadge state={msg.delivery} /> : "Email (simulated)"}</div></>
        ) : (
          <><div className="j-cell-main">None</div><div className="j-cell-sub">{l.source === "Phone" || l.source === "Walk-in" ? "Manual capture. No response promise before capture." : isAutoSource(l.source) ? "Recorded by staff, not by the web form" : "Recorded by staff"}</div></>
        )}
      </td>
      <td>
        {hrs != null ? (
          <><div className="j-cell-main j-mono">{hrs.toFixed(1)} h after receipt</div><div className="j-cell-sub">{when(l.firstHumanResponseAt)}</div></>
        ) : (
          <><div className="j-cell-main">Not yet</div><div className="j-cell-sub">{l.nextContactAt ? dueLabel(l.nextContactAt, d.now) : "No follow-up scheduled"}</div></>
        )}
      </td>
      <td>{S.staffName(d, l.ownerId)}</td>
      <td><LeadStatusBadge status={l.status} /></td>
    </tr>
  );
}

type FormState = { name: string; locality: string; source: LeadSource; email: string; phone: string; notes: string };
const EMPTY: FormState = { name: "", locality: "", source: "Phone", email: "", phone: "", notes: "" };

function ManualCapture() {
  const [f, setF] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState | "form", string>>>({});
  const [dupId, setDupId] = useState<string | undefined>();
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const er: typeof errors = {};
    if (!f.name.trim()) er.name = "Enter the enquirer's name.";
    if (!f.locality.trim()) er.locality = "Enter the site locality, for example Moate.";
    if (!f.email.trim() && !f.phone.trim()) er.phone = "Add an email or a phone number so someone can respond.";
    if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) er.email = "That email address does not look complete.";
    setErrors(er); setDupId(undefined);
    if (Object.keys(er).length) return;
    const r = recordManualLead(f);
    if (r.ok && r.id) { setF(EMPTY); openDetail({ kind: "lead", id: r.id }); }
    else { setErrors({ form: r.message }); setDupId(r.id); }
  };

  const manual = f.source === "Phone" || f.source === "Walk-in";
  return (
    <Panel title="Record an enquiry by hand" sub="For phone calls, walk-ins at Blackhall Street, referrals and emails. Niamh Doyle owns the follow-up.">
      <form className="jx-form" onSubmit={submit} noValidate>
        <Field label="Name" htmlFor="jx-lead-name" error={errors.name}>
          <input id="jx-lead-name" className="j-input" value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" aria-invalid={!!errors.name} />
        </Field>
        <Field label="Site locality" htmlFor="jx-lead-loc" error={errors.locality}>
          <input id="jx-lead-loc" className="j-input" value={f.locality} onChange={(e) => set("locality", e.target.value)} autoComplete="off" aria-invalid={!!errors.locality} />
        </Field>
        <Field label="Source" htmlFor="jx-lead-src" hint={manual ? "Manual channel: no automated acknowledgement. The follow-up task is the first response." : "Recorded by staff, so no automated acknowledgement is sent from here."}>
          <select id="jx-lead-src" className="j-select" value={f.source} onChange={(e) => set("source", e.target.value as LeadSource)}>
            {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Email" htmlFor="jx-lead-email" error={errors.email} hint="Checked against open leads and existing clients.">
          <input id="jx-lead-email" className="j-input" type="email" value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="off" aria-invalid={!!errors.email} />
        </Field>
        <Field label="Phone" htmlFor="jx-lead-phone" error={errors.phone}>
          <input id="jx-lead-phone" className="j-input" type="tel" value={f.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="off" aria-invalid={!!errors.phone} />
        </Field>
        <div className="jx-span">
          <Field label="Notes" htmlFor="jx-lead-notes">
            <textarea id="jx-lead-notes" className="j-textarea" value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
        </div>
        {errors.form && (
          <div className="jx-span j-note warn" role="alert">
            {errors.form}
            {dupId && <> <button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: dupId })}>Open {dupId}</button></>}
          </div>
        )}
        <div className="jx-span jx-formfoot">
          <Btn type="submit" variant="primary" icon="plus">Record enquiry</Btn>
          <Btn variant="ghost" onClick={() => { setF(EMPTY); setErrors({}); setDupId(undefined); }}>Clear</Btn>
        </div>
        <div className="jx-span j-small">
          Demo tips: barry.murray@example.com belongs to an existing client (Murray, JMA-26024), so the enquiry is kept as a new lead for another site and linked to that client.
          fiona.gannon@example.com matches open lead LEAD-004, so it is stopped as a possible duplicate.
        </div>
      </form>
    </Panel>
  );
}

/* ── Quotes ── */
function Quotes({ fees }: { fees: boolean }) {
  const d = useDemo();
  const quotes = Object.values(d.quotes).sort((a, b) => a.id.localeCompare(b.id));
  const [waiveFor, setWaiveFor] = useState<string | null>(null);
  return (
    <>
      <Panel title="Quotes" sub="Amounts are illustrative service-fee placeholders. Tax treatment is to be confirmed. No VAT is calculated and no invoices are raised." flush>
        {quotes.length === 0 ? <Empty title="No quotes yet" /> : (
          <div className="j-tablewrap" role="region" aria-label="Quotes table" tabIndex={0}>
            <table className="j-table">
              <thead><tr><th>Quote</th><th>Lead</th><th>Scope</th><th>Amount</th><th>Expiry</th><th>Status</th><th>Deposit</th><th>Linked</th><th>Actions</th></tr></thead>
              <tbody>
                {quotes.map((q) => {
                  const l = d.leads[q.leadId];
                  const p = l?.projectId ? d.projects[l.projectId] : undefined;
                  const linkedClient = l?.clientId || l?.duplicateOfClientId;
                  return (
                    <tr key={q.id}>
                      <td className="j-cell-main">{q.id}</td>
                      <td><button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: q.leadId })}>{l ? l.name : q.leadId}</button><div className="j-cell-sub">{q.leadId}</div></td>
                      <td style={{ minWidth: 220, maxWidth: 320 }}><div className="j-cell-sub" style={{ marginTop: 0 }}>{q.scope}</div></td>
                      <td>{fees ? <><div className="j-cell-main j-mono">{S.euro(q.amount)}</div><div className="j-cell-sub">Demo fee · tax treatment to confirm</div></> : <span className="j-dim">Hidden for this role</span>}</td>
                      <td><div className="j-mono">{fmtShortDate(q.expiresAt)}</div><div className="j-cell-sub">{q.expiresAt < d.now && q.status === "Sent" ? "Past expiry" : "Valid until"}</div></td>
                      <td><QuoteStatusBadge status={q.status} /></td>
                      <td><DepositBadge status={q.deposit.status} />{q.deposit.waivedReason && <div className="j-cell-sub">Reason: {q.deposit.waivedReason}</div>}</td>
                      <td>
                        {p ? <button type="button" className="j-link" onClick={() => go("Projects", "all", { kind: "project", id: p.id })}>Project {p.id}</button>
                          : linkedClient ? <button type="button" className="j-link" onClick={() => openDetail({ kind: "client", id: linkedClient })}>{d.clients[linkedClient]?.household} household</button>
                          : <span className="j-dim">Not converted</span>}
                      </td>
                      <td><QuoteActions q={q} onWaive={() => setWaiveFor(q.id)} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <CreateQuote fees={fees} />
      <WaiveDialog qid={waiveFor} onClose={() => setWaiveFor(null)} />
    </>
  );
}

function QuoteActions({ q, onWaive }: { q: Quote; onWaive: () => void }) {
  const d = useDemo();
  const l = d.leads[q.leadId];
  const depositOk = q.deposit.status === "Received (simulation)" || q.deposit.status === "Waived";
  return (
    <div className="j-row-wrap" style={{ flexWrap: "nowrap" }}>
      {q.status === "Draft" && <Btn size="sm" variant="primary" icon="send" onClick={() => act.sendQuote(q.id)}>Send draft</Btn>}
      {q.status === "Sent" && <Btn size="sm" icon="check" onClick={() => act.acceptQuote(q.id)}>Simulate client acceptance</Btn>}
      {q.status === "Accepted" && !depositOk && <>
        <Btn size="sm" icon="check" onClick={() => act.recordDeposit(q.id)} title="Received (simulation), no payment taken">Record demo deposit</Btn>
        <Btn size="sm" variant="ghost" onClick={onWaive}>Waive</Btn>
      </>}
      {q.status === "Accepted" && depositOk && !l?.projectId && (
        <Btn size="sm" variant="primary" icon="arrow" onClick={() => { const r = act.convertLead(q.leadId); if (r.ok && r.id) go("Projects", "all", { kind: "project", id: r.id }); }}>Convert to project</Btn>
      )}
      {l?.projectId && <span className="j-small">Converted</span>}
      {(q.status === "Declined" || q.status === "Expired") && <span className="j-small">No action</span>}
    </div>
  );
}

function WaiveDialog({ qid, onClose }: { qid: string | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const close = () => { setReason(""); setErr(""); onClose(); };
  const save = () => {
    if (!reason.trim()) { setErr("A reason is required to waive the deposit."); return; }
    const r = act.waiveDeposit(qid!, reason);
    if (r.ok) close(); else setErr(r.message);
  };
  return (
    <Dialog open={!!qid} onClose={close} title={"Waive the deposit on " + (qid || "")}
      footer={<><Btn onClick={close}>Cancel</Btn><Btn variant="primary" onClick={save}>Waive with reason</Btn></>}>
      <p className="j-text" style={{ margin: 0 }}>The reason is kept on the quote and in the activity history. The project gate accepts a waived deposit.</p>
      <Field label="Reason" htmlFor="jx-waive" error={err}>
        <textarea id="jx-waive" className="j-textarea" value={reason} onChange={(e) => setReason(e.target.value)} data-autofocus />
      </Field>
    </Dialog>
  );
}

function CreateQuote({ fees }: { fees: boolean }) {
  const d = useDemo();
  const eligible = S.openLeads(d).filter((l) => !Object.values(d.quotes).some((q) => q.leadId === l.id && (q.status === "Draft" || q.status === "Sent" || q.status === "Accepted")));
  const [leadId, setLeadId] = useState("");
  const lead = d.leads[leadId] || eligible[0];
  const [scope, setScope] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("30");
  const [errors, setErrors] = useState<{ amount?: string; lead?: string }>({});
  if (!fees) return null;
  const defaultScope = lead ? "Concept design and planning drawings for a one-off house in " + lead.locality + ". Illustrative scope; demo fee." : "";

  const create = (send: boolean) => {
    const er: typeof errors = {};
    if (!lead) er.lead = "Pick a lead.";
    const n = Number(amount);
    if (!(n > 0)) er.amount = "Enter an illustrative fee greater than zero.";
    setErrors(er);
    if (Object.keys(er).length || !lead) return;
    const r = act.createQuote(lead.id, Math.round(n), scope.trim() || defaultScope, send);
    if (r.ok && r.id) {
      if (days !== "30") setQuoteExpiry(r.id, d.now + Number(days) * DAY);
      setScope(""); setAmount(""); setLeadId(""); setDays("30");
    }
  };

  return (
    <Panel title="Create a quote" sub="From an open lead with no live quote. One quote per lead; a repeat click never makes a second one.">
      {eligible.length === 0 ? <Empty title="Every open lead already has a quote" body="Qualify a new enquiry first, or open a lead to see its quote." /> : (
        <form className="jx-form" onSubmit={(e) => { e.preventDefault(); create(true); }} noValidate>
          <Field label="Lead" htmlFor="jx-q-lead" error={errors.lead}>
            <select id="jx-q-lead" className="j-select" value={lead?.id || ""} onChange={(e) => { setLeadId(e.target.value); setScope(""); }}>
              {eligible.map((l) => <option key={l.id} value={l.id}>{l.id} · {l.name}, {l.locality} ({l.status})</option>)}
            </select>
          </Field>
          <Field label="Illustrative fee (euro)" htmlFor="jx-q-amt" error={errors.amount} hint="Demo fee placeholder. Tax treatment to confirm; no VAT is calculated.">
            <input id="jx-q-amt" className="j-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} aria-invalid={!!errors.amount} />
          </Field>
          <div className="jx-span">
            <Field label="Scope summary" htmlFor="jx-q-scope" hint={scope ? undefined : "Leave blank to use: " + defaultScope}>
              <textarea id="jx-q-scope" className="j-textarea" value={scope} onChange={(e) => setScope(e.target.value)} placeholder={defaultScope} />
            </Field>
          </div>
          <Field label="Expiry" htmlFor="jx-q-exp" hint={"Expires " + fmtShortDate(d.now + Number(days) * DAY)}>
            <select id="jx-q-exp" className="j-select" value={days} onChange={(e) => setDays(e.target.value)}>
              <option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option>
            </select>
          </Field>
          <div className="jx-span jx-formfoot">
            <Btn type="submit" variant="primary" icon="send">Create and send (simulated)</Btn>
            <Btn onClick={() => create(false)}>Save as draft</Btn>
          </div>
        </form>
      )}
    </Panel>
  );
}

/* ── Follow-ups ── */
function FollowUps() {
  const d = useDemo();
  const tasks = Object.values(d.tasks).filter((t) => t.leadId && (t.state === "Open" || t.state === "In progress")).sort((a, b) => a.due - b.due);
  const [logFor, setLogFor] = useState<string | null>(null);
  return (
    <>
      <Panel title="Follow-ups" sub="Each follow-up is a task on the lead. Logging a contact records the human response, completes the task and schedules the next one two working days later.">
        {tasks.length === 0 ? <Empty title="No follow-ups due" body="New enquiries create one automatically." /> : (
          <div className="jx-queue">
            {tasks.map((t) => {
              const l = d.leads[t.leadId!];
              if (!l) return null;
              const late = t.due < d.now;
              return (
                <div key={t.id} className="jx-qitem">
                  <div style={{ minWidth: 0 }}>
                    <div className="j-row-wrap">
                      <button type="button" className="j-link" onClick={() => openDetail({ kind: "lead", id: l.id })}>{l.name}</button>
                      <span className="j-small">{l.id} · {l.locality}</span>
                      <LeadStatusBadge status={l.status} />
                      {late ? <Badge tone="bad" icon="alert">{dueLabel(t.due, d.now)}</Badge> : <Badge tone="neutral" icon="clock">{dueLabel(t.due, d.now)}</Badge>}
                    </div>
                    <div className="j-text" style={{ marginTop: 4 }}>{l.followUpReason || t.title}</div>
                    <div className="jx-qfacts">
                      <span><b>Owner</b> {S.staffName(d, t.assigneeId)}</span>
                      <span><b>Next contact</b> {when(t.due)}</span>
                      <span><b>Last contact</b> {when(l.lastContactAt, "None logged")}</span>
                      <span><b>First human response</b> {l.firstHumanResponseAt ? when(l.firstHumanResponseAt) : "Not yet"}</span>
                    </div>
                  </div>
                  <div className="jx-qactions">
                    <Btn size="sm" variant="primary" icon="chat" onClick={() => setLogFor(l.id)}>Log contact</Btn>
                    <Btn size="sm" onClick={() => openDetail({ kind: "lead", id: l.id })}>Open lead</Btn>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <LogContactDialog leadId={logFor} onClose={() => setLogFor(null)} />
    </>
  );
}

export function LogContactDialog({ leadId, onClose }: { leadId: string | null; onClose: () => void }) {
  const d = useDemo();
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  const close = () => { setNote(""); setErr(""); onClose(); };
  const save = () => {
    if (!note.trim()) { setErr("Add a short note of the conversation."); return; }
    const r = act.logHumanContact(leadId!, note);
    if (r.ok) close(); else setErr(r.message);
  };
  const l = leadId ? d.leads[leadId] : undefined;
  return (
    <Dialog open={!!leadId} onClose={close} title={"Log contact with " + (l?.name || "")}
      footer={<><Btn onClick={close}>Cancel</Btn><Btn variant="primary" onClick={save}>Save contact</Btn></>}>
      <p className="j-text" style={{ margin: 0 }}>Records a human conversation by {l ? S.staffName(d, l.ownerId) : "the owner"}. This is separate from any automated acknowledgement.</p>
      <Field label="What was discussed" htmlFor="jx-log-note" error={err}>
        <textarea id="jx-log-note" className="j-textarea" value={note} onChange={(e) => setNote(e.target.value)} data-autofocus />
      </Field>
    </Dialog>
  );
}
