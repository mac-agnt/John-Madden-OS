/* Baseline fixtures for the John Madden OS demo. Every household, job, lead,
   message and date below is fictional. Ciaran Madden and cmadden@johnmadden.ie
   are the only real details (supplied contact; demo role assumed). */
import type {
  ActivityEvent, Amendment, Approval, Article, AutomationRule, AutomationRun, Client, ClientRequest,
  Contact, CouncilRecord, DemoState, DocumentRec, Drawing, DrawingBrief, DrawingVersion, ID, Lead,
  Message, ProgrammeItem, Project, Quote, SiteVisit, Staff, StageKey, Task, Template,
} from "./types";
import { BASELINE, TZ_OFFICE, TZ_PH, addWorkingDays, dub, mnl } from "./time";
import { STAGES, TEMPLATE_V1, stageIndex } from "./template";

export const STATE_VERSION = 9;

export const ASSETS = {
  sampleA: "/demo/drawings/sample-house-A-101-rev-A.svg",
  sampleB: "/demo/drawings/sample-house-A-101-rev-B.svg",
  dunneA: "/demo/drawings/JMA-26025-A-101-rev-A.svg",
  dunneB: "/demo/drawings/JMA-26025-A-101-rev-B.svg",
  working: "/demo/drawings/sample-house-A-201-rev-P1.svg",
  siteMap: "/demo/docs/sample-site-map.svg",
  fiRequest: "/demo/docs/sample-further-information-request.txt",
};

const STAFF: Staff[] = [
  { id: "s-ciaran", name: "Ciaran Madden", initials: "CM", role: "Administrator and management viewer", team: "Mullingar", tz: TZ_OFFICE, email: "cmadden@johnmadden.ie", emailNote: "Supplied contact. Demo role assumed.", real: true, colour: "#557AA3" },
  { id: "s-aoife", name: "Aoife Brennan", initials: "AB", role: "Project delivery manager", team: "Mullingar", tz: TZ_OFFICE, email: "aoife.demo@johnmadden.ie", emailNote: "Illustrative alias. Fictional person. Nothing is sent.", real: false, colour: "#8fb3d9" },
  { id: "s-niamh", name: "Niamh Doyle", initials: "ND", role: "Client coordinator and sales follow-up", team: "Mullingar", tz: TZ_OFFICE, email: "niamh.demo@johnmadden.ie", emailNote: "Illustrative alias. Fictional person. Nothing is sent.", real: false, colour: "#c9a7e0" },
  { id: "s-eoin", name: "Eoin Walsh", initials: "EW", role: "Architectural technologist and amendment owner", team: "Mullingar", tz: TZ_OFFICE, email: "eoin.demo@johnmadden.ie", emailNote: "Illustrative alias. Fictional person. Nothing is sent.", real: false, colour: "#e3c27f" },
  { id: "s-sean", name: "Seán Keane", initials: "SK", role: "Survey and site-visit coordinator", team: "Mullingar", tz: TZ_OFFICE, email: "sean.demo@johnmadden.ie", emailNote: "Illustrative alias. Fictional person. Nothing is sent.", real: false, colour: "#9fd6c0" },
  { id: "s-bea", name: "Bea Santos", initials: "BS", role: "Drawing team lead", team: "Philippines", tz: TZ_PH, email: "bea.demo@johnmadden.ie", emailNote: "Illustrative alias. Fictional person. Nothing is sent.", real: false, colour: "#e7a493" },
  { id: "s-carlo", name: "Carlo Reyes", initials: "CR", role: "Drawing technician", team: "Philippines", tz: TZ_PH, email: "carlo.demo@johnmadden.ie", emailNote: "Illustrative alias. Fictional person. Nothing is sent.", real: false, colour: "#a9c98a" },
  { id: "s-mia", name: "Mia Cruz", initials: "MC", role: "Drawing technician", team: "Philippines", tz: TZ_PH, email: "mia.demo@johnmadden.ie", emailNote: "Illustrative alias. Fictional person. Nothing is sent.", real: false, colour: "#d6b0c8" },
];

type Row = [id: string, household: string, locality: string, stage: StageKey, owner: string, target: [number, number], note: string, entered: [number, number], contacts: string[]];
const PROJECTS: Row[] = [
  ["JMA-26001", "Byrne", "Ballinafid", "review", "s-eoin", [10, 22], "Rev A under client review; no change request yet.", [10, 12], ["Siobhán Byrne", "Declan Byrne"]],
  ["JMA-26002", "Kelly", "Kinnegad", "concept", "s-aoife", [10, 16], "Carlo's assignment overdue; awaiting first return.", [10, 2], ["Orla Kelly"]],
  ["JMA-26003", "Walsh", "Moate", "brief", "s-niamh", [10, 19], "Brief incomplete: site map missing; release blocked.", [10, 9], ["Gráinne Walsh", "Martin Walsh"]],
  ["JMA-26004", "Nolan", "Killucan", "fi", "s-aoife", [10, 21], "Internal response target; illustrative recorded council date 23 Oct.", [10, 13], ["Ruth Nolan", "Colm Nolan"]],
  ["JMA-26005", "Murphy", "Rochfortbridge", "review", "s-eoin", [10, 16], "Rev A change request; Eoin's amendment task overdue.", [10, 5], ["Brian Murphy", "Tara Murphy"]],
  ["JMA-26006", "O'Brien", "Delvin", "concept", "s-aoife", [10, 15], "Mia's assignment overdue; awaiting first return.", [10, 1], ["Fergal O'Brien", "Lisa O'Brien"]],
  ["JMA-26007", "Daly", "Castlepollard", "concept", "s-aoife", [10, 21], "Bea producing concept drawing.", [10, 9], ["Niall Daly"]],
  ["JMA-26008", "Keane", "Kilbeggan", "concept", "s-eoin", [10, 22], "Carlo producing concept drawing.", [10, 12], ["Ailbhe Keane"]],
  ["JMA-26009", "Brennan", "Raharney", "concept", "s-aoife", [10, 23], "Mia producing concept drawing.", [10, 13], ["Rory Brennan", "Edel Brennan"]],
  ["JMA-26010", "Reilly", "Collinstown", "concept", "s-eoin", [10, 23], "Bea producing concept drawing.", [10, 13], ["Joanne Reilly"]],
  ["JMA-26011", "Lynch", "Ballynacargy", "concept", "s-aoife", [10, 26], "Carlo producing concept drawing.", [10, 14], ["Kevin Lynch", "Maeve Lynch"]],
  ["JMA-26012", "Duffy", "Milltownpass", "concept", "s-eoin", [10, 27], "Mia producing concept drawing.", [10, 15], ["Sinéad Duffy"]],
  ["JMA-26013", "Ryan", "Ballymore", "review", "s-eoin", [10, 23], "Rev A awaiting client review.", [10, 15], ["Darragh Ryan", "Claire Ryan"]],
  ["JMA-26014", "McKenna", "Clonmellon", "review", "s-aoife", [10, 23], "Rev B awaiting client review.", [9, 28], ["Louise McKenna"]],
  ["JMA-26015", "Connolly", "Coole", "review", "s-eoin", [10, 26], "Rev A awaiting client review.", [10, 16], ["Shane Connolly", "Deborah Connolly"]],
  ["JMA-26016", "Flynn", "Multyfarnham", "review", "s-aoife", [10, 27], "Rev B issued; next client reminder scheduled.", [9, 22], ["Gerard Flynn", "Úna Flynn"]],
  ["JMA-26017", "Casey", "Rathowen", "pack", "s-eoin", [10, 22], "Pack preparation checklist.", [10, 8], ["Alan Casey"]],
  ["JMA-26018", "Farrell", "Mount Temple", "pack", "s-aoife", [10, 23], "Approved concept; supporting documents being collected.", [10, 12], ["Hazel Farrell"]],
  ["JMA-26019", "Donnelly", "Ballykeeran", "pack", "s-eoin", [10, 26], "Office review before submission.", [10, 5], ["Cathal Donnelly"]],
  ["JMA-26020", "Moore", "Athlone", "lodged", "s-aoife", [10, 26], "Next status check; external decision pending.", [9, 18], ["Karen Moore"]],
  ["JMA-26021", "Quinn", "Glasson", "lodged", "s-aoife", [10, 28], "Next status check; external decision pending.", [9, 25], ["Dermot Quinn", "Paula Quinn"]],
  ["JMA-26022", "Whelan", "Loughnavalley", "working", "s-eoin", [10, 28], "Concept/planning records already complete in sample history.", [10, 1], ["Fiachra Whelan"]],
  ["JMA-26023", "Hughes", "Drumraney", "working", "s-eoin", [10, 29], "Construction drawing issue checklist.", [10, 7], ["Imelda Hughes", "Joe Hughes"]],
  ["JMA-26024", "Murray", "Streamstown", "survey", "s-sean", [10, 21], "Site appointment and inputs checklist.", [10, 14], ["Barry Murray"]],
];

