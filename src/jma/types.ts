/* John Madden OS: the normalised demo model. Every screen reads these records
   through selectors; nothing on a page keeps its own copy of a number. */

export type ID = string;

export type Team = "Mullingar" | "Philippines";
export interface Staff {
  id: ID; name: string; initials: string; role: string; team: Team; tz: string;
  email: string; emailNote: string; real: boolean; colour: string;
}

export interface Client { id: ID; household: string; locality: string; contactIds: ID[]; createdAt: number; note?: string }
export interface Contact {
  id: ID; clientId: ID; name: string; email: string; phone: string;
  role: "Primary" | "Joint"; channelPref: "Email" | "Portal" | "WhatsApp" | "SMS";
}

export type LeadSource = "Website" | "Phone" | "Email" | "Referral" | "Walk-in";
export type LeadStatus = "New" | "Contacted" | "Qualified" | "Quote sent" | "Accepted" | "Lost";
export interface Lead {
  id: ID; name: string; locality: string; source: LeadSource; status: LeadStatus;
  receivedAt: number; ownerId: ID; email: string; phone: string; requestedService: string;
  notes: string; clientId?: ID; projectId?: ID; ackAt?: number; ackMessageId?: ID;
  firstHumanResponseAt?: number; nextContactAt?: number; lastContactAt?: number;
  followUpReason?: string; duplicateOfClientId?: ID; lostReason?: string;
}

export type QuoteStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Expired";
export type DepositStatus = "Not requested" | "Requested" | "Received (simulation)" | "Waived";
export interface Quote {
  id: ID; leadId: ID; scope: string; amount: number; status: QuoteStatus;
  createdAt: number; sentAt?: number; expiresAt: number; acceptedAt?: number;
  deposit: { amount: number; status: DepositStatus; at?: number; waivedReason?: string };
}

export type StageKey =
  | "enquiry" | "quote" | "accepted" | "survey" | "brief" | "concept" | "review" | "pack"
  | "lodged" | "fi" | "decision" | "working" | "commencement" | "complete";

export interface StageDef {
  n: number; key: StageKey; name: string; role: string; exit: string; clientText: string;
  days: number; pre?: boolean; conditional?: boolean; scoped?: boolean; required: string[];
}
export interface StageTemplate { version: string; publishedAt: number; stages: StageDef[]; note: string }

export type DateKind = "Internal target" | "Forecast" | "Client commitment" | "Recorded external date";
export type PlanningOutcome = "Granted" | "Granted with conditions" | "Refused" | "Withdrawn" | "Other";

export interface StageHistory { stage: StageKey; enteredAt: number; exitedAt?: number; by: ID; override?: string }

export interface Project {
  id: ID; clientId: ID; locality: string; stage: StageKey; ownerId: ID;
  templateVersion: string; stageEnteredAt: number; history: StageHistory[];
  nextTarget: number; nextTargetKind: DateKind; nextAction: string; note: string;
  scope: { planning: boolean; commencement: boolean };
  leadId?: ID; quoteId?: ID; createdAt: number; status: "Live" | "Complete";
  checks: Record<string, { done: boolean; at?: number; by?: ID; note?: string }>;
  decision?: { outcome: PlanningOutcome; at: number; conditions?: string; by: ID };
}

export type TaskState = "Open" | "In progress" | "Paused" | "Done" | "Cancelled";
export type TaskKind = "drawing" | "amendment" | "chase" | "followup" | "review" | "pack" | "admin" | "fi" | "survey" | "planning" | "qa";
export interface DueChange { from: number; to: number; reason: string; at: number; by: ID }
export interface Task {
  id: ID; title: string; kind: TaskKind; projectId?: ID; leadId?: ID;
  assigneeId: ID; ownerId: ID; team: Team; priority: "High" | "Medium" | "Low";
  due: number; originalDue: number; dueHistory: DueChange[];
  state: TaskState; pauseReason?: string; deps: ID[];
  links: { briefId?: ID; amendmentId?: ID; versionId?: ID; requestId?: ID; councilId?: ID; programmeId?: ID };
  createdAt: number; completedAt?: number; reassigned?: { from: ID; to: ID; reason: string; at: number }[];
}

export type BriefStatus =
  | "Draft" | "Issued" | "Acknowledged" | "In progress" | "Awaiting clarification"
  | "Submitted" | "In office review" | "Returned for correction" | "Released";
export interface DrawingBrief {
  id: ID; projectId: ID; drawingId: ID; status: BriefStatus;
  house: string; space: string; priorities: string; designNotes: string;
  references: string[]; sheets: string[]; scopeLimits: string;
  assigneeId?: ID; approverId: ID; due?: number; officeContactId: ID;
  issuedAt?: number; ackAt?: number; startedAt?: number; submittedAt?: number; releasedAt?: number;
  taskId?: ID; clarifications: { id: ID; from: ID; text: string; at: number; resolved: boolean }[];
}

export interface Drawing { id: ID; number: string; projectId: ID; title: string; sheet: string }
export type VersionState = "In office review" | "Returned for correction" | "Released" | "Superseded";
export interface DrawingVersion {
  id: ID; drawingId: ID; rev: string; asset: string; authorId: ID; uploadedAt: number;
  state: VersionState; changeSummary: string; addresses: ID[];
  qa: Record<string, boolean>; reviewerId?: ID; reviewedAt?: number; releasedAt?: number; supersededAt?: number;
}

