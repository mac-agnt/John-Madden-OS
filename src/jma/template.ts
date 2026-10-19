import type { StageDef, StageKey, StageTemplate } from "./types";
import { dub } from "./time";

/* The proposed 14-stage residential template. Stages 1–2 are pre-project sales
   stages; a job is created at stage 3. Every value here is a discovery
   assumption for Ciaran to confirm, not a researched fact. */
export const STAGES: StageDef[] = [
  { n: 1, key: "enquiry", name: "Enquiry", role: "Client coordinator", exit: "Contact and enquiry captured", clientText: "We have your enquiry", days: 2, pre: true, required: ["Contact details captured", "Enquiry recorded"] },
  { n: 2, key: "quote", name: "Qualified / quote sent", role: "Client coordinator", exit: "Requirements captured; quote issued", clientText: "Your proposal is ready", days: 10, pre: true, required: ["Requirements captured", "Quote issued"] },
  { n: 3, key: "accepted", name: "Quote accepted / deposit paid", role: "Client coordinator", exit: "Quote accepted; deposit requirement satisfied or waived with reason", clientText: "Your project is starting", days: 3, required: ["Quote accepted", "Deposit received or waived"] },
  { n: 4, key: "survey", name: "Site visit / survey", role: "Survey coordinator", exit: "Agreed visit record and required inputs", clientText: "We are gathering site information", days: 7, required: ["Site visit record", "Site photos", "Site map"] },
  { n: 5, key: "brief", name: "Client brief finalised", role: "Project owner", exit: "Brief confirmed; site map present", clientText: "Your brief is being finalised", days: 5, required: ["Brief confirmed with client", "Site map present"] },
  { n: 6, key: "concept", name: "Concept drawings", role: "Office project owner + named drawing assignee", exit: "Returned drawing passes office QA and is released", clientText: "We are preparing your drawings", days: 10, required: ["Drawing returned", "Office QA passed", "Released to client"] },
  { n: 7, key: "review", name: "Client review and revisions", role: "Office project owner", exit: "Latest issued revision approved; required amendments resolved", clientText: "Your drawings are ready to review", days: 10, required: ["Latest issued revision approved", "Required amendments resolved"] },
  { n: 8, key: "pack", name: "Planning pack prepared", role: "Project owner", exit: "Pack checklist and office sign-off complete", clientText: "We are preparing your planning pack", days: 10, scoped: true, required: ["Pack checklist complete", "Office sign-off"] },
  { n: 9, key: "lodged", name: "Planning lodged", role: "Project owner", exit: "Submission evidence/reference recorded", clientText: "Your application has been submitted", days: 40, scoped: true, required: ["Submission reference recorded"] },
  { n: 10, key: "fi", name: "Further information", role: "Project owner", exit: "Request and response evidence recorded", clientText: "We are responding to a request", days: 20, conditional: true, scoped: true, required: ["Request recorded", "Response evidence recorded"] },
  { n: 11, key: "decision", name: "Planning decision / grant", role: "Project owner", exit: "Actual decision and conditions recorded", clientText: "A planning decision has been received", days: 5, scoped: true, required: ["Decision and conditions recorded"] },
  { n: 12, key: "working", name: "Working / construction drawings", role: "Office technical lead", exit: "Required drawing package reviewed and issued", clientText: "We are preparing detailed drawings", days: 20, required: ["Drawing package reviewed", "Package issued"] },
  { n: 13, key: "commencement", name: "Building control / commencement documentation", role: "Assigned qualified staff, if in scope", exit: "Agreed document checklist and sign-offs", clientText: "We are preparing the agreed commencement documents", days: 15, scoped: true, required: ["Agreed document checklist", "Sign-offs recorded"] },
  { n: 14, key: "complete", name: "Complete / handover", role: "Project owner", exit: "Handover package issued and outstanding items resolved", clientText: "Your agreed work is complete", days: 5, required: ["Handover package issued", "Outstanding items resolved"] },
];

export const TEMPLATE_V1: StageTemplate = {
  version: "Residential v1.0",
  publishedAt: dub(9, 1, 9, 0),
  stages: STAGES,
  note: "Proposed for discovery. Durations are internal assumptions in working days.",
};

export const stageDef = (key: StageKey, tpl: StageTemplate = TEMPLATE_V1): StageDef =>
  tpl.stages.find((s) => s.key === key) || STAGES.find((s) => s.key === key)!;

export const stageIndex = (key: StageKey) => STAGES.findIndex((s) => s.key === key);

/** Six plain-language client milestones instead of internal tasks. */
export const CLIENT_MILESTONES: { label: string; stages: StageKey[] }[] = [
  { label: "Starting", stages: ["enquiry", "quote", "accepted"] },
  { label: "Site and brief", stages: ["survey", "brief"] },
  { label: "Drawings", stages: ["concept"] },
  { label: "Your review", stages: ["review"] },
  { label: "Planning, if included", stages: ["pack", "lodged", "fi", "decision"] },
  { label: "Detailed drawings and handover", stages: ["working", "commencement", "complete"] },
];
