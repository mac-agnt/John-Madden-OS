/* Settings: organisation facts, access preview, proposed systems, workflow
   rules, message templates, governance and demo controls. Only the
   administrator can change anything; other previews read. */
import { useState } from "react";
import type { DemoState, Template } from "../types";
import { PERSONAS, act, useDemo } from "../store";
import * as S from "../selectors";
import { AGENTS } from "../agents";
import { STORY, storyIndex } from "../story";
import { MODULES, resetUi, setStoryOpen, tabOf, tabsFor, useUi } from "../ui";
import { Badge, Btn, Dialog, Field, Icon, KV, Page, PageHead, Panel, type Tone } from "../kit";
import { TZ_OFFICE, TZ_PH, fmtDate, fmtTime } from "../time";
import { goTo } from "./ops/shared";

export default function SettingsPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Settings")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Settings")) ? tabOf("Settings") : tabs[0].id;
  const admin = S.canConfigure(d);
  return (
    <Page>
      {!admin && tab !== "experience" && (
        <div className="j-note" style={{ display: "flex", gap: 8, alignItems: "center" }}><Icon name="lock" size={14} />Restricted settings unless granted. This preview can read but not change them.</div>
      )}
      {tab === "organisation" && <Organisation d={d} />}
      {tab === "access" && <Access d={d} />}
      {tab === "systems" && <Systems />}
      {tab === "rules" && <Rules d={d} admin={admin} />}
      {tab === "templates" && <Templates d={d} admin={admin} />}
      {tab === "governance" && <Governance />}
      {tab === "experience" && <Experience d={d} />}
    </Page>
  );
}

/* ── Organisation ── */
function Organisation({ d }: { d: DemoState }) {
  return (
    <>
      <PageHead title="Organisation" sub="Practice details used across the demo. Only the practice name, address and supplied contact are real." />
      <Panel title="Practice">
        <KV items={[
          ["Practice", "John Madden & Associates"],
          ["Address", "Blackhall Street, Mullingar, Ireland"],
          ["Supplied contact", "Ciaran Madden, cmadden@johnmadden.ie"],
          ["Contact note", "Demo role assumed (administrator); formal title unconfirmed."],
          ["App name", "John Madden OS"],
          ["Source of facts", "Practice name and address are verified public facts. Everything else is fictional seed data."],
        ]} />
      </Panel>
      <Panel title="Time zones" sub="Every date is stored once and shown in the zone of the person reading or doing the work.">
        <KV items={[
          ["Demo timezone (office)", TZ_OFFICE + " · now " + fmtTime(d.now, TZ_OFFICE) + " on " + fmtDate(d.now, TZ_OFFICE)],
          ["Philippines team", TZ_PH + " · now " + fmtTime(d.now, TZ_PH) + " on " + fmtDate(d.now, TZ_PH)],
        ]} />
      </Panel>
      <Panel title="Brand">
        <div className="j-stack">
          <div className="jo-swatches">
            {[["Forest", "#13301F"], ["JMA green", "#517F43"], ["Logo mint", "#5EB780"]].map(([n, c]) => (
              <span key={c} className="jo-swatch"><i style={{ background: c }} />{n} {c}</span>
            ))}
          </div>
          <div className="j-note">Logo and colours taken from johnmadden.ie. Type is Wix Madefor, as used on the site.</div>
        </div>
      </Panel>
    </>
  );
}

/* ── Teams and access ── */
const MATRIX: { role: string; visible: string; act: string; excluded: string }[] = [
  { role: "Administrator", visible: "All demo records, fees, activity and configuration.", act: "Everything, including stage overrides, workflow rules, templates and settings.", excluded: "Nothing within the demo." },
  { role: "Mullingar staff", visible: "Projects, drawings, clients, sales, work, knowledge and activity. Settings read-only.", act: "Delivery work: briefs, office QA and release, client messages, tasks and amendments.", excluded: "Configuration changes unless granted." },
  { role: "Philippines contributor", visible: "Own drawing assignments and briefs, permitted drawing inputs (site map, survey), own tasks, internal procedures.", act: "Acknowledge briefs, ask clarifications, submit drawing versions.", excluded: "Fees and quotes, client directory and contact details, sales, other people's work, configuration." },
  { role: "Client", visible: "Their own project milestones, released drawings, published documents and FAQs, their messages.", act: "Upload requested documents, comment on or approve the current released revision, message the office.", excluded: "Internal notes and drafts, drawings in office review, other households, internal tasks." },
  { role: "Sales role", visible: "Leads, quotes, permitted contact history, lead follow-ups and schedules.", act: "Log contact, qualify, quote, record simulated acceptance and deposit, convert a lead.", excluded: "Drawings in office review, internal delivery work, configuration." },
];

