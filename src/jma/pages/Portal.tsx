/* Client portal preview. One column, mobile first. Shows only client-visible
   records: released revisions, published client documents, client-audience
   messages and published client FAQs. Everything comes from the same store the
   office uses, so the household sees the same drawing state as the staff. */
import { useEffect, useRef, useState } from "react";
import type { Article, ClientRequest, DemoState, Drawing, DrawingVersion, ID, Project } from "../types";
import { act, useDemo } from "../store";
import * as S from "../selectors";
import { Badge, Btn, Dialog, Empty, Field, Icon, KV, Panel, Tabs } from "../kit";
import { CLIENT_MILESTONES, stageDef } from "../template";
import { TZ_OFFICE, fmtDate, fmtDateTime } from "../time";
import DrawingCanvas, { type CanvasPin } from "./drawings/DrawingCanvas";
import { fileName } from "./drawings/shared";
import "../../styles/jma-drawings.css";

type PTab = "project" | "drawings" | "documents" | "messages" | "help";
const TABS: { id: PTab; label: string }[] = [
  { id: "project", label: "My project" }, { id: "drawings", label: "Drawings" }, { id: "documents", label: "Documents" },
  { id: "messages", label: "Messages" }, { id: "help", label: "Help" },
];
const APPROVAL_PURPOSE = "Approve the concept layout as the basis for the planning pack";
const SAMPLE_COMMENT = "Could we widen the kitchen sliding door from 2.4 m to 3.6 m and extend the terrace by 1.2 m?";

/* Client-safe views of the store */
const released = (d: DemoState, drawingId: ID) => S.versionsFor(d, drawingId).filter((v) => v.state === "Released" || v.state === "Superseded");
const outstanding = (d: DemoState, pid: ID) => Object.values(d.requests).filter((r) => r.projectId === pid && r.state === "Outstanding").sort((a, b) => a.requestedAt - b.requestedAt);
const issuedDrawings = (d: DemoState, pid: ID) => S.drawingsFor(d, pid).filter((dw) => !!S.latestReleased(d, dw.id));
const clientFaqs = (d: DemoState) => Object.values(d.articles).filter((a) => a.audience === "Client" && a.published && a.kind === "faq");

export default function Portal() {
  const d = useDemo();
  const [tab, setTab] = useState<PTab>("project");
  const [focusReq, setFocusReq] = useState<ID | null>(null);
  const client = d.persona.clientId ? d.clients[d.persona.clientId] : undefined;
  const projects = client ? Object.values(d.projects).filter((p) => p.clientId === client.id).sort((a, b) => (a.status === b.status ? a.id.localeCompare(b.id) : a.status === "Live" ? -1 : 1)) : [];
  const [pid, setPid] = useState<ID | undefined>(projects[0]?.id);
  const project = projects.find((p) => p.id === pid) || projects[0];
  const contact = d.persona.contactId ? d.contacts[d.persona.contactId] : undefined;

  if (!client) {
    return <main className="jd-portal"><Empty title="No household selected" body="Pick a client household in the demo strip to preview their portal." /></main>;
  }
  const go = (t: PTab, req?: ID) => { setTab(t); setFocusReq(req || null); window.scrollTo?.({ top: 0 }); };
  return (
    <main className="jd-portal" aria-label="Client portal">
      <header className="jd-portal-head">
        <div className="j-eyebrow">John Madden &amp; Associates</div>
        <h1 className="j-h1">{client.household} household</h1>
        <div className="j-text">{project ? project.id + " · " + project.locality : client.locality}{contact ? " · signed in as " + contact.name.split(" ")[0] : ""}</div>
        <span className="jd-portal-note"><Icon name="info" size={13} />Demo preview of a client portal. Fictional data; nothing is sent or stored outside this browser.</span>
        {projects.length > 1 && (
          <label className="jd-range" htmlFor="portal-proj"><span>Project</span>
            <select id="portal-proj" className="jd-select" value={project?.id} onChange={(e) => setPid(e.target.value)}>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.id} · {p.locality}</option>)}
            </select>
          </label>
        )}
      </header>
      {!project ? (
        <Panel><Empty title="No project yet" body="Your project appears here once your quote is accepted and the job is set up." /></Panel>
      ) : (
        <>
          <nav className="jd-portal-nav" aria-label="Portal sections"><Tabs label="Portal sections" value={tab} onChange={(t) => go(t as PTab)} tabs={TABS} /></nav>
          <section aria-label={TABS.find((t) => t.id === tab)?.label}>
            {tab === "project" && <MyProject p={project} go={go} />}
            {tab === "drawings" && <Drawings p={project} />}
            {tab === "documents" && <Documents p={project} focusReq={focusReq} />}
            {tab === "messages" && <Messages p={project} />}
            {tab === "help" && <Help p={project} />}
          </section>
        </>
      )}
    </main>
  );
}

