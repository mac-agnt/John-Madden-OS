/* Activity: every recorded event, already scoped to the previewed persona,
   linked to the record it changed. Failures and retries stay visible. */
import { useState } from "react";
import type { ActivityEvent } from "../types";
import { useDemo } from "../store";
import * as S from "../selectors";
import { MODULES, tabOf, tabsFor, useUi } from "../ui";
import { Btn, Field, Page, PageHead, Panel, SearchBox } from "../kit";
import EventList from "./ops/EventList";
import { nd, projectOfSubject } from "./ops/shared";

const TAB_FILTER: Record<string, (e: ActivityEvent) => boolean> = {
  all: () => true,
  people: (e) => e.actor.kind === "staff" || e.actor.kind === "client",
  agents: (e) => e.actor.kind === "agent",
  systems: (e) => e.actor.kind === "system" || e.actor.kind === "integration",
  attention: (e) => e.status === "failed" || e.status === "retry" || e.status === "attention",
};
const TAB_SUB: Record<string, string> = {
  all: "Everything recorded in the demo, newest first.",
  people: "Actions by staff and by clients in the portal preview.",
  agents: "Drafts and flags from the six simulated agents.",
  systems: "The workflow engine and simulated integrations (Outlook, SharePoint, the website form).",
  attention: "Failures, retries and events that asked for a person.",
};

export default function ActivityPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Activity")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Activity")) ? tabOf("Activity") : tabs[0].id;
  const [q, setQ] = useState("");
  const [proj, setProj] = useState("all");

  const visible = S.visibleEvents(d);
  const pidOf = (e: ActivityEvent) => projectOfSubject(d, e.subject) || (e.subject.kind === "project" ? e.subject.id : undefined);
  const projects = Array.from(new Set(visible.map(pidOf).filter((x): x is string => !!x && !!d.projects[x]))).sort();
  const needle = q.trim().toLowerCase();
  const shown = visible
    .filter(TAB_FILTER[tab] || TAB_FILTER.all)
    .filter((e) => proj === "all" || pidOf(e) === proj)
    .filter((e) => !needle || (e.summary + " " + e.actor.name + " " + e.subject.label + " " + e.type).toLowerCase().includes(needle))
    .sort((a, b) => b.at - a.at);
  const label = tabs.find((t) => t.id === tab)?.label || "Activity";

  return (
    <Page>
      <PageHead title={label} sub={TAB_SUB[tab] + " Demo history stored in this browser; a production audit log needs backend design for immutability and retention."} />
      <Panel flush>
        <div className="jo-filters" style={{ padding: "16px 20px 12px" }}>
          <SearchBox value={q} onChange={setQ} placeholder="Search events, people, records" label="Search activity" />
          <Field label="Project" htmlFor="act-proj">
            <select id="act-proj" className="j-select" value={proj} onChange={(e) => setProj(e.target.value)}>
              <option value="all">All projects</option>
              {projects.map((p) => <option key={p} value={p}>{p} {S.household(d, p)}</option>)}
            </select>
          </Field>
          {(q || proj !== "all") && <Btn size="sm" variant="ghost" icon="x" onClick={() => { setQ(""); setProj("all"); }}>Clear</Btn>}
          <span className="j-small" aria-live="polite">{shown.length} event{shown.length === 1 ? "" : "s"}</span>
        </div>
        <EventList d={d} events={shown} empty={{ title: "No events match", body: needle || proj !== "all" ? "Nothing matches “" + nd(q || proj) + "” on this tab. Clear the filters to see more." : "Nothing recorded on this tab yet." }} />
      </Panel>
    </Page>
  );
}