export interface Pin { x: number; y: number }
export interface Amendment {
  id: ID; projectId: ID; versionId: ID; sheet: string; page: number; pin: Pin; text: string;
  requesterId: ID; createdAt: number; taskId?: ID; state: "Open" | "Addressed" | "Released";
  resolvedByVersionId?: ID; officeNote?: string;
}

export interface Approval {
  id: ID; versionId: ID; projectId: ID; actorId: ID; at: number;
  decision: "Approved"; purpose: string; ackText: string;
}

export type Visibility = "Internal" | "Client" | "Supplier";
export interface DocumentRec {
  id: ID; projectId?: ID; clientId?: ID; leadId?: ID; name: string; type: string; storage: string;
  version: string; visibility: Visibility; published: boolean; uploadedBy: ID; at: number;
  asset?: string; mime?: string; size?: string;
}

export type Delivery = "Queued" | "Sent" | "Delivered" | "Failed" | "Retrying";
export type Channel = "Email" | "Portal" | "WhatsApp" | "SMS" | "Internal note" | "Phone";
export interface Message {
  id: ID; projectId?: ID; leadId?: ID; contactId?: ID; audience: "Client" | "Internal" | "Supplier";
  channel: Channel; direction: "in" | "out"; fromId: ID; body: string; subject?: string; at: number;
  delivery: Delivery; deliveryLog: { state: Delivery; at: number; note?: string }[];
  automated: boolean; templateId?: ID; eventKey?: string;
}

export interface ClientRequest {
  id: ID; projectId: ID; contactId: ID; kind: "Document" | "Decision"; label: string;
  docType?: string; requestedAt: number; ownerId: ID; nextReminderAt?: number;
  state: "Outstanding" | "Received" | "Cancelled" | "Paused"; blocking: boolean;
  remindersSent: number; maxReminders: number; taskId?: ID; docId?: ID; resolvedAt?: number;
}

export interface CouncilRecord {
  id: ID; projectId: ID; kind: string; ref: string; authority: string; receivedAt: number;
  externalDate: number; internalTarget: number; ownerId: ID; docId: ID; summary: string;
  state: "Response in preparation" | "Response sent" | "Closed"; sample: true;
}

export interface ProgrammeItem {
  id: ID; projectId: ID; label: string; stage?: StageKey; kind: "internal" | "client" | "external";
  fixed: boolean; baseStart: number; durationWD: number; slipWD: number; deps: ID[];
  fixedStart?: number; fixedEnd?: number; taskId?: ID; actualEnd?: number; dateKind: DateKind;
}

export interface SiteVisit { id: ID; projectId: ID; at: number; ownerId: ID; notes: string; state: "Scheduled" | "Completed"; outputs: ID[] }

export interface AutomationRule {
  id: ID; name: string; trigger: string; guard: string; action: string; stop: string; enabled: boolean;
}
export interface AutomationRun {
  id: ID; ruleId: ID; eventKey: string; at: number; subject: { kind: string; id: ID };
  result: "Success" | "Failed" | "Retried" | "Skipped: duplicate" | "Stopped"; detail: string;
}

export interface Article {
  id: ID; kind: "faq" | "procedure"; title: string; body: string; audience: "Client" | "Internal";
  stages: StageKey[]; published: boolean; updatedAt: number; updatedBy: ID;
  video?: { url: string; captions: string; transcript: string; label: string };
}

export interface Template {
  id: ID; name: string; event: string; channel: Channel; audience: "Client" | "Internal" | "Supplier";
  subject: string; body: string;
}

export type ActorKind = "staff" | "client" | "agent" | "system" | "integration";
export interface ActivityEvent {
  id: ID; at: number; actor: { kind: ActorKind; id: ID; name: string };
  type: string; summary: string; subject: { kind: string; id: ID; label: string };
  related: ID[]; status: "ok" | "failed" | "retry" | "attention" | "info";
  before?: string; after?: string; source: string;
}

export type PersonaKind = "admin" | "mullingar" | "philippines" | "client" | "sales";
export interface Persona { kind: PersonaKind; staffId?: ID; clientId?: ID; contactId?: ID }

export interface DemoState {
  version: number;
  now: number;
  seq: number;
  persona: Persona;
  story: { step: number; started: boolean };
  staff: Record<ID, Staff>;
  clients: Record<ID, Client>;
  contacts: Record<ID, Contact>;
  leads: Record<ID, Lead>;
  quotes: Record<ID, Quote>;
  projects: Record<ID, Project>;
  tasks: Record<ID, Task>;
  briefs: Record<ID, DrawingBrief>;
  drawings: Record<ID, Drawing>;
  versions: Record<ID, DrawingVersion>;
  amendments: Record<ID, Amendment>;
  approvals: Record<ID, Approval>;
  documents: Record<ID, DocumentRec>;
  messages: Record<ID, Message>;
  requests: Record<ID, ClientRequest>;
  council: Record<ID, CouncilRecord>;
  programme: Record<ID, ProgrammeItem>;
  visits: Record<ID, SiteVisit>;
  rules: Record<ID, AutomationRule>;
  runs: Record<ID, AutomationRun>;
  articles: Record<ID, Article>;
  templates: Record<ID, Template>;
  events: ActivityEvent[];
  template: StageTemplate;
  templateHistory: StageTemplate[];
  settings: {
    amendmentSlaWD: number; reminderDays: number; maxReminders: number; ackDelaySec: number;
    workingDays: string; pauseReasons: string[]; gatesEnforced: boolean;
  };
  /** Idempotency: event keys already handled. */
  keys: Record<string, ID>;
  /** Last action notice for the toast. */
  notice?: { id: number; text: string; tone: "ok" | "warn" | "bad" | "info" };
}