/* ───────── My project ───────── */
function MyProject({ p, go }: { p: Project; go: (t: PTab, req?: ID) => void }) {
  const d = useDemo();
  const reqs = outstanding(d, p.id);
  const cur = S.clientMilestone(p.stage);
  const def = stageDef(p.stage);
  const owner = S.firstName(d, p.ownerId);
  const nextRem = reqs.map((r) => r.nextReminderAt).filter((x): x is number => !!x).sort((a, b) => a - b)[0];
  const relevant = clientFaqs(d).filter((a) => a.stages.includes(p.stage)).slice(0, 3);
  return (
    <div className="j-stack" style={{ gap: 16, paddingTop: 14 }}>
      <Panel title="What we need from you">
        {reqs.length === 0 ? (
          <div className="j-text">Nothing is needed from you right now. We will let you know if that changes.</div>
        ) : (
          <div className="j-stack">
            {reqs.map((r) => <NeedCard key={r.id} r={r} go={go} />)}
          </div>
        )}
      </Panel>

      <Panel title="Where your project is">
        <div className="j-stack">
          <div className="jd-need" style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}>
            <div className="jd-need-title">{def.clientText}</div>
            <div className="j-text">{clientNext(d, p, reqs)}</div>
          </div>
          <ol className="jd-ms" aria-label="Project milestones">
            {CLIENT_MILESTONES.map((m, i) => {
              const state = i < cur ? "done" : i === cur ? "now" : "later";
              return (
                <li key={m.label} className={state} aria-current={state === "now" ? "step" : undefined}>
                  <span className="jd-ms-ico"><Icon name={state === "done" ? "check" : state === "now" ? "flag" : "clock"} size={13} /></span>
                  <span><strong>{m.label}</strong><span className="jd-ms-state">{state === "done" ? "Done" : state === "now" ? "Current step" : "Still to come"}</span></span>
                </li>
              );
            })}
          </ol>
          <KV cols={2} items={[
            ["Your contact at the office", owner],
            ["Next reminder", nextRem ? fmtDate(nextRem) + " (only if still outstanding)" : "None scheduled"],
          ]} />
        </div>
      </Panel>

      {relevant.length > 0 && (
        <Panel title="Guidance for this step">
          <div className="j-stack">
            {relevant.map((a) => (
              <Btn key={a.id} icon="info" onClick={() => go("help")} className="jd-left">{a.title}{a.video ? " (includes a demo guide)" : ""}</Btn>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

function NeedCard({ r, go }: { r: ClientRequest; go: (t: PTab, req?: ID) => void }) {
  return (
    <div className="jd-need">
      <div className="jd-need-title">{r.kind === "Document" ? "Please upload: " + r.label : r.label}</div>
      <div className="j-small">Asked on {fmtDate(r.requestedAt)}{r.nextReminderAt ? ". Next reminder " + fmtDate(r.nextReminderAt) + " if still needed." : "."}{r.blocking ? " Your project waits for this." : ""}</div>
      <div className="j-row-wrap">
        {r.kind === "Document"
          ? <Btn variant="primary" icon="upload" onClick={() => go("documents", r.id)}>Upload {r.label.toLowerCase()}</Btn>
          : <Btn variant="primary" icon="eye" onClick={() => go("drawings")}>Review the drawing</Btn>}
      </div>
    </div>
  );
}

function clientNext(d: DemoState, p: Project, reqs: ClientRequest[]): string {
  const doc = reqs.find((r) => r.kind === "Document");
  if (doc) return "Next: upload your " + doc.label.toLowerCase() + " so we can keep going.";
  const dec = reqs.find((r) => r.kind === "Decision");
  if (dec) return "Next: look at the latest drawing, then approve it or add comments.";
  if (S.openAmendments(d, p.id).length) return "Next: we are working on the changes you asked for. We will tell you when a revised drawing is ready.";
  if (p.stage === "concept") return "Next: we are preparing your drawings and will tell you when they are ready to review.";
  if (p.stage === "review") {
    const dw = issuedDrawings(d, p.id)[0]; const v = dw && S.latestReleased(d, dw.id);
    if (v && S.approvalFor(d, v.id)) return "Thanks for your approval. " + S.firstName(d, p.ownerId) + " will be in touch about the next step.";
  }
  return "Nothing is needed from you at the moment.";
}

/* ───────── Drawings ───────── */
function Drawings({ p }: { p: Project }) {
  const d = useDemo();
  const list = issuedDrawings(d, p.id);
  if (!list.length) return <div style={{ paddingTop: 14 }}><Panel><Empty title="No drawings issued yet" body="Drawings appear here once the office has checked and released them. We will email you when one is ready." /></Panel></div>;
  return <div className="j-stack" style={{ gap: 16, paddingTop: 14 }}>{list.map((dw) => <DrawingReview key={dw.id} dw={dw} p={p} />)}</div>;
}

function DrawingReview({ dw, p }: { dw: Drawing; p: Project }) {
  const d = useDemo();
  const v = S.latestReleased(d, dw.id)!;
  const history = released(d, dw.id);
  const prev = history.filter((x) => x.id !== v.id).pop();
  const [pinMode, setPinMode] = useState(false);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { if (pending) boxRef.current?.focus(); }, [pending]);
  useEffect(() => { setPinMode(false); setPending(null); setText(""); setErr(""); }, [v.id]);

  const approval = S.approvalFor(d, v.id);
  const unresolved = S.openAmendments(d, p.id);
  const decisionReq = Object.values(d.requests).some((r) => r.projectId === p.id && r.kind === "Decision" && r.state === "Outstanding");
  const needsDecision = decisionReq || p.stage === "review";
  const canApprove = !approval && unresolved.length === 0 && needsDecision;
  const comments = Object.values(d.amendments).filter((a) => a.versionId === v.id).sort((a, b) => a.createdAt - b.createdAt);
  const pins: CanvasPin[] = comments.map((a, i) => ({ id: a.id, x: a.pin.x, y: a.pin.y, n: i + 1, tone: a.state === "Released" ? "done" : "open", active: active === a.id, label: "Comment " + (i + 1) + ": " + a.text }));
  if (pending) pins.push({ id: "new", x: pending.x, y: pending.y, n: "+", tone: "new", label: "New comment position" });
  const included = v.addresses.map((x) => d.amendments[x]).filter(Boolean);
  const pastApprovals = Object.values(d.approvals).filter((a) => history.some((x) => x.id === a.versionId)).sort((a, b) => b.at - a.at);
  const ackText = "I approve " + dw.number + " Rev " + v.rev + " as the basis for the next stage. I understand this approval applies to this revision only.";

  const save = () => {
    if (!pending) { setErr("Choose a spot on the drawing first."); return; }
    if (!text.trim()) { setErr("Write the change you would like."); return; }
    const r = act.addAmendment(v.id, pending, text);
    if (r.ok) { setPending(null); setText(""); setErr(""); }
  };
  const blockedReason = approval ? "You approved Rev " + v.rev + " on " + fmtDateTime(approval.at) + ". If something has changed, send us a message."
    : unresolved.length ? "Your comments are with the office. You can approve once a revised drawing is issued."
    : !needsDecision ? "No decision is needed on this revision." : "";

  return (
    <Panel title={dw.number + " Rev " + v.rev} sub={dw.title + ". Issued " + fmtDateTime(v.releasedAt, TZ_OFFICE)}
      actions={<Badge tone={approval ? "ok" : "accent"} icon={approval ? "check" : "eye"}>{approval ? "Approved" : "Current issue"}</Badge>}>
      <div className="j-stack" style={{ gap: 14 }}>
        <div className="jd-need">
          <div className="jd-need-title">{approval ? "You approved this revision" : canApprove ? "Ready for your decision" : "Your review"}</div>
          {canApprove ? <div className="j-text">Have a look, zoom in, and add a comment on anything you would like changed. If you are happy with it, approve Rev {v.rev}.</div> : <div className="j-text">{blockedReason}</div>}
          <div className="j-row-wrap">
            {canApprove && <Btn variant="primary" icon="check" onClick={() => setConfirm(true)}>Approve Rev {v.rev}</Btn>}
            {!approval && (
              <Btn icon="pin" pressed={pinMode} onClick={() => { setPinMode((x) => !x); setErr(""); }}>{pinMode ? "Cancel adding a comment" : "Add comment"}</Btn>
            )}
            <a className="j-btn j-btn-secondary" href={v.asset} download={fileName(dw, v)}><Icon name="download" size={14} />Download SVG</a>
          </div>
        </div>

        {pinMode && <div className="j-note" role="status">Tap or click the spot on the drawing you mean. Keyboard: focus the drawing and press Enter, or use Place comment at centre.</div>}
        <DrawingCanvas src={v.asset} label={dw.number + " Rev " + v.rev} pins={pins} pinMode={pinMode}
          onPin={(pt) => { setPending(pt); setPinMode(false); setErr(""); }} onPinClick={(x) => setActive(active === x ? null : x)} />

        {pending && (
          <div className="j-stack">
            <Field label={"Your comment on Rev " + v.rev} htmlFor={"cm-" + v.id} error={err} hint="One change per comment works best. The office reviews it before anything is drawn.">
              <textarea ref={boxRef} id={"cm-" + v.id} className="j-textarea" value={text} placeholder={SAMPLE_COMMENT} onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) setErr(""); }} />
            </Field>
            <div className="j-row-wrap">
              <Btn variant="primary" icon="send" onClick={save}>Save comment</Btn>
              <Btn variant="ghost" onClick={() => { setPending(null); setErr(""); }}>Cancel</Btn>
            </div>
          </div>
        )}
        {!pending && err && <div className="j-error" role="alert">{err}</div>}

        <div className="j-stack" style={{ gap: 8 }}>
          <h3 className="j-h3">Your comments on Rev {v.rev}</h3>
          {comments.length === 0 ? <div className="j-small">No comments on this revision yet.</div> : comments.map((a, i) => {
            const res = a.resolvedByVersionId ? d.versions[a.resolvedByVersionId] : undefined;
            const resVisible = res && (res.state === "Released" || res.state === "Superseded");
            return (
              <button key={a.id} type="button" className={"jd-comment" + (active === a.id ? " on" : "")} aria-pressed={active === a.id} onClick={() => setActive(active === a.id ? null : a.id)}>
                <span className="jd-comment-n" aria-hidden="true">{i + 1}</span>
                <span className="jd-comment-body">
                  <span className="jd-comment-text">{"“" + a.text + "”"}</span>
                  <span className="jd-meta">{S.staffName(d, a.requesterId)} · {fmtDateTime(a.createdAt)}</span>
                  {a.state === "Released" && resVisible
                    ? <Badge tone="ok" icon="check">{"Included in Rev " + res!.rev}</Badge>
                    : <Badge tone="warn" icon="clock">With the office</Badge>}
                </span>
              </button>
            );
          })}
          {included.length > 0 && (
            <div className="j-note">
              <strong>Changes included in Rev {v.rev}:</strong> {included.map((a) => "“" + a.text + "”").join("; ")}
              {v.changeSummary ? <div className="jd-meta" style={{ marginTop: 4 }}>{v.changeSummary}</div> : null}
            </div>
          )}
          <div className="j-small">Comments are reviewed by the office. Nothing is approved by AI.</div>
        </div>

        {prev && (
          <div className="j-stack">
            <Btn icon="layers" pressed={compare} onClick={() => setCompare((x) => !x)}>{compare ? "Hide comparison" : "Compare with Rev " + prev.rev}</Btn>
            {compare && (
              <div className="jd-compare">
                <div className="jd-compare-col"><div className="j-row-wrap"><span className="j-h3">Rev {prev.rev}</span><Badge tone="neutral" icon="layers">Earlier issue</Badge></div><DrawingCanvas src={prev.asset} label={dw.number + " Rev " + prev.rev} compact /></div>
                <div className="jd-compare-col"><div className="j-row-wrap"><span className="j-h3">Rev {v.rev}</span><Badge tone="accent" icon="eye">Current issue</Badge></div><DrawingCanvas src={v.asset} label={dw.number + " Rev " + v.rev} compact /></div>
              </div>
            )}
          </div>
        )}

        {pastApprovals.length > 0 && (
          <div className="j-stack" style={{ gap: 8 }}>
            <h3 className="j-h3">Approvals on record</h3>
            {pastApprovals.map((a) => (
              <div key={a.id} className="j-note">
                <div><strong>Rev {d.versions[a.versionId].rev}</strong> approved by {S.staffName(d, a.actorId)}, {fmtDateTime(a.at)}. Read-only.</div>
                <blockquote className="jd-quote" style={{ marginTop: 6 }}>{a.ackText}</blockquote>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)} title={"Approve " + dw.number + " Rev " + v.rev} footer={<>
        <Btn variant="ghost" onClick={() => setConfirm(false)}>Go back</Btn>
        <Btn variant="primary" icon="check" onClick={() => { const r = act.approveVersion(v.id); if (r.ok) setConfirm(false); }}>Approve Rev {v.rev}</Btn>
      </>}>
        <KV cols={1} items={[["Drawing number", dw.number], ["Revision", "Rev " + v.rev + ", issued " + fmtDateTime(v.releasedAt)], ["Purpose", APPROVAL_PURPOSE]]} />
        <blockquote className="jd-quote">{ackText}</blockquote>
        <div className="j-small">This applies to Rev {v.rev} only. A later revision would need a new decision. Your approval is a decision about the layout; it does not mean planning permission or any other consent.</div>
      </Dialog>
    </Panel>
  );
}

/* ───────── Documents ───────── */
const typeLabel = (mime?: string, asset?: string) => {
  if (!asset) return "Record only, no file in this demo";
  if (mime === "image/svg+xml" || asset.endsWith(".svg")) return "SVG image";
  if (mime === "text/plain" || asset.endsWith(".txt")) return "Text file (.txt)";
  if (mime === "application/pdf") return "PDF";
  return "File";
};
const fileOf = (asset: string) => asset.split("/").pop() || "file";

function Documents({ p, focusReq }: { p: Project; focusReq: ID | null }) {
  const d = useDemo();
  const docs = S.visibleDocs(d).filter((x) => x.projectId === p.id && x.visibility === "Client" && x.published).sort((a, b) => b.at - a.at);
  const reqs = outstanding(d, p.id).filter((r) => r.kind === "Document");
  const drawings = issuedDrawings(d, p.id);
  return (
    <div className="j-stack" style={{ gap: 16, paddingTop: 14 }}>
      {reqs.map((r) => <UploadForm key={r.id} r={r} focus={focusReq === r.id} />)}
      <Panel title="Your documents">
        {docs.length === 0 ? <div className="j-text">No documents shared yet.</div> : docs.map((x) => (
          <div key={x.id} className="jd-doc">
            <div className="jd-doc-main">
              <div className="j-cell-main">{x.name}</div>
              <div className="j-small">{x.type} · {typeLabel(x.mime, x.asset)}{x.size ? " · " + x.size : ""} · added {fmtDate(x.at)}{x.storage.startsWith("Portal upload") && !x.asset ? " · simulated upload, file not stored" : ""}</div>
            </div>
            {x.asset && <a className="j-btn j-btn-secondary" href={x.asset} download={fileOf(x.asset)}><Icon name="download" size={14} />Download</a>}
          </div>
        ))}
      </Panel>
      <Panel title="Issued drawings">
        {drawings.length === 0 ? <div className="j-text">No drawings issued yet.</div> : drawings.flatMap((dw) => released(d, dw.id).slice().reverse().map((v: DrawingVersion) => (
          <div key={v.id} className="jd-doc">
            <div className="jd-doc-main">
              <div className="j-cell-main">{dw.number} Rev {v.rev}</div>
              <div className="j-small">{dw.title} · SVG drawing · {v.state === "Released" ? "current issue" : "earlier issue"} · issued {fmtDate(v.releasedAt)}</div>
            </div>
            <a className="j-btn j-btn-secondary" href={v.asset} download={fileName(dw, v)}><Icon name="download" size={14} />Download SVG</a>
          </div>
        )))}
      </Panel>
    </div>
  );
}

const defaultFile = (r: ClientRequest) => (r.docType || r.label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + (r.docType === "Site map" ? ".jpg" : ".pdf");
function UploadForm({ r, focus }: { r: ClientRequest; focus: boolean }) {
  const [name, setName] = useState(defaultFile(r));
  const [type, setType] = useState(r.docType || r.label);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<{ name?: string; type?: string; ok?: string }>({});
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (focus) ref.current?.focus(); }, [focus]);
  const fid = "up-" + r.id;
  const submit = () => {
    const e: typeof err = {};
    if (!name.trim()) e.name = "Add the file name.";
    else if (!/\.(jpe?g|png|pdf|heic)$/i.test(name.trim())) e.name = "Use a file ending in .jpg, .png, .heic or .pdf.";
    if (!type.trim()) e.type = "Say what kind of document this is.";
    if (!ok) e.ok = "Tick the box to confirm.";
    setErr(e);
    if (e.name || e.type || e.ok) return;
    act.uploadClientDocument(r.id, name.trim());
  };
  return (
    <Panel title={"Upload: " + r.label} sub={"Requested " + fmtDate(r.requestedAt) + (r.nextReminderAt ? ". Next reminder " + fmtDate(r.nextReminderAt) + " if still needed." : "")}>
      <form className="j-stack" onSubmit={(e) => { e.preventDefault(); submit(); }} noValidate>
        <div className="j-note">Simulated upload. The file is not stored or sent anywhere; only the details below are recorded in this demo.</div>
        <Field label="Choose a file (optional in this demo)" htmlFor={fid + "-file"} hint="Only the file name is used. The file itself is never read.">
          <input id={fid + "-file"} type="file" className="jd-file-input" accept=".jpg,.jpeg,.png,.pdf,.heic,image/*,application/pdf"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) { setName(f.name); setErr((x) => ({ ...x, name: undefined })); } }} />
        </Field>
        <Field label="File name" htmlFor={fid + "-name"} error={err.name}>
          <input ref={ref} id={fid + "-name"} className="j-input" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!err.name} />
        </Field>
        <Field label="Document type" htmlFor={fid + "-type"} error={err.type}>
          <input id={fid + "-type"} className="j-input" value={type} onChange={(e) => setType(e.target.value)} aria-invalid={!!err.type} />
        </Field>
        <div className="j-field">
          <label className="j-check" htmlFor={fid + "-ok"}>
            <input id={fid + "-ok"} type="checkbox" checked={ok} onChange={(e) => { setOk(e.target.checked); if (e.target.checked) setErr((x) => ({ ...x, ok: undefined })); }} aria-invalid={!!err.ok} />
            <span>I confirm this is the {r.label.toLowerCase()} for this project.</span>
          </label>
          {err.ok && <div className="j-error" role="alert">{err.ok}</div>}
        </div>
        <div className="j-row-wrap"><Btn type="submit" variant="primary" icon="upload">Upload {r.label.toLowerCase()}</Btn></div>
      </form>
    </Panel>
  );
}