function landingFor(kind: string, staffId?: string): [string, string] {
  if (kind === "philippines") return ["Drawings", "queue"];
  if (kind === "sales") return ["Sales", "pipeline"];
  if (kind === "mullingar") return staffId === "s-eoin" ? ["Drawings", "amendments"] : ["Projects", "all"];
  return ["Dashboard", "executive"];
}

function Access({ d }: { d: DemoState }) {
  return (
    <>
      <PageHead title="Teams and access" sub="What each role can see, act on and is kept from in this demo." />
      <Panel title="Role matrix" flush>
        <div className="j-tablewrap">
          <table className="j-table">
            <thead><tr><th>Role</th><th>Visible</th><th>Can act on</th><th>Excluded</th></tr></thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.role}>
                  <td className="j-cell-main" style={{ whiteSpace: "nowrap" }}>{r.role}</td>
                  <td style={{ minWidth: 200 }}>{r.visible}</td>
                  <td style={{ minWidth: 200 }}>{r.act}</td>
                  <td style={{ minWidth: 200 }}>{r.excluded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <Panel title="Preview as" sub="Switch the whole app to another person's view, then return here as Ciaran.">
        <div className="j-list">
          {PERSONAS.map((p) => {
            const on = d.persona.kind === p.persona.kind && d.persona.staffId === p.persona.staffId;
            return (
              <div key={p.label} className="j-list-item" style={{ alignItems: "center" }}>
                <div className="jo-grow"><div className="j-cell-main">{p.label}</div><div className="j-small">{p.note}</div></div>
                {on ? <Badge tone="accent" icon="eye">Current preview</Badge> : (
                  <Btn size="sm" icon="eye" onClick={() => { const [m, t] = landingFor(p.persona.kind, p.persona.staffId); act.setPersona(p.persona); goTo(m, t); }}>Preview</Btn>
                )}
              </div>
            );
          })}
        </div>
        <div className="j-note warn" style={{ marginTop: 12 }}>Persona switching is a UI preview, not security. The fixture bundle is frontend-only and is not a secure multi-tenant system.</div>
      </Panel>
    </>
  );
}

