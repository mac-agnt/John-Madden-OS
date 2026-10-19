# John Madden OS: draft PRD, demo scope and assumptions

Client: John Madden & Associates (JMA), Blackhall Street, Mullingar, Ireland. johnmadden.ie
Prepared for: Consulting.ie
Status: demo specification and draft PRD, 19 October 2026. Operational assumptions need Ciaran Madden's confirmation before any pricing.

This document travels with the clickable demo in this repository. The demo is a frontend-only build on the existing Pulse template. Every household, job, lead, message, fee and date in it is fictional. Ciaran Madden and cmadden@johnmadden.ie are the only real details (supplied contact; his demo role as administrator is assumed).

## 1. What the demo shows

The central loop, end to end and connected:

Enquiry → quote accepted → project → structured drawing brief → Philippines assignment → office quality review → client review → amendment task → revised drawing → exact-version approval.

Every action writes to one local store (`src/jma/store.ts`). Dashboards, queues, Home answers, the agents, Activity, Records and the client portal all read that same store through selectors (`src/jma/selectors.ts`), so a change made on one screen moves every number that depends on it.

### Presentation route (about 12 minutes)

1. **Home.** "Good morning Ciaran", 24 live projects, 5 needing attention. Ask "What needs my attention?" and "Which drawings are late?". Answers are deterministic and simulated, computed from the records, and link to them.
2. **Dashboard → Executive.** Four KPIs (24 live, 5 attention, 5 awaiting client review, 3 overdue). Click "Needs attention" to land on the filtered project register. Open Kelly (JMA-26002): accountable owner Aoife, work held by Carlo in Manila, overdue since 16 Oct.
3. **Projects → Programme.** Kelly's Gantt. Slip the concept drawing two working days, preview the impact, apply: the office QA forecast now collides with the agreed client meeting on 22 Oct and a conflict is flagged. The fixed date does not move.
4. **Run client story** (demo strip, top right). Step through A to G: the Dunne website enquiry is acknowledged 38 seconds after receipt, Niamh's human call is logged separately, a €9,500 demo quote is accepted and a €1,500 demo deposit is marked received (simulation). Conversion creates JMA-26025 (25 live projects; open leads go 8 → 9 → 8). The survey and brief shortcut is labelled as such. The brief is issued to Carlo; the Philippines preview shows only his assignment. Rev A returns into office review, is checked and released, and only then does the Dunne portal see it. The client pins a change on Rev A, which creates exactly one task for Eoin with a two-working-day provisional SLA. Eoin loads Rev B with a change summary; office QA releases it; Rev A stays in history as superseded. The client approves Rev B, recorded against that exact version. Staff advance the job to Planning pack. Nothing is lodged.
5. **Walsh (JMA-26003).** Clients → Waiting on clients: the missing site map blocks the brief. "Simulate client upload" clears only that item and stops the reminders.
6. **Records → Ontology.** Trace a project from client to approval. Each link opens the real record.

The guided story compresses elapsed time into 19 and 20 October (the clock moves forward at each step, in order). It ends at 20 October 16:50 with 25 live projects; Walsh's site-map chase (due 19 Oct 17:00) has become overdue in the meantime, which is the honest consequence of the clock moving.

Reset (demo strip → Run client story → Reset demo, or Settings → Experience) restores the 19 October 09:00 baseline. It only touches this browser's local demo state.

### Baseline figures (all computed from fixtures)