/** Philippines assignments for the eight concept jobs. */
const ASSIGN: Record<string, { who: string; status: DrawingBrief["status"]; issued: [number, number]; due: [number, number] }> = {
  "JMA-26002": { who: "s-carlo", status: "In progress", issued: [10, 2], due: [10, 16] },
  "JMA-26006": { who: "s-mia", status: "In progress", issued: [10, 1], due: [10, 15] },
  "JMA-26007": { who: "s-bea", status: "In progress", issued: [10, 9], due: [10, 21] },
  "JMA-26008": { who: "s-carlo", status: "In progress", issued: [10, 12], due: [10, 22] },
  "JMA-26009": { who: "s-mia", status: "Acknowledged", issued: [10, 13], due: [10, 23] },
  "JMA-26010": { who: "s-bea", status: "In progress", issued: [10, 13], due: [10, 23] },
  "JMA-26011": { who: "s-carlo", status: "Acknowledged", issued: [10, 14], due: [10, 26] },
  "JMA-26012": { who: "s-mia", status: "Issued", issued: [10, 15], due: [10, 27] },
};

const LEADS: [string, string, string, Lead["source"], Lead["status"], number | null, [number, number, number, number], string][] = [
  ["LEAD-001", "Aisling Burke", "Ballymore", "Website", "Qualified", null, [10, 8, 20, 41], "Single-storey home on family land; wants to understand planning first."],
  ["LEAD-002", "Mark and Helen Doyle", "Collinstown", "Referral", "Quote sent", 8500, [9, 29, 11, 5], "Referred by a previous client. Replacement dwelling on existing site."],
  ["LEAD-003", "Tom Fagan", "Kilbeggan", "Phone", "Quote sent", 9000, [10, 1, 15, 22], "Storey-and-a-half house; has a site map already."],
  ["LEAD-004", "Fiona Gannon", "Delvin", "Website", "Quote sent", 7500, [10, 6, 7, 58], "Compact three-bedroom home. Submitted the web form twice; merged."],
  ["LEAD-005", "Patrick and Clare Healy", "Killucan", "Walk-in", "Quote sent", 11000, [10, 7, 12, 30], "Larger family home with home office; walked in to Blackhall Street."],
  ["LEAD-006", "Deirdre Kavanagh", "Moate", "Email", "Contacted", null, [10, 13, 9, 47], "Asked about timelines for a one-off house; no site details yet."],
  ["LEAD-007", "Paul Leavy", "Rathowen", "Phone", "Qualified", null, [10, 14, 16, 10], "Wants a quote once the site purchase closes."],
  ["LEAD-008", "Emma and David Tormey", "Castlepollard", "Referral", "Contacted", null, [10, 16, 10, 5], "Referral from the Daly household. Exploring options."],
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, ".").replace(/^\.|\.$/g, "");