/* ── Systems ── */
const SYSTEMS: { name: string; use: string; status: string; tone: Tone; icon: string }[] = [
  { name: "Outlook", use: "Email to clients and staff", status: "Proposed · simulated in demo", tone: "info", icon: "send" },
  { name: "Microsoft Calendar", use: "Site visits and client meetings", status: "Proposed · simulated in demo", tone: "info", icon: "calendar" },
  { name: "SharePoint", use: "File store; baseline linking of project folders only", status: "Proposed · simulated in demo", tone: "info", icon: "doc" },
  { name: "Microsoft sign-in", use: "Staff single sign-on", status: "Proposed · simulated in demo", tone: "info", icon: "lock" },
  { name: "WhatsApp", use: "Client messages, if the practice wants it", status: "Provider-dependent · not selected", tone: "neutral", icon: "chat" },
  { name: "SMS", use: "Reminders, if the practice wants it", status: "Provider-dependent · not selected", tone: "neutral", icon: "chat" },
  { name: "ArcTech Pro", use: "Drawing data exchange", status: "Phase 2 candidate · API/export not verified", tone: "warn", icon: "layers" },
];
function Systems() {
  return (
    <>
      <PageHead title="Systems" sub="Integrations proposed for a production build. None is connected; the demo simulates their effects locally." />
      <Panel flush>
        <div className="j-list" style={{ padding: "4px 20px 8px" }}>
          {SYSTEMS.map((s) => (
            <div key={s.name} className="j-list-item" style={{ alignItems: "center" }}>
              <Icon name={s.icon} size={16} style={{ color: "var(--dim)" }} />
              <div className="jo-grow"><div className="j-cell-main">{s.name}</div><div className="j-small">{s.use}</div></div>
              <Badge tone={s.tone} icon={s.tone === "warn" ? "clock" : "info"}>{s.status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
      <div className="j-note">No accounting integration is proposed. Nothing on this page connects to an outside service, and there is no connect button by design.</div>
    </>
  );
}

/* ── Workflow rules ── */
function Rules({ d, admin }: { d: DemoState; admin: boolean }) {
  const s = d.settings;
  const [gates, setGates] = useState(s.gatesEnforced);
  const [sla, setSla] = useState(String(s.amendmentSlaWD));
  const [rem, setRem] = useState(String(s.reminderDays));
  const [max, setMax] = useState(String(s.maxReminders));
  const [ack, setAck] = useState(String(s.ackDelaySec));
  const [reasons, setReasons] = useState(s.pauseReasons.join("\n"));
  const num = (v: string, lo: number, hi: number) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
  const errs = {
    sla: num(sla, 1, 20) == null ? "Whole number from 1 to 20." : "",
    rem: num(rem, 1, 30) == null ? "Whole number from 1 to 30." : "",
    max: num(max, 1, 10) == null ? "Whole number from 1 to 10." : "",
    ack: num(ack, 0, 3600) == null ? "Whole number of seconds from 0 to 3600." : "",
  };
  const list = reasons.split("\n").map((x) => x.trim()).filter(Boolean);
  const bad = Object.values(errs).some(Boolean) || list.length === 0;
  const save = () => {
    if (bad) return;
    act.saveSettings({ gatesEnforced: gates, amendmentSlaWD: num(sla, 1, 20)!, reminderDays: num(rem, 1, 30)!, maxReminders: num(max, 1, 10)!, ackDelaySec: num(ack, 0, 3600)!, pauseReasons: list });
  };
  return (
    <>
      <PageHead title="Workflow rules" sub="Demo service levels and the rules the workflow engine follows. Values are discovery assumptions for Ciaran to confirm." />
      <Panel title="Stage gates">
        <label className="j-check"><input type="checkbox" checked={gates} disabled={!admin} onChange={(e) => setGates(e.target.checked)} />Enforce stage gates. A job moves on only when its exit checks pass, or with an override and a reason.</label>
      </Panel>
      <Panel title="Service levels (demo)" sub="Existing tasks keep their dates. New values apply to tasks and reminders created after saving.">
        <div className="jo-form">
          <Field label="Amendment SLA (working days)" htmlFor="st-sla" error={errs.sla}><input id="st-sla" className="j-input" inputMode="numeric" value={sla} disabled={!admin} onChange={(e) => setSla(e.target.value)} /></Field>
          <Field label="Reminder interval (working days)" htmlFor="st-rem" error={errs.rem}><input id="st-rem" className="j-input" inputMode="numeric" value={rem} disabled={!admin} onChange={(e) => setRem(e.target.value)} /></Field>
          <Field label="Maximum reminders per request" htmlFor="st-max" error={errs.max}><input id="st-max" className="j-input" inputMode="numeric" value={max} disabled={!admin} onChange={(e) => setMax(e.target.value)} /></Field>
          <Field label="Acknowledgement delay (seconds)" htmlFor="st-ack" error={errs.ack} hint="Time before the templated enquiry acknowledgement is queued."><input id="st-ack" className="j-input" inputMode="numeric" value={ack} disabled={!admin} onChange={(e) => setAck(e.target.value)} /></Field>
          <div className="full">
            <Field label="Pause reasons (one per line)" htmlFor="st-pr" error={list.length === 0 ? "Keep at least one reason." : undefined}>
              <textarea id="st-pr" className="j-textarea" value={reasons} disabled={!admin} onChange={(e) => setReasons(e.target.value)} />
            </Field>
          </div>
        </div>
      </Panel>
      <Panel title="Working-day calendar">
        <div className="j-text">Working days are Monday to Friday only. Bank holidays and office working hours are discovery items and are not modelled; a target set for 17:00 is a demo convention.</div>
      </Panel>
      {admin && <div className="j-row-wrap"><Btn variant="primary" icon="check" disabled={bad} onClick={save}>Save workflow rules</Btn><span className="j-small">Saving is logged in Activity.</span></div>}
    </>
  );
}

/* ── Message templates ── */
const SAMPLE: Record<string, string> = { first_names: "Ciara and Stephen", locality: "Tyrrellspass", owner_first: "Niamh", drawing: "JMA-26025-A-101", rev: "B", item: "site map", project: "JMA-26025", assignee_first: "Carlo" };
const fillSample = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => SAMPLE[k] ?? "[unknown field " + k + "]");
const fieldsIn = (s: string) => Array.from(new Set(Array.from(s.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1])));

function Templates({ d, admin }: { d: DemoState; admin: boolean }) {
  const list = Object.values(d.templates);
  const [sel, setSel] = useState(list[0]?.id || "");
  const t = d.templates[sel];
  return (
    <>
      <PageHead title="Message templates" sub="Wording the workflow engine uses for automated messages. Merge fields are filled from the record; the preview uses sample values." />
      <div className="jo-two">
        <Panel title="Templates" flush>
          <div className="j-tablewrap">
            <table className="j-table">
              <thead><tr><th>Name</th><th>Event</th><th>Channel</th><th>Audience</th></tr></thead>
              <tbody>
                {list.map((x) => (
                  <tr key={x.id} className="j-row" onClick={() => setSel(x.id)} style={x.id === sel ? { background: "var(--accent-faint, var(--surface-2))" } : undefined}>
                    <td><button type="button" className="jo-rowmain" aria-pressed={x.id === sel} onClick={(e) => { e.stopPropagation(); setSel(x.id); }}>{x.name}</button></td>
                    <td>{x.event}</td><td>{x.channel}</td><td>{x.audience}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
        {t && <TemplateEditor key={t.id + ":" + t.subject + ":" + t.body} t={t} admin={admin} />}
      </div>
    </>
  );
}

function TemplateEditor({ t, admin }: { t: Template; admin: boolean }) {
  const [subject, setSubject] = useState(t.subject);
  const [body, setBody] = useState(t.body);
  const fields = fieldsIn(subject + " " + body);
  const unknown = fields.filter((f) => !(f in SAMPLE));
  const dirty = subject !== t.subject || body !== t.body;
  return (
    <Panel title={t.name} sub={t.event + " · " + t.channel + " · " + t.audience}>
      <div className="j-stack">
        <Field label="Subject" htmlFor="tp-sub"><input id="tp-sub" className="j-input" value={subject} disabled={!admin} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Body" htmlFor="tp-body" hint={"Merge fields available: " + Object.keys(SAMPLE).map((k) => "{{" + k + "}}").join(", ")}>
          <textarea id="tp-body" className="j-textarea" rows={6} value={body} disabled={!admin} onChange={(e) => setBody(e.target.value)} />
        </Field>
        {unknown.length > 0 && <div className="j-error" role="alert">Unknown merge field: {unknown.join(", ")}. It would print blank in a real message.</div>}
        <div>
          <div className="j-label" style={{ marginBottom: 6 }}>Preview with sample values</div>
          <div className="j-note">
            <div className="j-cell-main" style={{ marginBottom: 6 }}>{fillSample(subject)}</div>
            <div className="jo-preview">{fillSample(body)}</div>
          </div>
        </div>
        {admin && (
          <div className="j-row-wrap">
            <Btn variant="primary" icon="check" disabled={!dirty || !subject.trim() || !body.trim()} onClick={() => act.saveTemplate({ ...t, subject, body })}>Save template</Btn>
            {dirty && <Btn variant="ghost" onClick={() => { setSubject(t.subject); setBody(t.body); }}>Discard changes</Btn>}
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ── Governance and AI ── */
const MODE: Record<string, string> = {
  "ag-briefing": "Read-only", "ag-ops-watchdog": "Draft-only", "ag-drawing-coordinator": "Draft-only (can block an incomplete brief)",
  "ag-client-care": "Draft-only", "ag-lead-response": "Sends the approved acknowledgement template only", "ag-document-checker": "Flag-only",
};
function Governance() {
  return (
    <>
      <PageHead title="Governance and AI" sub="What the simulated agents may read and do, and which steps always need a person." />
      <Panel title="Agent data and actions" flush>
        <div className="j-tablewrap">
          <table className="j-table">
            <thead><tr><th>Agent</th><th>Reads</th><th>Mode</th><th>Never</th></tr></thead>
            <tbody>
              {AGENTS.map((a) => (
                <tr key={a.id}>
                  <td className="j-cell-main" style={{ whiteSpace: "nowrap" }}>{a.name}</td>
                  <td style={{ minWidth: 200 }}>{a.inputs.join(", ")}</td>
                  <td style={{ minWidth: 160 }}>{MODE[a.id] || "Draft-only"}</td>
                  <td style={{ minWidth: 200 }}>{a.never}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      <div className="jo-two even">
        <Panel title="Always needs a person">
          <ul className="j-text" style={{ margin: 0, paddingLeft: 18 }}>
            <li>Sending a client message other than the approved acknowledgement</li>
            <li>Releasing a drawing to a client</li>
            <li>Recording an approval on a client's behalf</li>
            <li>Stage overrides, with a reason</li>
            <li>Fees, discounts and any commercial terms</li>
          </ul>
        </Panel>
        <Panel title="Awaiting production decision">
          <KV cols={1} items={[
            ["Draft retention", "Awaiting production decision"],
            ["Who can read agent drafts", "Awaiting production decision"],
            ["Model provider and data location", "Awaiting production decision"],
          ]} />
        </Panel>
      </div>
      <div className="j-note">Cross-border supplier access: the Philippines drawing team works outside the EEA. In production, what they can open (briefs, site maps, drawings) and the legal basis for that access need confirming with the practice; the demo limits them to their own assignments.</div>
      <div className="j-note warn"><strong>Agents never agree fees, certify drawings or promise planning outcomes.</strong></div>
    </>
  );
}

/* ── Experience ── */
function Experience({ d }: { d: DemoState }) {
  const [confirm, setConfirm] = useState(false);
  const i = storyIndex(d);
  const step = STORY[i];
  return (
    <>
      <PageHead title="Experience" sub="Demo controls. They affect only this local demo in this browser." />
      <div className="jo-two even">
        <Panel title="Guided story" sub="The Dunne enquiry, from website form to an approved Rev B.">
          <div className="j-stack">
            <div className="j-text">{i >= STORY.length ? "All " + STORY.length + " steps complete." : "Step " + (i + 1) + " of " + STORY.length + ": " + step.title + "."}</div>
            {step && <div className="j-small">{step.detail}</div>}
            <div><Btn variant="primary" icon="play" onClick={() => setStoryOpen(true)}>Open the guided story</Btn></div>
          </div>
        </Panel>
        <Panel title="Demo clock" sub="Moves the shared demo time forward. Due states and reminders update from it.">
          <div className="j-stack">
            <div className="j-text">Now {fmtDate(d.now)}, {fmtTime(d.now)} Dublin ({fmtTime(d.now, TZ_PH)} Manila).</div>
            <div className="j-row-wrap">
              <Btn icon="clock" onClick={() => act.advanceClock(3600000, "Simulate one hour")}>Simulate one hour</Btn>
              <Btn icon="arrow" onClick={() => act.advanceToNextMorning()}>Next working morning</Btn>
            </div>
          </div>
        </Panel>
        <Panel title="Reset demo" sub="Back to the Monday 19 October 09:00 baseline. Deterministic: the same records every time.">
          <Btn variant="danger" icon="refresh" onClick={() => setConfirm(true)}>Reset demo</Btn>
        </Panel>
        <Panel title="Theme">
          <div className="j-text">Light or dark theme is switched from the top bar.</div>
        </Panel>
      </div>
      <Dialog open={confirm} onClose={() => setConfirm(false)} title="Reset the demo?"
        footer={<><Btn variant="ghost" onClick={() => setConfirm(false)}>Cancel</Btn><Btn variant="danger" icon="refresh" onClick={() => { act.reset(); resetUi(); setConfirm(false); }}>Reset demo</Btn></>}>
        <div className="j-text">Every change made in this browser is discarded and the demo returns to the 19 October 09:00 baseline. This affects only this local demo; nothing outside the browser is touched.</div>
      </Dialog>
    </>
  );
}
