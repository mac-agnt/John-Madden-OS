/* Lead record (drawer body). Facts, a timeline that keeps the automated
   acknowledgement apart from the human response, and the next steps in order. */
import { useState, type ReactNode } from "react";
import type { Lead, Quote } from "../types";
import { act, useDemo } from "../store";
import { go, openDetail } from "../ui";
import * as S from "../selectors";
import { Badge, Btn, Field, Icon, KV, Panel, cls } from "../kit";
import { dueLabel, fmtShortDate } from "../time";
import { setQuoteExpiry } from "./sales/actions";
import { ChannelBadge, DeliveryLog, DepositBadge, LeadStatusBadge, QuoteStatusBadge, SourceBadge, isAutoSource, quoteFor, when, whenSecs } from "./sales/shared";

const DAY = 86400000;

export default function LeadRecord({ id }: { id: string; tab?: string; versionId?: string }) {
  return <LeadBody key={id} id={id} />;
}

function LeadBody({ id }: { id: string }) {
  const d = useDemo();
  const l = d.leads[id];
  if (!l) return <div className="j-small">Lead not found.</div>;
  const fees = S.canSeeFees(d);
  const q = quoteFor(d, l.id);
  const dupRuns = Object.values(d.runs).filter((r) => r.subject.kind === "lead" && r.subject.id === l.id && r.result === "Skipped: duplicate").sort((a, b) => a.at - b.at);
  const client = l.duplicateOfClientId ? d.clients[l.duplicateOfClientId] : undefined;
  const clientProjects = client ? Object.values(d.projects).filter((p) => p.clientId === client.id) : [];
  const seeContact = d.persona.kind !== "philippines" && d.persona.kind !== "client";

  return (
    <div className="j-stack jx-scope">
      <div className="j-row-wrap">
        <LeadStatusBadge status={l.status} />
        <SourceBadge source={l.source} />
        {q && <QuoteStatusBadge status={q.status} />}
      </div>

      {l.projectId && (
        <div className="j-note" role="status">
          <div className="j-row-wrap" style={{ justifyContent: "space-between" }}>
            <span><Icon name="check" size={13} /> Converted to project <b>{l.projectId}</b>. The lead has left the open pipeline.</span>
            <Btn size="sm" variant="primary" icon="arrow" onClick={() => go("Projects", "all", { kind: "project", id: l.projectId! })}>Open {l.projectId}</Btn>
          </div>
        </div>
      )}
      {client && (
        <div className="j-note" role="note">
          <b>Existing client, new site.</b> This email belongs to the {client.household} household ({clientProjects.map((p) => p.id + ", " + p.locality).join("; ") || "no live project"}).
          The enquiry is about {l.locality}, so it is kept as a separate lead and linked to the existing client record rather than merged.{" "}
          <button type="button" className="j-link" onClick={() => openDetail({ kind: "client", id: client.id })}>Open the {client.household} client record</button>
        </div>
      )}
      {dupRuns.length > 0 && (
        <div className="j-note" role="note">
          <b>Duplicate submission handled.</b> {dupRuns.map((r) => r.detail + " (" + whenSecs(r.at) + ")").join(" ")}
        </div>
      )}

      <KV items={[
        ["Source", l.source + (isAutoSource(l.source) && l.ackAt ? (l.source === "Website" ? " (website form, simulated)" : " (office inbox, simulated)") : " (recorded by staff)")],
        ["Received", whenSecs(l.receivedAt)],
        ["Requested service", l.requestedService],
        ["Site locality", l.locality],
        ["Owner", S.staffName(d, l.ownerId)],
        ["Next contact", l.nextContactAt ? when(l.nextContactAt) + " · " + dueLabel(l.nextContactAt, d.now) : "Not scheduled"],
        ["Email", seeContact ? l.email || "Not given" : "Hidden in this preview"],
        ["Phone", seeContact ? l.phone || "Not given" : "Hidden in this preview"],
        ...(fees && q ? [["Quote", q.id + " · " + S.euro(q.amount) + " demo fee · tax treatment to confirm"] as [ReactNode, ReactNode]] : []),
        ...(l.lostReason ? [["Lost reason", l.lostReason] as [ReactNode, ReactNode]] : []),
      ]} />
      <div className="j-small">Email addresses at example.com are fictional. Nothing is sent from this demo.</div>

      <Panel title="Timeline" sub="Automated acknowledgement and human follow-up are separate steps.">
        <Timeline l={l} q={q} />
      </Panel>

      <Panel title="Next steps" sub="In order. Each step uses the same action as the Sales tabs.">
        <Steps l={l} q={q} fees={fees} />
      </Panel>

      <Panel title="Notes">
        <div className="j-text" style={{ whiteSpace: "pre-wrap" }}>{l.notes || "No notes yet."}</div>
      </Panel>

      <History l={l} />
    </div>
  );
}