export function buildSeed(): DemoState {
  const st: DemoState = {
    version: STATE_VERSION, now: BASELINE, seq: 1000,
    persona: { kind: "admin", staffId: "s-ciaran" }, story: { step: 0, started: false },
    staff: {}, clients: {}, contacts: {}, leads: {}, quotes: {}, projects: {}, tasks: {}, briefs: {},
    drawings: {}, versions: {}, amendments: {}, approvals: {}, documents: {}, messages: {}, requests: {},
    council: {}, programme: {}, visits: {}, rules: {}, runs: {}, articles: {}, templates: {}, events: [],
    template: TEMPLATE_V1, templateHistory: [TEMPLATE_V1],
    settings: { amendmentSlaWD: 2, reminderDays: 3, maxReminders: 3, ackDelaySec: 38, workingDays: "Monday to Friday (holidays not modelled)", pauseReasons: ["Waiting on client", "Awaiting clarification", "On hold by client", "External dependency"], gatesEnforced: true },
    keys: {},
  };
  let n = 0;
  const id = (p: string) => p + "-" + (++n).toString(36);
  const ev = (at: number, actor: ActivityEvent["actor"], type: string, summary: string, subject: ActivityEvent["subject"], related: ID[] = [], status: ActivityEvent["status"] = "ok", source = "Seed history") => {
    st.events.push({ id: id("ev"), at, actor, type, summary, subject, related, status, source });
  };
  const staffActor = (sid: string) => ({ kind: "staff" as const, id: sid, name: st.staff[sid].name });
  const agentActor = (name: string) => ({ kind: "agent" as const, id: "ag-" + slug(name), name: name + " (simulated agent)" });
  const sysActor = { kind: "system" as const, id: "sys", name: "Workflow engine (simulated)" };

  STAFF.forEach((s) => (st.staff[s.id] = s));

  /* ── templates, rules, articles ── */
  const T: Template[] = [
    { id: "tpl-ack", name: "Enquiry acknowledgement", event: "Eligible enquiry captured", channel: "Email", audience: "Client", subject: "Thanks for your enquiry, {{first_names}}", body: "Hi {{first_names}}, thanks for getting in touch about your proposed home in {{locality}}. {{owner_first}} will follow up to understand your site and what you need. If you have a site map, you can add it here." },
    { id: "tpl-ready", name: "Your drawings are ready", event: "Drawing released", channel: "Email", audience: "Client", subject: "Your drawings are ready to review ({{drawing}} Rev {{rev}})", body: "Hi {{first_names}}, {{drawing}} Rev {{rev}} is ready in your portal. You can add comments on the drawing or approve it there. If anything is unclear, reply to this email." },
    { id: "tpl-change", name: "Change request received", event: "Client requests change", channel: "Portal", audience: "Client", subject: "We have your comments on Rev {{rev}}", body: "Thanks {{first_names}}. {{owner_first}} has your comment and will come back with a revised drawing. We will let you know when it is ready." },
    { id: "tpl-remind", name: "Outstanding input reminder", event: "Client input outstanding", channel: "Email", audience: "Client", subject: "A reminder about your {{item}}", body: "Hi {{first_names}}, we still need your {{item}} before we can finish your brief. You can upload it in your portal. Reply if you need help finding it." },
    { id: "tpl-approved", name: "Approval confirmation", event: "Client approves", channel: "Email", audience: "Client", subject: "You approved {{drawing}} Rev {{rev}}", body: "Thanks {{first_names}}. We have recorded your approval of {{drawing}} Rev {{rev}}. {{owner_first}} will be in touch about the next step." },
    { id: "tpl-quote", name: "Quote issued", event: "Quote sent", channel: "Email", audience: "Client", subject: "Your proposal from John Madden & Associates", body: "Hi {{first_names}}, your proposal for {{locality}} is attached. It sets out the scope we discussed. Fees shown are demo placeholders and tax treatment is to be confirmed." },
    { id: "tpl-brief", name: "Drawing brief issued", event: "Brief issued", channel: "Portal", audience: "Supplier", subject: "New drawing brief: {{project}}", body: "{{assignee_first}}, a new brief for {{project}} is ready. Please acknowledge it and raise any clarification in the thread." },
  ];
  T.forEach((t) => (st.templates[t.id] = t));

  const R: AutomationRule[] = [
    { id: "rule-ack", name: "Acknowledge eligible enquiries", trigger: "Eligible enquiry captured", guard: "Valid contact and a permitted channel", action: "Send personalised acknowledgement; assign owner; create follow-up task", stop: "Failure is recorded with a retry; a repeated event never creates a second lead or task", enabled: true },
    { id: "rule-stage-in", name: "Stage entry tasks", trigger: "Stage entered", guard: "Previous gates satisfied", action: "Create missing tasks and checklist items; send status message", stop: "Idempotent by project, stage and event; respects paused or excluded stages", enabled: true },
    { id: "rule-stage-out", name: "Stage exit record", trigger: "Stage exited", guard: "Exit checklist and sign-offs satisfied", action: "Record transition; cancel obsolete reminders", stop: "History kept; overrides need a reason", enabled: true },
    { id: "rule-brief", name: "Brief handoff", trigger: "Brief issued", guard: "Required inputs complete", action: "Create drawing assignment and team alert", stop: "An open clarification holds the return forecast", enabled: true },
    { id: "rule-return", name: "Returned drawing to office review", trigger: "Drawing returned", guard: "Valid new version", action: "Queue office review", stop: "Client is not notified; draft stays internal", enabled: true },
    { id: "rule-release", name: "Release notification", trigger: "Drawing released", guard: "Office review complete", action: "Publish the version to the portal and notify the client", stop: "No duplicate sends; earlier version stays in history", enabled: true },
    { id: "rule-change", name: "Change request to amendment", trigger: "Client requests change", guard: "Released version and a valid comment", action: "Amendment task for the named office owner; office alert", stop: "One request creates one task", enabled: true },
    { id: "rule-approve", name: "Version-specific approval", trigger: "Client approves", guard: "Current released issue with no unresolved required changes", action: "Record decision against the exact version; office alert", stop: "A new version needs a new decision; nothing is submitted automatically", enabled: true },
    { id: "rule-remind", name: "Outstanding input reminders", trigger: "Client input outstanding", guard: "Request unresolved", action: "Reminder after the configured delay", stop: "Stops on upload, cancellation or manual pause; message limit enforced", enabled: true },
    { id: "rule-overdue", name: "Overdue escalation", trigger: "Internal task overdue", guard: "Task open and not paused", action: "Manager attention event and escalation draft", stop: "Flag clears on completion; original lateness kept in history", enabled: true },
    { id: "rule-inbound", name: "Client upload or comment alert", trigger: "Client uploads or comments", guard: "Correct project and audience", action: "Staff notification linked to the event", stop: "Duplicate provider events do not repeat alerts (production requirement)", enabled: true },
  ];
  R.forEach((r) => (st.rules[r.id] = r));

  const run = (ruleId: string, eventKey: string, at: number, subject: AutomationRun["subject"], result: AutomationRun["result"], detail: string) => {
    const r = { id: id("run"), ruleId, eventKey, at, subject, result, detail };
    st.runs[r.id] = r;
    st.keys[eventKey] = r.id;
  };

  const ART: Article[] = [
    { id: "kb-sitemap", kind: "faq", title: "Preparing a site map", audience: "Client", stages: ["survey", "brief"], published: true, updatedAt: dub(9, 15, 10), updatedBy: "s-niamh",
      body: "We need a map that shows the site boundary so the drawings start from the right outline. If you bought the land recently, your solicitor usually has one. A clear photo or scan is fine to start with; we will tell you if anything else is needed. Upload it under Documents in your portal." },
    { id: "kb-brief", kind: "faq", title: "What goes into a brief", audience: "Client", stages: ["brief"], published: true, updatedAt: dub(9, 15, 10), updatedBy: "s-aoife",
      body: "The brief records what you want from the house: number of bedrooms, how you use the kitchen and living spaces, anything you want to avoid, and pictures of homes you like. We confirm it with you before drawings start, so changes later are easier to track." },
    { id: "kb-review", kind: "faq", title: "Reviewing a drawing", audience: "Client", stages: ["review"], published: true, updatedAt: dub(10, 1, 11), updatedBy: "s-eoin",
      body: "Open the latest issued revision in Drawings. Zoom in, then use Add comment and click the part of the drawing you mean. Each comment stays attached to that revision. When you are happy with the current revision, choose Approve. Approval applies to that exact revision only.",
      video: { url: "/demo/video/how-to-review-your-drawings.mp4", captions: "/demo/video/how-to-review-your-drawings.vtt", label: "Demo guide", transcript: "How to review your drawings. 1. Open Drawings in your portal and pick the latest issued revision. 2. Zoom in on the area you want to talk about. 3. Choose Add comment and click that spot on the drawing, then type your comment and save it. Your comment stays with that revision. 4. When the current revision is right, choose Approve and confirm. Approval applies to that revision only. A later revision needs its own approval." } },
    { id: "kb-changes", kind: "faq", title: "Requesting changes", audience: "Client", stages: ["review"], published: true, updatedAt: dub(10, 1, 11), updatedBy: "s-eoin",
      body: "Put each change as its own comment on the drawing, as close as you can to the area it affects. The office reviews every request before it is drawn, and will tell you if something needs a conversation first. You will see the revised drawing with a note of what changed." },
    { id: "kb-after-lodge", kind: "faq", title: "What happens after planning submission", audience: "Client", stages: ["lodged", "fi", "decision"], published: true, updatedAt: dub(9, 20, 9), updatedBy: "s-aoife",
      body: "Once the application is lodged, the council assesses it. The council may ask for further information, which we prepare with you. We record the dates the council gives us and show them here, but we cannot promise a decision date or outcome." },
    { id: "kb-handover", kind: "faq", title: "Preparing for handover", audience: "Client", stages: ["working", "commencement", "complete"], published: false, updatedAt: dub(10, 14, 15), updatedBy: "s-aoife",
      body: "At handover you receive the issued drawing package and any agreed documents in your portal. We will list anything still outstanding and who is responsible for it. (Draft: wording to be agreed with Ciaran.)" },
    { id: "kb-proc-brief", kind: "procedure", title: "Issuing a complete brief", audience: "Internal", stages: ["brief", "concept"], published: true, updatedAt: dub(9, 10, 9), updatedBy: "s-aoife",
      body: "1. Confirm the site map, survey notes and photos are attached. 2. Fill every brief field: house type, space needs, priorities, design notes, references, sheets and scope limits. 3. Set the target and office approver. 4. Issue to the named assignee; the system blocks issue while required inputs are missing. 5. Answer clarifications in the brief thread, not by email." },
    { id: "kb-proc-qa", kind: "procedure", title: "Reviewing returned drawings", audience: "Internal", stages: ["concept", "review", "working"], published: true, updatedAt: dub(9, 10, 9), updatedBy: "s-aoife",
      body: "1. Open the submitted version in Office review. 2. Check it against the brief: rooms, sheet set, title block, revision label, scope limits. 3. Return for correction with a note, or tick the checklist and release. 4. Release is the only step that makes a drawing client-visible. This is a workflow sign-off, not a compliance certificate." },
    { id: "kb-proc-amend", kind: "procedure", title: "Handling client amendments", audience: "Internal", stages: ["review"], published: true, updatedAt: dub(9, 10, 9), updatedBy: "s-eoin",
      body: "1. Each client comment on a released revision creates one amendment task. 2. Review feasibility before promising anything to the client. 3. Draw the change as a new revision and write a change summary naming the amendments it addresses. 4. Office review, then release. The earlier revision and its comments stay in history." },
  ];
  ART.forEach((a) => (st.articles[a.id] = a));

  /* ── projects, clients, briefs, drawings ── */
  const mkTask = (t: Omit<Task, "id" | "originalDue" | "dueHistory" | "deps" | "links" | "createdAt"> & Partial<Task>): Task => {
    const task: Task = { id: id("T"), originalDue: t.due, dueHistory: [], deps: [], links: {}, createdAt: t.createdAt ?? BASELINE - 86400000 * 3, ...t } as Task;
    st.tasks[task.id] = task;
    return task;
  };
  const mkDoc = (d: Omit<DocumentRec, "id">): DocumentRec => { const doc = { id: id("doc"), ...d }; st.documents[doc.id] = doc; return doc; };
  const mkMsg = (m: Omit<Message, "id" | "deliveryLog"> & { deliveryLog?: Message["deliveryLog"] }): Message => {
    const msg: Message = { id: id("msg"), deliveryLog: m.deliveryLog || [{ state: m.delivery, at: m.at }], ...m } as Message;
    st.messages[msg.id] = msg;
    return msg;
  };

  let rowIdx = 0;
  for (const [pid, household, locality, stage, owner, target, note, entered, people] of PROJECTS) {
    rowIdx++;
    const cid = "c-" + pid.slice(4);
    const contactIds: ID[] = [];
    people.forEach((name, i) => {
      const ctid = cid + "-" + (i + 1);
      const ct: Contact = { id: ctid, clientId: cid, name, email: slug(name) + "@example.com", phone: "+353 86 555 0" + (100 + rowIdx * 2 + i), role: i === 0 ? "Primary" : "Joint", channelPref: i === 0 ? "Email" : "Portal" };
      st.contacts[ctid] = ct; contactIds.push(ctid);
    });
    const enteredAt = dub(entered[0], entered[1], 10, 0);
    const createdAt = Math.min(enteredAt, dub(entered[0], entered[1], 10, 0)) - 86400000 * (21 + (rowIdx % 5) * 7);
    const client: Client = { id: cid, household, locality, contactIds, createdAt: createdAt - 86400000 * 14 };
    st.clients[cid] = client;

    const si = stageIndex(stage);
    const history = STAGES.slice(2, si + 1).filter((s) => !(s.key === "fi" && stage !== "fi") && !(s.key === "decision" && si <= stageIndex("decision") && stage !== "decision"))
      .map((s, i, arr) => {
        const at = i === arr.length - 1 ? enteredAt : createdAt + (enteredAt - createdAt) * (i / Math.max(1, arr.length - 1));
        return { stage: s.key, enteredAt: Math.round(at), by: owner } as Project["history"][number];
      });
    history.forEach((h, i) => { if (i < history.length - 1) h.exitedAt = history[i + 1].enteredAt; });

    const p: Project = {
      id: pid, clientId: cid, locality, stage, ownerId: owner, templateVersion: TEMPLATE_V1.version,
      stageEnteredAt: enteredAt, history, nextTarget: dub(target[0], target[1], 17, 0),
      nextTargetKind: "Internal target", nextAction: "", note, scope: { planning: true, commencement: pid === "JMA-26023" },
      createdAt, status: "Live", checks: {},
    };
    st.projects[pid] = p;
    // earlier stage gates are complete in sample history
    STAGES.slice(2, si).forEach((s) => s.required.forEach((r) => (p.checks[s.key + ":" + r] = { done: true, at: enteredAt - 86400000, by: owner })));

    // client sees the stage in the portal; sharepoint folder reference
    mkDoc({ projectId: pid, clientId: cid, name: "Signed quote and scope", type: "Quote acceptance", storage: "SharePoint · Projects/" + pid + "/00 Admin", version: "1", visibility: "Internal", published: false, uploadedBy: "s-niamh", at: createdAt + 3600000 });
    if (si >= stageIndex("brief")) {
      mkDoc({ projectId: pid, clientId: cid, name: "Survey notes and photos", type: "Survey", storage: "SharePoint · Projects/" + pid + "/01 Survey", version: "1", visibility: "Internal", published: false, uploadedBy: "s-sean", at: createdAt + 86400000 * 6 });
      if (pid !== "JMA-26003") mkDoc({ projectId: pid, clientId: cid, name: "Site map", type: "Site map", storage: "SharePoint · Projects/" + pid + "/01 Survey", version: "1", visibility: "Client", published: true, uploadedBy: "s-sean", at: createdAt + 86400000 * 5, asset: ASSETS.siteMap, mime: "image/svg+xml", size: "4 KB" });
    }

    // drawings for jobs at concept or later
    if (si >= stageIndex("concept")) {
      const dId = "dwg-" + pid.slice(4) + "-101";
      const drawing: Drawing = { id: dId, number: pid + "-A-101", projectId: pid, title: "Proposed house: ground floor plan", sheet: "A-101" };
      st.drawings[dId] = drawing;
      const asg = ASSIGN[pid];
      const briefIssued = asg ? dub(asg.issued[0], asg.issued[1], 11, 0) : enteredAt - 86400000 * 12;
      const brief: DrawingBrief = {
        id: "brf-" + pid.slice(4), projectId: pid, drawingId: dId, status: asg ? asg.status : "Released",
        house: "Four-bedroom one-off house", space: "Approx. 190 to 220 m² over one and a half storeys", priorities: "South-facing living space; utility off the back door; ground-floor bedroom",
        designNotes: "Keep ridge low to suit the rural setting. Client prefers a simple gable form.", references: ["Site map", "Survey notes and photos", "Client reference images"],
        sheets: ["A-101 Ground floor plan"], scopeLimits: "Concept layout only. No structural design, no specification.",
        assigneeId: asg ? asg.who : ["s-bea", "s-carlo", "s-mia"][rowIdx % 3], approverId: owner, officeContactId: owner,
        due: asg ? mnl(asg.due[0], asg.due[1], 17, 0) : undefined, issuedAt: briefIssued,
        ackAt: asg && asg.status === "Issued" ? undefined : briefIssued + 3 * 3600000,
        startedAt: asg && (asg.status === "Issued" || asg.status === "Acknowledged") ? undefined : briefIssued + 26 * 3600000,
        clarifications: [],
      };
      st.briefs[brief.id] = brief;
      if (asg) {
        const t = mkTask({ title: "Concept drawing A-101: " + household + ", " + locality, kind: "drawing", projectId: pid, assigneeId: asg.who, ownerId: owner, team: "Philippines", priority: "High", due: brief.due!, state: asg.status === "Issued" ? "Open" : "In progress", createdAt: briefIssued });
        t.links.briefId = brief.id; brief.taskId = t.id;
        ev(briefIssued, staffActor(owner), "brief.issued", "Issued drawing brief to " + st.staff[asg.who].name, { kind: "project", id: pid, label: pid + " " + household }, [brief.id, t.id]);
        run("rule-brief", "brief.issued:" + brief.id, briefIssued, { kind: "brief", id: brief.id }, "Success", "Assignment and team alert created for " + st.staff[asg.who].name);
        if (brief.ackAt) ev(brief.ackAt, staffActor(asg.who), "brief.acknowledged", "Acknowledged the brief", { kind: "project", id: pid, label: pid + " " + household }, [brief.id]);
        if (pid === "JMA-26002") {
          brief.clarifications.push({ id: id("clr"), from: "s-carlo", text: "Is the utility to have its own external door, or through the garage?", at: dub(10, 7, 6, 30), resolved: true });
          brief.clarifications.push({ id: id("clr"), from: "s-aoife", text: "Own external door to the side yard, please. Client confirmed.", at: dub(10, 7, 10, 15), resolved: true });
        }
      } else {
        brief.releasedAt = enteredAt - 86400000 * 3;
        brief.submittedAt = brief.releasedAt - 86400000;
      }

      if (si >= stageIndex("review")) {
        // Rev A released, maybe Rev B
        const relA = stage === "review" ? enteredAt : enteredAt - 86400000 * 20;
        const vA: DrawingVersion = { id: "ver-" + pid.slice(4) + "-A", drawingId: dId, rev: "A", asset: ASSETS.sampleA, authorId: brief.assigneeId!, uploadedAt: relA - 86400000, state: "Released", changeSummary: "First issue for client review.", addresses: [], qa: { brief: true, rooms: true, titleblock: true, scope: true }, reviewerId: owner, reviewedAt: relA - 3600000, releasedAt: relA };
        st.versions[vA.id] = vA;
        ev(relA, staffActor(owner), "drawing.released", "Released " + drawing.number + " Rev A to the client", { kind: "project", id: pid, label: pid + " " + household }, [vA.id]);
        const twoRevs = ["JMA-26014", "JMA-26016", "JMA-26004", "JMA-26019", "JMA-26022"].includes(pid);
        let latest = vA;
        if (twoRevs) {
          const reqAt = pid === "JMA-26014" ? dub(10, 2, 19, 20) : pid === "JMA-26016" ? dub(9, 29, 20, 5) : relA + 86400000 * 4;
          const relB = pid === "JMA-26014" ? dub(10, 9, 15, 0) : pid === "JMA-26016" ? dub(10, 14, 14, 30) : relA + 86400000 * 8;
          const am: Amendment = { id: "amd-" + pid.slice(4) + "-1", projectId: pid, versionId: vA.id, sheet: "A-101", page: 1, pin: { x: 0.58, y: 0.42 }, text: pid === "JMA-26016" ? "Could the utility move closer to the back door?" : "Can the kitchen island be shortened so the walkway is wider?", requesterId: contactIds[0], createdAt: reqAt, state: "Released", officeNote: "Drawn in Rev B." };
          const at = mkTask({ title: "Amendment: " + am.text, kind: "amendment", projectId: pid, assigneeId: "s-eoin", ownerId: owner, team: "Mullingar", priority: "Medium", due: addWorkingDays(reqAt, 2), state: "Done", completedAt: relB - 86400000 * 0.3, createdAt: reqAt });
          at.links = { amendmentId: am.id, versionId: vA.id }; am.taskId = at.id;
          const vB: DrawingVersion = { id: "ver-" + pid.slice(4) + "-B", drawingId: dId, rev: "B", asset: ASSETS.sampleB, authorId: "s-eoin", uploadedAt: relB - 86400000 * 0.2, state: "Released", changeSummary: "Addresses amendment " + am.id.toUpperCase() + ": " + (pid === "JMA-26016" ? "utility moved beside the back door." : "kitchen island shortened; walkway widened."), addresses: [am.id], qa: { brief: true, rooms: true, titleblock: true, scope: true }, reviewerId: owner, reviewedAt: relB - 3600000, releasedAt: relB };
          am.resolvedByVersionId = vB.id;
          vA.state = "Superseded"; vA.supersededAt = relB;
          st.amendments[am.id] = am; st.versions[vB.id] = vB; latest = vB;
          ev(reqAt, { kind: "client", id: contactIds[0], name: people[0] }, "amendment.requested", "Requested a change on Rev A", { kind: "project", id: pid, label: pid + " " + household }, [am.id, at.id]);
          ev(relB, staffActor(owner), "drawing.released", "Released " + drawing.number + " Rev B; Rev A superseded", { kind: "project", id: pid, label: pid + " " + household }, [vB.id]);
          run("rule-change", "amend:" + am.id, reqAt, { kind: "amendment", id: am.id }, "Success", "One amendment task for Eoin Walsh");
        }
        // later stages have an approval on the latest version
        if (stage !== "review") {
          const apAt = (latest.releasedAt || relA) + 86400000 * 3;
          const ap: Approval = { id: "apr-" + pid.slice(4), versionId: latest.id, projectId: pid, actorId: contactIds[0], at: apAt, decision: "Approved", purpose: "Approve concept layout for planning pack preparation", ackText: "I approve " + drawing.number + " Rev " + latest.rev + " as the basis for the next stage. I understand this approval applies to this revision only." };
          st.approvals[ap.id] = ap;
          ev(apAt, { kind: "client", id: contactIds[0], name: people[0] }, "approval.recorded", "Approved " + drawing.number + " Rev " + latest.rev, { kind: "project", id: pid, label: pid + " " + household }, [ap.id, latest.id]);
        }
        mkMsg({ projectId: pid, contactId: contactIds[0], audience: "Client", channel: "Email", direction: "out", fromId: owner, subject: "Your drawings are ready to review (" + drawing.number + " Rev " + latest.rev + ")", body: "Hi " + people[0].split(" ")[0] + ", " + drawing.number + " Rev " + latest.rev + " is ready in your portal. You can add comments on the drawing or approve it there.", at: (latest.releasedAt || relA) + 60000, delivery: pid === "JMA-26015" ? "Failed" : "Delivered", automated: true, templateId: "tpl-ready", eventKey: "release:" + latest.id,
          deliveryLog: pid === "JMA-26015" ? [{ state: "Queued", at: (latest.releasedAt || relA) + 60000 }, { state: "Failed", at: (latest.releasedAt || relA) + 75000, note: "Recipient mailbox rejected the message (simulated)." }] : [{ state: "Queued", at: (latest.releasedAt || relA) + 60000 }, { state: "Sent", at: (latest.releasedAt || relA) + 64000 }, { state: "Delivered", at: (latest.releasedAt || relA) + 71000, note: "Simulated provider receipt" }] });
        run("rule-release", "release:" + latest.id, (latest.releasedAt || relA) + 60000, { kind: "version", id: latest.id }, pid === "JMA-26015" ? "Failed" : "Success", pid === "JMA-26015" ? "Email notification failed: mailbox rejected (simulated). Retry available." : "Client notified by email (simulated)");
        if (pid === "JMA-26015") ev((latest.releasedAt || relA) + 75000, { kind: "integration", id: "int-mail", name: "Outlook (simulated)" }, "notification.failed", "Release email to Shane Connolly failed (simulated mailbox rejection)", { kind: "project", id: pid, label: pid + " Connolly" }, [], "failed", "Simulated integration");
      }
    }

    // per-stage tasks and records
    const D = (m: number, d: number) => dub(m, d, 17, 0);
    switch (stage) {
      case "review": {
        const vLatest = Object.values(st.versions).filter((v) => st.drawings[v.drawingId]?.projectId === pid && v.state === "Released").sort((a, b) => b.rev.localeCompare(a.rev))[0];
        if (pid === "JMA-26005") {
          const am: Amendment = { id: "amd-26005-1", projectId: pid, versionId: vLatest.id, sheet: "A-101", page: 1, pin: { x: 0.36, y: 0.63 }, text: "Could the hall be wider at the front door? It feels tight with the stairs there.", requesterId: contactIds[0], createdAt: dub(10, 14, 20, 10), state: "Open" };
          const t = mkTask({ title: "Amendment: widen front hall at stair (Rev A comment)", kind: "amendment", projectId: pid, assigneeId: "s-eoin", ownerId: owner, team: "Mullingar", priority: "High", due: D(10, 16), state: "Open", createdAt: am.createdAt });
          t.links = { amendmentId: am.id, versionId: vLatest.id }; am.taskId = t.id;
          st.amendments[am.id] = am;
          ev(am.createdAt, { kind: "client", id: contactIds[0], name: people[0] }, "amendment.requested", "Pinned a change request on Rev A (front hall)", { kind: "project", id: pid, label: pid + " Murphy" }, [am.id, t.id]);
          run("rule-change", "amend:" + am.id, am.createdAt + 5000, { kind: "amendment", id: am.id }, "Success", "One amendment task for Eoin Walsh, due 16 Oct 17:00 (2 working days)");
          mkMsg({ projectId: pid, audience: "Internal", channel: "Internal note", direction: "out", fromId: "s-aoife", body: "Check the stair position against the structural opening before we promise the client a wider hall.", at: dub(10, 15, 9, 20), delivery: "Delivered", automated: false });
          ev(dub(10, 16, 17, 5), agentActor("Ops Watchdog"), "task.overdue", "Flagged Murphy amendment as overdue; escalation draft prepared", { kind: "task", id: t.id, label: t.title }, [pid], "attention", "Simulated agent");
        } else {
          const t = mkTask({ title: "Client review follow-up: " + household + " (Rev " + vLatest.rev + ")", kind: "followup", projectId: pid, assigneeId: owner, ownerId: owner, team: "Mullingar", priority: "Medium", due: D(target[0], target[1]), state: "Open", createdAt: vLatest.releasedAt });
          const rq: ClientRequest = { id: "req-" + pid.slice(4) + "-rev", projectId: pid, contactId: contactIds[0], kind: "Decision", label: "Review " + st.drawings[vLatest.drawingId].number + " Rev " + vLatest.rev + " (approve or comment)", requestedAt: vLatest.releasedAt || enteredAt, ownerId: owner, nextReminderAt: pid === "JMA-26016" ? dub(10, 21, 10, 0) : Math.max(addWorkingDays(vLatest.releasedAt || enteredAt, 5), dub(10, 22, 10, 0)), state: "Outstanding", blocking: false, remindersSent: pid === "JMA-26016" ? 1 : 0, maxReminders: 3, taskId: t.id };
          st.requests[rq.id] = rq; t.links.requestId = rq.id;
          if (pid === "JMA-26016") ev(dub(10, 16, 10, 0), sysActor, "reminder.sent", "Review reminder sent to Gerard Flynn; next reminder 21 Oct", { kind: "project", id: pid, label: pid + " Flynn" }, [rq.id]);
        }
        break;
      }
      case "concept": break;
      case "brief": {
        // Walsh: missing site map blocks the brief
        const brief: DrawingBrief = { id: "brf-26003", projectId: pid, drawingId: "dwg-26003-101", status: "Draft", house: "Four-bedroom one-off house", space: "Approx. 200 m², single storey", priorities: "Accessible ground floor; large kitchen-living room", designNotes: "Client keen on a courtyard layout.", references: ["Survey notes and photos"], sheets: ["A-101 Ground floor plan"], scopeLimits: "Concept layout only.", approverId: owner, officeContactId: owner, clarifications: [] };
        st.briefs[brief.id] = brief;
        st.drawings["dwg-26003-101"] = { id: "dwg-26003-101", number: pid + "-A-101", projectId: pid, title: "Proposed house: ground floor plan", sheet: "A-101" };
        p.checks["brief:Brief confirmed with client"] = { done: true, at: dub(10, 12, 15), by: "s-niamh" };
        const t = mkTask({ title: "Chase site map: Walsh, Moate", kind: "chase", projectId: pid, assigneeId: "s-niamh", ownerId: owner, team: "Mullingar", priority: "High", due: D(10, 19), state: "Open", createdAt: dub(10, 9, 11) });
        const rq: ClientRequest = { id: "req-26003-map", projectId: pid, contactId: contactIds[0], kind: "Document", label: "Site map", docType: "Site map", requestedAt: dub(10, 9, 11), ownerId: "s-niamh", nextReminderAt: dub(10, 20, 10, 0), state: "Outstanding", blocking: true, remindersSent: 1, maxReminders: 3, taskId: t.id };
        st.requests[rq.id] = rq; t.links.requestId = rq.id;
        mkMsg({ projectId: pid, contactId: contactIds[0], audience: "Client", channel: "Email", direction: "out", fromId: "s-niamh", subject: "Your site map", body: "Hi Gráinne, to finish your brief we need a map showing the site boundary. A clear photo is fine. You can upload it in your portal.", at: dub(10, 9, 11, 5), delivery: "Delivered", automated: false });
        mkMsg({ projectId: pid, contactId: contactIds[0], audience: "Client", channel: "Email", direction: "out", fromId: "s-niamh", subject: "A reminder about your site map", body: "Hi Gráinne, we still need your site map before we can finish your brief. You can upload it in your portal.", at: dub(10, 14, 10, 0), delivery: "Delivered", automated: true, templateId: "tpl-remind", eventKey: "remind:req-26003-map:1" });
        mkMsg({ projectId: pid, contactId: contactIds[0], audience: "Client", channel: "Portal", direction: "in", fromId: contactIds[0], body: "Sorry for the delay. The solicitor has the folio map, we are trying to get a copy this week.", at: dub(10, 15, 21, 12), delivery: "Delivered", automated: false });
        run("rule-remind", "remind:req-26003-map:1", dub(10, 14, 10, 0), { kind: "request", id: rq.id }, "Success", "Reminder 1 of 3 sent to Gráinne Walsh");
        ev(dub(10, 14, 10, 0), sysActor, "reminder.sent", "Site map reminder 1 of 3 sent to Gráinne Walsh", { kind: "project", id: pid, label: pid + " Walsh" }, [rq.id]);
        ev(dub(10, 16, 9, 0), agentActor("Document Checker"), "brief.blocked", "Brief cannot be issued: required site map missing", { kind: "project", id: pid, label: pid + " Walsh" }, [brief.id], "attention", "Simulated agent");
        break;
      }
      case "fi": {
        const doc = mkDoc({ projectId: pid, clientId: cid, name: "Further information request (sample correspondence)", type: "Council correspondence", storage: "SharePoint · Projects/" + pid + "/05 Planning", version: "1", visibility: "Internal", published: false, uploadedBy: "s-aoife", at: dub(10, 13, 11, 30), asset: ASSETS.fiRequest, mime: "text/plain", size: "1 KB" });
        const cr: CouncilRecord = { id: "fi-26004", projectId: pid, kind: "Request for further information", ref: "WCC sample ref 26/0000 (illustrative)", authority: "Westmeath County Council (illustrative record)", receivedAt: dub(10, 13, 11, 0), externalDate: D(10, 23), internalTarget: D(10, 21), ownerId: "s-aoife", docId: doc.id, summary: "Council asks for a revised site layout showing the effluent treatment area and sightlines at the entrance (sample wording).", state: "Response in preparation", sample: true };
        st.council[cr.id] = cr;
        const t1 = mkTask({ title: "Prepare further-information response: revised site layout", kind: "fi", projectId: pid, assigneeId: "s-aoife", ownerId: "s-aoife", team: "Mullingar", priority: "High", due: D(10, 21), state: "In progress", createdAt: dub(10, 13, 12) });
        const t2 = mkTask({ title: "Collect entrance sightline photos for response", kind: "fi", projectId: pid, assigneeId: "s-sean", ownerId: "s-aoife", team: "Mullingar", priority: "Medium", due: D(10, 20), state: "Open", createdAt: dub(10, 13, 12) });
        t1.links.councilId = cr.id; t2.links.councilId = cr.id; t1.deps = [t2.id];
        ev(dub(10, 13, 11, 30), staffActor("s-aoife"), "council.recorded", "Recorded a further-information request (sample) with internal target 21 Oct", { kind: "project", id: pid, label: pid + " Nolan" }, [cr.id, doc.id]);
        mkMsg({ projectId: pid, contactId: contactIds[0], audience: "Client", channel: "Email", direction: "out", fromId: "s-aoife", subject: "Your planning application", body: "Hi Ruth, we are preparing a response to a request for further information. We will share the revised layout with you before it goes back.", at: dub(10, 13, 15, 0), delivery: "Delivered", automated: false });
        break;
      }
      case "pack": {
        mkTask({ title: (pid === "JMA-26019" ? "Office review of planning pack: " : "Planning pack checklist: ") + household, kind: "pack", projectId: pid, assigneeId: pid === "JMA-26019" ? "s-aoife" : owner, ownerId: owner, team: "Mullingar", priority: "Medium", due: D(target[0], target[1]), state: "In progress", createdAt: enteredAt });
        if (pid === "JMA-26018") {
          const rq: ClientRequest = { id: "req-26018-letter", projectId: pid, contactId: contactIds[0], kind: "Document", label: "Letter of consent from landowner", docType: "Consent letter", requestedAt: dub(10, 13, 10), ownerId: "s-aoife", nextReminderAt: dub(10, 20, 10), state: "Outstanding", blocking: false, remindersSent: 0, maxReminders: 3 };
          st.requests[rq.id] = rq;
        }
        break;
      }
      case "lodged": {
        mkTask({ title: "Planning status check: " + household, kind: "planning", projectId: pid, assigneeId: owner, ownerId: owner, team: "Mullingar", priority: "Low", due: D(target[0], target[1]), state: "Open", createdAt: enteredAt });
        mkDoc({ projectId: pid, clientId: cid, name: "Submission evidence (sample reference)", type: "Planning submission", storage: "SharePoint · Projects/" + pid + "/05 Planning", version: "1", visibility: "Client", published: true, uploadedBy: owner, at: enteredAt + 3600000 });
        p.checks["lodged:Submission reference recorded"] = { done: true, at: enteredAt, by: owner, note: "Sample reference, illustrative only" };
        break;
      }
      case "working": {
        p.decision = pid === "JMA-26023"
          ? { outcome: "Granted with conditions", at: enteredAt - 86400000 * 2, conditions: "Sample: landscaping plan and sightline works before occupation (illustrative).", by: owner }
          : { outcome: "Granted", at: enteredAt - 86400000 * 2, by: owner };
        const wd: Drawing = { id: "dwg-" + pid.slice(4) + "-201", number: pid + "-A-201", projectId: pid, title: "Working drawings package", sheet: "A-201" };
        st.drawings[wd.id] = wd;
        if (pid === "JMA-26023") {
          const v: DrawingVersion = { id: "ver-26023-201-P1", drawingId: wd.id, rev: "P1", asset: ASSETS.working, authorId: "s-eoin", uploadedAt: dub(10, 16, 16, 40), state: "In office review", changeSummary: "First working drawing package for office check.", addresses: [], qa: {} };
          st.versions[v.id] = v;
          mkTask({ title: "Office QA: Hughes working drawings P1", kind: "qa", projectId: pid, assigneeId: "s-aoife", ownerId: owner, team: "Mullingar", priority: "Medium", due: D(10, 22), state: "Open", createdAt: v.uploadedAt, links: { versionId: v.id } });
          ev(v.uploadedAt, staffActor("s-eoin"), "drawing.uploaded", "Uploaded A-201 P1 for office review (not client-visible)", { kind: "project", id: pid, label: pid + " Hughes" }, [v.id]);
        }
        mkTask({ title: "Construction drawing issue checklist: " + household, kind: "review", projectId: pid, assigneeId: "s-eoin", ownerId: owner, team: "Mullingar", priority: "Medium", due: D(target[0], target[1]), state: "In progress", createdAt: enteredAt });
        break;
      }
      case "survey": {
        const visit: SiteVisit = { id: "vis-26024", projectId: pid, at: dub(10, 21, 10, 30), ownerId: "s-sean", notes: "Measure boundaries, photograph entrance and neighbouring buildings. Client to meet on site.", state: "Scheduled", outputs: [] };
        st.visits[visit.id] = visit;
        mkTask({ title: "Site visit and survey: Murray, Streamstown", kind: "survey", projectId: pid, assigneeId: "s-sean", ownerId: "s-sean", team: "Mullingar", priority: "Medium", due: D(10, 21), state: "Open", createdAt: enteredAt });
        mkMsg({ projectId: pid, contactId: contactIds[0], audience: "Client", channel: "Email", direction: "out", fromId: "s-sean", subject: "Site visit on Wednesday 21 October", body: "Hi Barry, confirming the site visit on Wednesday 21 October at 10:30. If you have a site map, please bring it or upload it in your portal.", at: dub(10, 15, 12), delivery: "Delivered", automated: false });
        break;
      }
    }

    ev(createdAt, staffActor("s-niamh"), "project.created", "Created " + pid + " from an accepted quote", { kind: "project", id: pid, label: pid + " " + household }, [cid]);
    ev(enteredAt, staffActor(owner), "stage.entered", "Moved to " + STAGES[si].name, { kind: "project", id: pid, label: pid + " " + household }, []);
  }

  // Overdue drawings flagged by the watchdog
  ev(dub(10, 15, 17, 5), agentActor("Ops Watchdog"), "task.overdue", "Flagged O'Brien concept drawing (Mia Cruz) as overdue", { kind: "project", id: "JMA-26006", label: "JMA-26006 O'Brien" }, [], "attention", "Simulated agent");
  ev(dub(10, 16, 17, 5), agentActor("Ops Watchdog"), "task.overdue", "Flagged Kelly concept drawing (Carlo Reyes) as overdue", { kind: "project", id: "JMA-26002", label: "JMA-26002 Kelly" }, [], "attention", "Simulated agent");
  run("rule-overdue", "overdue:JMA-26006", dub(10, 15, 17, 5), { kind: "project", id: "JMA-26006" }, "Success", "Manager attention event and escalation draft created");
  run("rule-overdue", "overdue:JMA-26002", dub(10, 16, 17, 5), { kind: "project", id: "JMA-26002" }, "Success", "Manager attention event and escalation draft created");
  ev(dub(10, 19, 8, 0), agentActor("Briefing"), "briefing.ready", "Prepared the morning briefing for Ciaran", { kind: "agent", id: "ag-briefing", label: "Briefing" }, [], "info", "Simulated agent");
  ev(dub(10, 18, 23, 0), { kind: "integration", id: "int-sp", name: "SharePoint (simulated)" }, "files.indexed", "Indexed folder references for 24 project libraries (simulated link, no sync)", { kind: "system", id: "sharepoint", label: "SharePoint" }, [], "info", "Simulated integration");

  /* ── leads and quotes ── */
  for (const [lid, name, locality, source, status, amount, rec, notes] of LEADS) {
    const receivedAt = dub(rec[0], rec[1], rec[2], rec[3]);
    const auto = source === "Website" || source === "Email";
    const lead: Lead = { id: lid, name, locality, source, status, receivedAt, ownerId: "s-niamh", email: slug(name.split(" and ")[0]) + "@example.com", phone: "+353 87 555 0" + (300 + +lid.slice(-1)), requestedService: "One-off house design", notes,
      ackAt: auto ? receivedAt + 41000 : undefined, firstHumanResponseAt: receivedAt + 3600000 * (2 + +lid.slice(-1)), lastContactAt: receivedAt + 86400000 * 2, nextContactAt: dub(10, 21 + (+lid.slice(-1) % 3), 11, 0), followUpReason: status === "Quote sent" ? "Check the quote landed and answer questions" : status === "Qualified" ? "Prepare quote" : "Qualify requirements and site" };
    st.leads[lid] = lead;
    if (auto) {
      const m = mkMsg({ leadId: lid, audience: "Client", channel: "Email", direction: "out", fromId: "s-niamh", subject: "Thanks for your enquiry, " + name.split(" ")[0], body: "Hi " + name.split(" ")[0] + ", thanks for getting in touch about your proposed home in " + locality + ". Niamh will follow up to understand your site and what you need.", at: lead.ackAt!, delivery: "Delivered", automated: true, templateId: "tpl-ack", eventKey: "ack:" + lid });
      lead.ackMessageId = m.id;
      run("rule-ack", "enquiry:" + lid, lead.ackAt!, { kind: "lead", id: lid }, "Success", "Acknowledged in " + Math.round((lead.ackAt! - receivedAt) / 1000) + "s; follow-up task for Niamh Doyle");
    }
    mkTask({ title: "Follow up: " + name + " (" + (lead.followUpReason || "") + ")", kind: "followup", leadId: lid, assigneeId: "s-niamh", ownerId: "s-niamh", team: "Mullingar", priority: status === "Quote sent" ? "Medium" : "Low", due: lead.nextContactAt!, state: "Open", createdAt: receivedAt });
    ev(receivedAt, { kind: source === "Website" ? "integration" : "staff", id: source === "Website" ? "int-web" : "s-niamh", name: source === "Website" ? "Website form (simulated)" : "Niamh Doyle" }, "lead.created", source + " enquiry from " + name, { kind: "lead", id: lid, label: lid + " " + name }, []);
    if (amount) {
      const q: Quote = { id: "Q-" + lid.slice(-3), leadId: lid, scope: "Concept design and planning drawings for a one-off house in " + locality + ". Illustrative scope; demo fee.", amount, status: "Sent", createdAt: receivedAt + 86400000 * 4, sentAt: receivedAt + 86400000 * 5, expiresAt: receivedAt + 86400000 * 35, deposit: { amount: 1500, status: "Not requested" } };
      st.quotes[q.id] = q;
      ev(q.sentAt!, staffActor("s-niamh"), "quote.sent", "Sent quote " + q.id + " (demo fee)", { kind: "lead", id: lid, label: lid + " " + name }, [q.id]);
    }
  }
  // duplicate submission handled
  run("rule-ack", "enquiry:LEAD-004", dub(10, 6, 8, 3), { kind: "lead", id: "LEAD-004" }, "Skipped: duplicate", "Second web-form submission from the same email merged into LEAD-004; no second acknowledgement or task");
  ev(dub(10, 6, 8, 3), sysActor, "lead.deduplicated", "Merged a repeat web-form submission into LEAD-004 (same email)", { kind: "lead", id: "LEAD-004", label: "LEAD-004 Fiona Gannon" }, [], "info");

  st.events.sort((a, b) => a.at - b.at);

  /* ── programme ── */
  for (const p of Object.values(st.projects)) buildProgramme(st, p.id, () => id("pg"));
  st.seq = n + 10;
  return st;
}