/* ───────── Messages ───────── */
function Messages({ p }: { p: Project }) {
  const d = useDemo();
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const me = d.persona.contactId;
  const msgs = Object.values(d.messages)
    .filter((m) => m.audience === "Client" && (m.projectId === p.id || (!!p.leadId && m.leadId === p.leadId)) && m.at <= d.now + 60000)
    .sort((a, b) => a.at - b.at);
  const send = () => {
    if (!body.trim()) { setErr("Write a message first."); return; }
    const r = act.sendMessage({ projectId: p.id, body, channel: "Portal", audience: "Client" });
    if (r.ok) { setBody(""); setErr(""); }
  };
  return (
    <div className="j-stack" style={{ gap: 16, paddingTop: 14 }}>
      <Panel title={"Messages with the office about " + p.id}>
        {msgs.length === 0 ? <div className="j-text">No messages yet.</div> : (
          <div className="jd-thread" role="log" aria-label="Message thread">
            {msgs.map((m) => {
              const mine = m.direction === "in";
              const from = mine ? (m.fromId === me ? "You" : S.staffName(d, m.fromId)) : S.staffName(d, m.fromId) + ", John Madden & Associates";
              return (
                <div key={m.id} className={"jd-msg" + (mine ? " mine" : "")}>
                  <div className="jd-meta"><strong>{from}</strong> · {fmtDateTime(m.at)} · {m.channel}{m.automated ? " · automated update" : ""}</div>
                  {m.subject && <div className="j-cell-main">{m.subject}</div>}
                  <div className="jd-msg-body">{m.body}</div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
      <Panel title="Send a message">
        <form className="j-stack" onSubmit={(e) => { e.preventDefault(); send(); }} noValidate>
          <Field label="Message to the office" htmlFor="pm-body" error={err} hint="Goes to your project team in the portal. Demo only: nothing is emailed.">
            <textarea id="pm-body" className="j-textarea" value={body} onChange={(e) => { setBody(e.target.value); if (e.target.value.trim()) setErr(""); }} />
          </Field>
          <div className="j-row-wrap"><Btn type="submit" variant="primary" icon="send">Send message</Btn></div>
        </form>
      </Panel>
    </div>
  );
}

/* ───────── Help ───────── */
function Help({ p }: { p: Project }) {
  const d = useDemo();
  const faqs = clientFaqs(d).sort((a, b) => a.title.localeCompare(b.title));
  const now = faqs.filter((a) => a.stages.includes(p.stage));
  const rest = faqs.filter((a) => !a.stages.includes(p.stage));
  return (
    <div className="j-stack" style={{ gap: 16, paddingTop: 14 }}>
      <Panel title="For where your project is now" sub={stageDef(p.stage).clientText}>
        {now.length === 0 ? <div className="j-text">No guidance is linked to this step yet. Send us a message with any question.</div> : now.map((a) => <FaqArticle key={a.id} a={a} />)}
      </Panel>
      {rest.length > 0 && (
        <Panel title="Other questions">
          {rest.map((a) => (
            <details key={a.id} className="jd-details">
              <summary>{a.title}</summary>
              <div><FaqArticle a={a} bare /></div>
            </details>
          ))}
        </Panel>
      )}
    </div>
  );
}

function FaqArticle({ a, bare }: { a: Article; bare?: boolean }) {
  return (
    <article className="jd-article" style={bare ? { padding: 0, border: 0 } : undefined}>
      {!bare && <h3 className="j-h3" style={{ fontSize: 15 }}>{a.title}</h3>}
      {a.body.split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}
      {a.video && <GuideVideo video={a.video} />}
    </article>
  );
}

function GuideVideo({ video }: { video: NonNullable<Article["video"]> }) {
  const [failed, setFailed] = useState(false);
  return (
    <figure className="j-stack" style={{ margin: 0, gap: 8 }}>
      <figcaption className="j-row-wrap"><Badge tone="info" icon="play">Demo guide</Badge></figcaption>
      {failed
        ? <div className="j-note" role="status">Video guide to be supplied. The transcript is below.</div>
        : (
          <video className="jd-video" controls preload="metadata" src={video.url} onError={() => setFailed(true)}>
            <track kind="captions" src={video.captions} srcLang="en" label="English" default />
          </video>
        )}
      <details className="jd-details" open={failed}>
        <summary>Transcript</summary>
        <div><p className="jd-transcript">{video.transcript}</p></div>
      </details>
    </figure>
  );
}