type TL = { tone: "ok" | "warn" | "bad" | ""; icon: string; title: ReactNode; body?: ReactNode };

function Timeline({ l, q }: { l: Lead; q?: Quote }) {
  const d = useDemo();
  const items: TL[] = [];
  const manual = l.source === "Phone" || l.source === "Walk-in";
  items.push({ tone: "ok", icon: "check", title: <>Received <span className="j-mono j-dim">{whenSecs(l.receivedAt)}</span></>,
    body: l.ackAt ? "Captured by the " + (l.source === "Website" ? "website form" : "office inbox") + " (simulated)." : "Recorded by staff (" + l.source.toLowerCase() + ")." });

  const msg = l.ackMessageId ? d.messages[l.ackMessageId] : undefined;
  const ack = S.ackSeconds(l);
  if (l.ackAt && ack != null) {
    items.push({ tone: "ok", icon: "bolt", title: <>Automated acknowledgement <span className="j-mono">+{ack} s</span> <span className="j-dim j-mono">{whenSecs(l.ackAt)}</span></>,
      body: (
        <>
          <div>{msg ? "“" + (msg.subject || "Acknowledgement") + "”, " + (msg.automated ? "sent by the workflow (simulated), not by a person." : "sent by staff.") : "Acknowledgement recorded."}</div>
          {msg && <div style={{ marginTop: 6 }}><ChannelBadge channel={msg.channel} /></div>}
        </>
      ) });
    if (msg) {
      const last = msg.deliveryLog[msg.deliveryLog.length - 1];
      items.push({ tone: last?.state === "Delivered" ? "ok" : last?.state === "Failed" ? "bad" : "warn", icon: last?.state === "Failed" ? "alert" : "send",
        title: <>Delivery: {last?.state || msg.delivery}</>,
        body: <><div>From the message delivery log. Delivered is shown only when the log records it.</div><DeliveryLog m={msg} /></> });
    }
  } else {
    items.push({ tone: "", icon: "info", title: "No automated acknowledgement",
      body: manual ? "Manual capture by staff. There is no automated acknowledgement and no response promise before capture." : "Recorded by staff, so the acknowledgement workflow did not run." });
  }

  const hrs = S.humanResponseHours(l);
  if (l.firstHumanResponseAt && hrs != null) {
    items.push({ tone: "ok", icon: "chat", title: <>Human response done <span className="j-dim j-mono">{when(l.firstHumanResponseAt)}</span></>,
      body: S.staffName(d, l.ownerId) + " logged the first conversation " + hrs.toFixed(1) + " h after receipt." });
  } else {
    const due = l.nextContactAt;
    items.push({ tone: due && due < d.now ? "bad" : "warn", icon: "clock", title: <>Human follow-up due {due ? <span className="j-dim j-mono">{when(due)}</span> : null}</>,
      body: due ? S.staffName(d, l.ownerId) + " owns it. " + dueLabel(due, d.now) + "." : "No follow-up scheduled." });
  }
  if (l.firstHumanResponseAt && l.nextContactAt && l.status !== "Accepted" && l.status !== "Lost") {
    items.push({ tone: l.nextContactAt < d.now ? "bad" : "", icon: "calendar", title: <>Next contact <span className="j-dim j-mono">{when(l.nextContactAt)}</span></>, body: l.followUpReason });
  }
  if (q) {
    items.push({ tone: q.status === "Sent" || q.status === "Draft" ? "warn" : q.status === "Accepted" ? "ok" : "", icon: "doc",
      title: <>Quote {q.id}: {q.status}</>,
      body: q.status === "Draft" ? "Drafted " + when(q.createdAt) + ". Not sent yet." : "Sent " + when(q.sentAt) + ". Expires " + fmtShortDate(q.expiresAt) + "." + (q.acceptedAt ? " Acceptance recorded " + when(q.acceptedAt) + " (simulated, not a signature)." : "") });
    if (q.status === "Accepted") items.push({ tone: q.deposit.status === "Requested" ? "warn" : "ok", icon: "check", title: <>Deposit: <DepositBadge status={q.deposit.status} /></>, body: q.deposit.waivedReason ? "Reason: " + q.deposit.waivedReason : q.deposit.at ? when(q.deposit.at) : "Waiting for the deposit status." });
  }
  if (l.projectId) items.push({ tone: "ok", icon: "arrow", title: <>Converted to {l.projectId}</>, body: <button type="button" className="j-link" onClick={() => go("Projects", "all", { kind: "project", id: l.projectId! })}>Open project {l.projectId}</button> });
  if (l.status === "Lost") items.push({ tone: "", icon: "x", title: "Marked lost", body: l.lostReason });

  return (
    <ol className="jx-tl">
      {items.map((it, i) => (
        <li key={i} className="jx-tl-item">
          <span className={cls("jx-tl-dot", it.tone)} aria-hidden="true"><Icon name={it.icon} size={13} /></span>
          <div style={{ minWidth: 0 }}>
            <div className="jx-tl-title">{it.title}</div>
            {it.body && <div className="jx-tl-body">{it.body}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Steps({ l, q, fees }: { l: Lead; q?: Quote; fees: boolean }) {
  const d = useDemo();
  const [note, setNote] = useState("");
  const [noteErr, setNoteErr] = useState("");
  const [amount, setAmount] = useState("");
  const [scope, setScope] = useState("");
  const [days, setDays] = useState("30");
  const [qErr, setQErr] = useState("");
  const [waive, setWaive] = useState("");
  const [waiveErr, setWaiveErr] = useState("");
  const [showWaive, setShowWaive] = useState(false);
  const [lost, setLost] = useState("");
  const [lostErr, setLostErr] = useState("");
  const [showLost, setShowLost] = useState(false);

  const closed = l.status === "Lost" || !!l.projectId;
  const contacted = !!l.firstHumanResponseAt;
  const qualified = ["Qualified", "Quote sent", "Accepted"].includes(l.status) || !!q;
  const sent = !!q && q.status !== "Draft";
  const accepted = q?.status === "Accepted";
  const depositOk = !!q && (q.deposit.status === "Received (simulation)" || q.deposit.status === "Waived");
  const defaultScope = "Concept design and planning drawings for a one-off house in " + l.locality + ". Illustrative scope; demo fee.";

  const logContact = () => {
    if (!note.trim()) { setNoteErr("Add a short note of the conversation."); return; }
    const r = act.logHumanContact(l.id, note); if (r.ok) { setNote(""); setNoteErr(""); } else setNoteErr(r.message);
  };
  const createQuote = (send: boolean) => {
    const n = Number(amount);
    if (!(n > 0)) { setQErr("Enter an illustrative fee greater than zero."); return; }
    const r = act.createQuote(l.id, Math.round(n), scope.trim() || defaultScope, send);
    if (r.ok && r.id) { if (days !== "30") setQuoteExpiry(r.id, d.now + Number(days) * DAY); setQErr(""); setAmount(""); setScope(""); }
    else setQErr(r.message);
  };

  type Step = { title: string; state: "done" | "next" | "wait" | "skip"; done?: ReactNode; body?: ReactNode; why?: string };
  const steps: Step[] = [];
  const firstOpen = (arr: boolean[]) => arr.findIndex((x) => !x);
  const flags = [contacted, qualified, sent, accepted, depositOk, !!l.projectId];
  const nextIdx = closed ? -1 : firstOpen(flags);
  const st = (i: number): Step["state"] => (flags[i] ? "done" : i === nextIdx ? "next" : "wait");

  steps.push({ title: "Log contact (human response)", state: contacted && !closed ? "done" : st(0),
    done: contacted ? "First human response " + when(l.firstHumanResponseAt) + ". Last contact " + when(l.lastContactAt) + "." : undefined,
    body: !closed ? (
      <>
        <Field label={contacted ? "Log another contact" : "What was discussed"} htmlFor={"jx-ln-" + l.id} error={noteErr}>
          <textarea id={"jx-ln-" + l.id} className="j-textarea" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div><Btn size="sm" variant={contacted ? "secondary" : "primary"} icon="chat" onClick={logContact}>Log contact</Btn></div>
      </>
    ) : undefined });
  steps.push({ title: "Qualify", state: st(1), done: qualified ? "Requirements captured." : undefined,
    body: !qualified && !closed ? <div><Btn size="sm" variant={nextIdx === 1 ? "primary" : "secondary"} icon="check" onClick={() => act.qualifyLead(l.id)}>Mark qualified</Btn></div> : undefined });
  steps.push({ title: q && q.status === "Draft" ? "Send the draft quote" : "Create and send a quote", state: st(2),
    done: sent && q ? q.id + " sent " + when(q.sentAt) + (fees ? " · " + S.euro(q.amount) + " demo fee" : "") + "." : undefined,
    body: closed || sent ? undefined : q && q.status === "Draft" ? (
      <div className="j-row-wrap"><span className="j-small">{q.id} drafted{fees ? ", " + S.euro(q.amount) + " demo fee" : ""}.</span><Btn size="sm" variant="primary" icon="send" onClick={() => act.sendQuote(q.id)}>Send draft (simulated)</Btn></div>
    ) : fees ? (
      <div className="jx-form">
        <Field label="Illustrative fee (euro)" htmlFor={"jx-lq-" + l.id} error={qErr} hint="Demo fee. Tax treatment to confirm.">
          <input id={"jx-lq-" + l.id} className="j-input" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
        </Field>
        <Field label="Expiry" htmlFor={"jx-le-" + l.id}>
          <select id={"jx-le-" + l.id} className="j-select" value={days} onChange={(e) => setDays(e.target.value)}>
            <option value="14">14 days</option><option value="30">30 days</option><option value="60">60 days</option>
          </select>
        </Field>
        <div className="jx-span">
          <Field label="Scope summary" htmlFor={"jx-ls-" + l.id}>
            <textarea id={"jx-ls-" + l.id} className="j-textarea" value={scope} onChange={(e) => setScope(e.target.value)} placeholder={defaultScope} />
          </Field>
        </div>
        <div className="jx-span jx-formfoot">
          <Btn size="sm" variant={nextIdx === 2 ? "primary" : "secondary"} icon="send" onClick={() => createQuote(true)}>Create and send</Btn>
          <Btn size="sm" onClick={() => createQuote(false)}>Save as draft</Btn>
        </div>
      </div>
    ) : <div className="j-small">Fees are not shown for this role.</div>,
    why: !qualified && !sent ? "You can quote before qualifying; most leads are qualified first." : undefined });
  steps.push({ title: "Simulate client acceptance", state: st(3), done: accepted && q ? "Recorded " + when(q.acceptedAt) + ". Simulated acceptance, not a signature." : undefined,
    body: sent && !accepted && !closed && q?.status === "Sent" ? <div><Btn size="sm" variant="primary" icon="check" onClick={() => act.acceptQuote(q.id)}>Simulate client acceptance</Btn></div> : undefined,
    why: !sent ? "Needs a sent quote." : q?.status === "Declined" ? "Quote declined." : undefined });
  steps.push({ title: "Record the demo deposit", state: st(4),
    done: depositOk && q ? (q.deposit.status === "Waived" ? "Waived: " + q.deposit.waivedReason : "Received (simulation), no payment taken. " + when(q.deposit.at)) : undefined,
    body: accepted && !depositOk && q && !closed ? (
      <>
        <div className="j-row-wrap">
          <Btn size="sm" variant="primary" icon="check" onClick={() => act.recordDeposit(q.id)}>Record {S.euro(q.deposit.amount)} demo deposit</Btn>
          <Btn size="sm" variant="ghost" onClick={() => setShowWaive((x) => !x)} pressed={showWaive}>Waive with reason</Btn>
        </div>
        <div className="j-small">Marks it received (simulation). No payment is taken or processed.</div>
        {showWaive && (
          <>
            <Field label="Reason for waiving" htmlFor={"jx-lw-" + l.id} error={waiveErr}>
              <input id={"jx-lw-" + l.id} className="j-input" value={waive} onChange={(e) => setWaive(e.target.value)} />
            </Field>
            <div><Btn size="sm" onClick={() => { if (!waive.trim()) { setWaiveErr("A reason is required to waive the deposit."); return; } const r = act.waiveDeposit(q.id, waive); if (r.ok) { setWaive(""); setWaiveErr(""); setShowWaive(false); } else setWaiveErr(r.message); }}>Waive deposit</Btn></div>
          </>
        )}
      </>
    ) : undefined, why: !accepted ? "Needs a recorded acceptance." : undefined });
  steps.push({ title: "Convert to project", state: st(5), done: l.projectId ? <>Created <button type="button" className="j-link" onClick={() => go("Projects", "all", { kind: "project", id: l.projectId! })}>{l.projectId}</button> with its household, programme and first tasks.</> : undefined,
    body: depositOk && accepted && !l.projectId ? <div><Btn size="sm" variant="primary" icon="arrow" onClick={() => { const r = act.convertLead(l.id); if (r.ok && r.id) go("Projects", "all", { kind: "project", id: r.id }); }}>Convert to project</Btn></div> : undefined,
    why: !depositOk ? "Needs an accepted quote and a deposit recorded or waived." : undefined });

  return (
    <>
      <ol className="jx-steps">
        {steps.map((s, i) => (
          <li key={i} className={cls("jx-step", s.state)}>
            <div className="jx-step-head">
              <span className="jx-step-n">{s.state === "done" ? <Icon name="check" size={11} stroke={2.6} /> : i + 1}</span>
              <span className="jx-step-title">{s.title}</span>
              {s.state === "done" ? <Badge tone="ok">Done</Badge> : s.state === "next" ? <Badge tone="accent" icon="arrow">Next</Badge> : l.status === "Lost" ? <Badge tone="neutral" icon="x">Closed</Badge> : <Badge tone="neutral" icon="clock">Not yet</Badge>}
            </div>
            {s.state === "done" && s.done && <div className="j-small">{s.done}</div>}
            {s.body}
            {s.state === "wait" && !s.body && s.why && <div className="j-small">{s.why}</div>}
          </li>
        ))}
      </ol>
      {!closed && (
        <div style={{ marginTop: 14 }}>
          {!showLost ? <Btn size="sm" variant="ghost" icon="x" onClick={() => setShowLost(true)}>Mark lost</Btn> : (
            <div className="j-stack">
              <Field label="Why was it lost?" htmlFor={"jx-ll-" + l.id} error={lostErr} hint="Open tasks are cancelled and a sent quote is marked declined.">
                <input id={"jx-ll-" + l.id} className="j-input" value={lost} onChange={(e) => setLost(e.target.value)} />
              </Field>
              <div className="j-row-wrap">
                <Btn size="sm" variant="danger" onClick={() => { if (!lost.trim()) { setLostErr("Add a reason."); return; } const r = act.markLost(l.id, lost); if (!r.ok) setLostErr(r.message); }}>Mark lost</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { setShowLost(false); setLost(""); setLostErr(""); }}>Cancel</Btn>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function History({ l }: { l: Lead }) {
  const d = useDemo();
  const evs = S.visibleEvents(d).filter((e) => e.subject.id === l.id || e.related.includes(l.id)).sort((a, b) => b.at - a.at);
  const msgs = Object.values(d.messages).filter((m) => m.leadId === l.id).sort((a, b) => b.at - a.at);
  return (
    <>
      <Panel title="Messages" sub="Simulated. No real messages are sent.">
        {msgs.length === 0 ? <div className="j-small">No messages for this lead.</div> : (
          <div className="j-list">
            {msgs.map((m) => (
              <div key={m.id} className="j-list-item" style={{ flexDirection: "column", gap: 6 }}>
                <div className="j-row-wrap"><ChannelBadge channel={m.channel} /><Badge tone="neutral" icon={m.automated ? "bolt" : "user"}>{m.automated ? "Automated" : "Sent by " + S.staffName(d, m.fromId)}</Badge><span className="j-small">{whenSecs(m.at)}</span></div>
                {m.subject && <div className="jx-msg-subject">{m.subject}</div>}
                <div className="jx-msg-body">{m.body}</div>
                <DeliveryLog m={m} />
              </div>
            ))}
          </div>
        )}
      </Panel>
      <Panel title="Activity" sub="Every recorded change to this lead.">
        {evs.length === 0 ? <div className="j-small">Nothing recorded yet.</div> : (
          <div className="j-list">
            {evs.map((e) => (
              <div key={e.id} className="j-list-item">
                <div style={{ minWidth: 0 }}>
                  <div className="j-text">{e.summary}</div>
                  <div className="j-small">{e.actor.name} · {whenSecs(e.at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