/** Programme items from the current stage onward. Fixed dates are added for
    Kelly (agreed client meeting) and Nolan (recorded council date, sample). */
export function buildProgramme(st: DemoState, pid: ID, mkId: () => ID) {
  const p = st.projects[pid];
  for (const it of Object.values(st.programme)) if (it.projectId === pid) delete st.programme[it.id];
  const si = stageIndex(p.stage);
  const tasks = Object.values(st.tasks).filter((t) => t.projectId === pid && t.state !== "Done" && t.state !== "Cancelled");
  const keyTask = tasks.find((t) => t.kind === "drawing") || tasks.find((t) => t.kind === "amendment") || tasks.find((t) => t.kind === "fi" && !t.deps.length && tasks.some((o) => o.deps.includes(t.id)) === false) || tasks.find((t) => t.kind === "fi") || tasks[0];
  let prev: ProgrammeItem | null = null;
  const add = (label: string, stage: ProgrammeItem["stage"], durationWD: number, extra: Partial<ProgrammeItem> = {}) => {
    const baseStart = prev ? 0 : p.stageEnteredAt;
    const it: ProgrammeItem = { id: mkId(), projectId: pid, label, stage, kind: "internal", fixed: false, baseStart, durationWD, slipWD: 0, deps: prev ? [prev.id] : [], dateKind: "Forecast", ...extra };
    st.programme[it.id] = it; prev = it; return it;
  };
  const order = STAGES.filter((s, i) => i >= si && !s.pre && (s.key !== "fi" || p.stage === "fi") && (s.key !== "commencement" || p.scope.commencement) && s.key !== "complete");
  order.forEach((s, i) => {
    if (i === 0) {
      const dur = Math.max(1, Math.round((p.nextTarget - p.stageEnteredAt) / 86400000 * 5 / 7));
      const it = add(s.name + (keyTask ? ": " + st.staff[keyTask.assigneeId].name.split(" ")[0] : ""), s.key, dur, { taskId: keyTask?.id, dateKind: "Internal target" });
      it.baseStart = p.stageEnteredAt;
      if (s.key === "concept") add("Office QA and release", "concept", 1);
      if (pid === "JMA-26002") add("Client review meeting (agreed appointment)", "review", 0, { fixed: true, fixedStart: dub(10, 22, 9, 30), fixedEnd: dub(10, 22, 10, 30), kind: "client", dateKind: "Client commitment" });
      if (s.key === "fi") {
        add("Client sign-off of response", "fi", 1, { kind: "client" });
        add("Recorded council date (sample, not calculated)", "fi", 0, { fixed: true, fixedStart: dub(10, 23, 17, 0), fixedEnd: dub(10, 23, 17, 0), kind: "external", dateKind: "Recorded external date" });
      }
      return;
    }
    if (s.key === "lodged") { add("Council assessment (external, estimate only)", s.key, s.days, { kind: "external" }); return; }
    if (s.key === "decision") { add("Planning decision recorded (external)", s.key, 0, { kind: "external" }); return; }
    if (s.key === "review") { add("Client review and revisions", s.key, s.days, { kind: "client" }); return; }
    add(s.name, s.key, s.days);
  });
}

export const freshId = (st: DemoState, prefix: string) => prefix + "-" + (++st.seq).toString(36);