| Figure | Value |
| --- | --- |
| Live projects / linked households | 24 / 24 |
| Stage spread | 8 concept, 6 client review, 3 planning pack, 2 lodged, 1 further information, 2 working drawings, 1 brief, 1 survey |
| Philippines assignments | 8 active, 2 overdue (Kelly: Carlo; O'Brien: Mia) |
| Overdue internal tasks | 3 (the two assignments and Murphy's amendment, Eoin) |
| Needs attention | 5 projects: Kelly, O'Brien (overdue), Murphy (overdue amendment), Walsh (blocked), Nolan (deadline risk) |
| Open leads | 8, with 4 quotes sent totalling €36,000 quoted pipeline (illustrative demo fees, not revenue) |
| Staff | 5 Mullingar, 3 Philippines |

Demo clock: Monday 19 October 2026, 09:00 Europe/Dublin. Times are stored as instants and formatted per zone with Intl, so the Dublin change to GMT on 25 October is handled without hard-coded offsets. Working days are Monday to Friday; holidays are not modelled.

## 2. Problems the demo addresses

| Problem | Where the demo shows the change |
| --- | --- |
| Enquiries lose momentum | Sales → Enquiries: Dunne enquiry acknowledged at +38 s; named human follow-up owner, tracked separately |
| Nobody can see who holds a job | Dashboard and Projects: accountable owner vs current holder, stage age, blockers, overdue |
| Offshore handoffs are opaque | Drawings → Philippines queue: brief, acknowledgement, assignee, Manila target, return and review state |
| Revision requests are detached from drawings | Drawing review: version-bound pins, one amendment task, Rev B, exact-version approval |
| Clients ring for updates | Client portal: plain milestones, what we need from you, messages, stage guidance |
| Missing inputs block production | Walsh: missing site map blocks the brief; one tracked chase and reminders that stop on upload |
| Timelines hide dependencies | Programme: a two working-day slip moves forecasts and flags a conflict with a fixed date |
| Administrative deadlines lack ownership | Nolan: recorded further-information request, owner, internal target vs recorded council date (sample) |
| Files and history are fragmented | Records and ontology: client → project → drawing → revision → amendment → task → approval |

No savings, revenue or response-time improvements are claimed. These are hypotheses to test with Ciaran.

## 3. Product goal and users

Goal: one operational view of each residential job, its next action, current drawing version, accountable owner and client communication, with an observable Mullingar to Philippines handoff and clients kept informed.

Users: Ciaran (administrator, oversight and configuration); Mullingar staff (client coordination, delivery, review, amendments); Philippines team (assigned briefs, drawing tasks, permitted files, submission history); clients (own projects, issued files, questions, uploads, review decisions); sales (leads, quotes, follow-ups, as a permission set rather than a presumed department).

## 4. Phase 1 production scope (subject to discovery)

| Area | Must deliver | Acceptance intent |
| --- | --- | --- |
| Dashboard | Live jobs, stage age, next owner and action, blockers, offshore queue, staff workload | Every number opens the underlying authorised records; a manager can see the next action on each exception |
| Projects | Versioned stage templates, checklists, dependencies, Gantt, targets, audit history | Missing required items stop progression; forecast movement is visible and never overwrites fixed external dates |
| Drawing pipeline | Structured briefs, acknowledgements, immutable versions, office QA, release, version-bound comments, amendment tasks, approval records | The Rev A → change → Rev B → approval loop reproduces without losing history |
| Client portal | Own-job status, milestones, uploads and downloads, messages, review, outstanding requests | Client can identify the next action and sees only permitted content |
| CRM and speed to lead | Multi-channel capture, deduplication, owner, acknowledgement, simple quotes, follow-ups, conversion | One lead produces one linked project; acknowledgement delivery and failure are observable; human follow-up is tracked separately |
| Knowledge | Editable stage-linked FAQs, video URL or embed, transcripts, internal procedures | Staff edit, preview and publish without a developer; only published client content reaches the portal |
| Automations | Stage and event triggers, reminders, alerts, editable templates, retries, history | Repeated events never duplicate messages or tasks; completed requests stop reminders |
| Microsoft 365 | Staff sign-in; scoped Outlook mail and calendar; baseline SharePoint access and linking | Tenant permissions, mailbox scope, matching rules, supported actions and file authority confirmed first |
| Permissions and audit | Project and role scoped access, versioned decisions, attributable events | Server-side checks; client and supplier isolation verified across queries, downloads and actions |

SharePoint boundary: proposed default keeps SharePoint as the authoritative file store, shows project library references in the platform, and defines an explicit publication path for client-visible copies. An internal SharePoint link is not assumed safe for external clients. Basic linking is distinct from migration, new folder taxonomy, historical cleansing and bidirectional sync.

## 5. Phase 2

- ArcTech Pro integration, only if a usable supported API or export and a commercial arrangement are verified; or a separately scoped mobile site-visit capability (capture, photos, notes, measurements, reports). Not both by default.
- Deeper SharePoint migration or robust two-way sync once source of truth and conflict and deletion rules are agreed.
- Reporting beyond operational visibility: historical cycle times, forecasting, time and cost profitability, utilisation, once reliable inputs exist.

## 6. Explicit exclusions until agreed

Accounting ledger, tax, invoicing automation, payment processing, bank reconciliation. CAD authoring, BIM validation, automated professional certification, legal or regulatory advice. Automatic council or BCMS submissions, guaranteed planning approval, inferred statutory deadlines, automated planning compliance decisions. Real e-signature or claims of legal enforceability. Native mobile apps and offline sync; a full ArcTech Pro replacement. Historic full-mailbox import and broad SharePoint migration. Autonomous commercial commitments, discounts or professional design decisions by agents.

## 7. Stages (proposed, configurable)

| # | Stage | Default accountable role | Example exit requirement | Client wording |
| --- | --- | --- | --- | --- |
| 1 | Enquiry | Client coordinator | Contact and enquiry captured | We have your enquiry |
| 2 | Qualified / quote sent | Client coordinator | Requirements captured; quote issued | Your proposal is ready |
| 3 | Quote accepted / deposit paid | Client coordinator | Accepted; deposit satisfied or waived with reason | Your project is starting |
| 4 | Site visit / survey | Survey coordinator | Visit record and required inputs | We are gathering site information |
| 5 | Client brief finalised | Project owner | Brief confirmed; site map present | Your brief is being finalised |
| 6 | Concept drawings | Office owner + named drawing assignee | Returned drawing passes office QA and is released | We are preparing your drawings |
| 7 | Client review and revisions | Office owner | Latest issued revision approved; amendments resolved | Your drawings are ready to review |
| 8 | Planning pack prepared | Project owner | Pack checklist and office sign-off | We are preparing your planning pack |
| 9 | Planning lodged | Project owner | Submission evidence recorded | Your application has been submitted |
| 10 | Further information (conditional loop) | Project owner | Request and response evidence recorded | We are responding to a request |
| 11 | Planning decision / grant | Project owner | Actual decision and conditions recorded | A planning decision has been received |
| 12 | Working / construction drawings | Office technical lead | Package reviewed and issued | We are preparing detailed drawings |
| 13 | Building control / commencement (if in scope) | Assigned qualified staff | Agreed checklist and sign-offs | We are preparing the agreed commencement documents |
| 14 | Complete / handover | Project owner | Handover package issued | Your agreed work is complete |

Rules implemented in the demo: gates block progression unless a controlled override with a reason is recorded; external contributors cannot bypass office QA; the template version is snapshotted per project and publishing a new version does not rewrite existing jobs; tasks keep baseline target, current forecast and actual completion separately; only editable forecasts propagate through dependencies and a slip against a fixed appointment or recorded external date becomes a conflict for review; refused or other planning outcomes do not auto-advance; council dates are recorded, never calculated. Clients see six plain milestones, not internal tasks.

## 8. Success measures (baseline first, then targets)

Automated acknowledgement latency (receipt to provider acceptance; delivery measured separately; proposed target within 60 seconds for eligible automated channels). Human first-response time, reported separately. Handoff acceptance and drawing return time, by task type and active versus paused time. Amendment turnaround and number of client review rounds. Jobs missing an owner, target or required document. Age of outstanding client inputs and number of status-chasing queries. Stage age, overdue work and late-dependency impact. No SLA uptime, ROI or delivery date is implied.

## 9. Assumptions to validate before pricing

| Item | Demo assumption | Confirm with Ciaran | Pricing consequence |
| --- | --- | --- | --- |
| Authority | Ciaran acts as administrator | Formal role, budget owner, final approver | Stakeholders, approvals, rollout |
| Volume | 24 live projects; 8 open leads | Annual and live jobs, enquiry volume, peaks | Data scale, support, messaging |
| Team | 5 Mullingar, 3 Philippines | Actual users, supplier model, structure | Licences, roles, onboarding, access |
| Workflow | Proposed 14 stages with loops | Actual steps by project type and who performs each | Workflow variants, acceptance scope |
| Service scope | Residential design through optional planning and detail stages | Planning, tendering, BCAR, commencement, certification responsibilities | Modules and workflow depth |
| Handoff | Philippines produces concepts; Mullingar amends | Which revisions are outsourced, QA owner, escalation | Assignment and revision routing |
| SLAs | 2 working days for a sample amendment | Calendars, holidays, targets, pause conditions | Scheduling and reporting logic |
| Drawing formats | Schematic SVG samples | PDF, DWG, RVT, sizes, sheet sets, version conventions | Preview, storage, markup, integration |
| Approvals | One household reviewer | Joint approval, representatives, wording | Portal permissions, sign-off logic |
| Quotes and payments | Simple quote; manual deposit status | Quote method, acceptance, VAT, terms, invoicing | Accounting work is separate |
| Accounts | No provider assumed | Actual software and desired sync | Feasibility and scope |
| Microsoft 365 | Scoped mail and calendar, staff SSO | Tenant admin, shared mailboxes, two-way behaviours | Integration permissions and complexity |
| SharePoint | Authoritative storage, basic linking first | Migrate or sync, structure, permissions, volumes, external sharing | Often a major cost driver |
| WhatsApp and SMS | Simulated | Numbers, provider, usage, permitted message types | Setup, templates, running costs |
| ArcTech Pro | Phase 2 candidate | Buying decision, functions, API or export access | Integrate, defer or replace |
| Alternatives | Packaged tools under consideration | Names, what they liked, where they fell short | Whether custom earns its premium |
| Portal adoption | Clients use a simple web portal | Accessibility, email-only clients, multiple contacts | Support, fallback channels |
| Knowledge content | Sample FAQs and a demo video guide | Content owner, approved videos | Content and administration |
| Brand | Text JMA mark, provisional slate accent | Approved logo files, actual colours | Minor design work |
| Historical data | Fictional fixtures only | Sources, volumes, duplicates, archive scope | Migration and cleansing |
| Production safeguards | Requirements only | Hosting, retention, backups, recovery, security review, supplier access | Architecture and running cost |
| Schedule | None committed | Launch target, decision dates, staff availability | Delivery capacity |

Top pricing gates: workflow and service scope; user and data volumes; drawing and approval complexity; Microsoft and SharePoint scope; messaging feasibility; the ArcTech Pro decision; migration; launch and acceptance responsibilities. The demo's sample fees, staff count and timeline are not a proposal estimate.

## 10. Implementation notes (this repository)

- Stack unchanged: React 18, Vite, TypeScript. No dependencies added.
- `src/jma/` holds the demo: `types.ts` (model), `seed.ts` (fixtures), `template.ts` (stages), `store.ts` (all domain actions, idempotency keys, gates, programme forecasts, reset, localStorage persistence), `selectors.ts` (every derived figure and the persona scope), `ui.ts` (module and tab state, record drawer), `story.ts` (guided steps, each calling the same actions as the page buttons), `kit.tsx` + `styles/jma.css` (shared components on the Pulse tokens), `pages/` (module pages and record drawers), `agents.ts`, `answers.ts` (simulated Home answers), `search.ts` (⌘K, persona scoped), `records.ts` (feeds the stock Records views).
- Pulse shell, Home chat and Records with the original ontology graph are preserved and re-fed from the store. The locked layout rules in CLAUDE.md are kept: Home then Agents lead the rail, Ontology is the first Records tab, the Home centre column holds only the pill, greeting, subline, ask box and thread; briefings and work sit in the right widget rail; KPIs live on the Dashboard. One additive card ("Trace a project") was placed in the ontology's left column to open real records.
- Theme: a new `jma` dark theme (Harbour structure with a slate accent) and a slate-adjusted light theme in `styles/pulse.css`. Semantic success, warning and error colours are unchanged.
- Persona preview filters navigation, lists, search, drawers, downloads and activity. It is a UI preview, not security: the fixture bundle ships to the browser and is not a secure multi-tenant system.
- Integrations (Outlook, Calendar, SharePoint, Microsoft sign-in, WhatsApp, SMS, ArcTech Pro) are shown as proposed, provider-dependent or unverified. Message delivery is simulated with explicit Queued, Sent, Delivered, Failed and Retrying states; one failed notification (Connolly release email) has a retry path.
- The activity feed is demo history stored in the browser. Production audit immutability needs backend design.
- Drawing samples are locally authored schematic SVGs watermarked "DEMO SCHEMATIC". They are not architectural information and there is no CAD diff; comparison is side by side or overlay.

## 11. Checks run and known limits

- `npm run typecheck` and `npm run build` pass (one bundle-size warning, expected for a single-screen prototype).
- Browser QA in the built-in browser at 1440 px: Home chat answers, Dashboard KPIs and drill-downs, the full guided story through the Philippines preview, office QA, the Dunne portal pin comment, Rev B release and exact-version approval, reset to baseline, Programme slip preview with a fixed-date conflict, persona-scoped ⌘K search for the Philippines preview.
- 390 px client portal (Flynn) and the 320 px sweep of every module tab: no page-level horizontal scroll. Tables, boards and the Gantt scroll inside their own regions.
- The captioned demo video plays (25 s, captions track showing). It is an authored demo guide, not JMA training material.
- Copy sweep of every module tab: no legacy client names, no em or en dashes, no exclamation marks.
- Known limits: the Pulse shell is a desktop layout first; on phones the rail stays as a narrow icon column. Persona preview is not security. The record drawer covers the demo strip, so close it to reach the story controls (the story panel itself floats above drawers). Office staff cannot pin comments; only the client preview creates change requests. There is no automated test harness in this template, so logic was checked with scripted store runs rather than committed tests.

## 12. Unverified items that still need Ciaran

- Official logo file and brand colours (a logo exists on johnmadden.ie but was not supplied or downloaded; the demo uses a text JMA mark and a provisional slate accent #557AA3, ink #182534, pale #E8EFF6).
- Ciaran's formal title and purchasing authority.
- Which advertised services (planning, surveying, structural and civil design, BCAR, certifier roles, tendering) belong in the one-off house workflow.
- Every integration decision in section 9.

## Sources (checked 19 October 2026)

- https://www.johnmadden.ie/ (company name in body and footer, Blackhall Street address)
- https://www.johnmadden.ie/about-us
- https://www.johnmadden.ie/services
- https://ie.arctechpro.com/ and https://ie.arctechpro.com/services (publicly describes broader practice management; API and export suitability unverified)
