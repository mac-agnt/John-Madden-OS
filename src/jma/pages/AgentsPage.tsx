/* Agents: the six simulated operational agents. They read the store and can
   only draft or flag; anything with an effect waits for a person. */
import { useState } from "react";
import type { DemoState } from "../types";
import { useDemo } from "../store";
import { AGENTS } from "../agents";
import { MODULES, openDetail, tabOf, tabsFor, useUi } from "../ui";
import { Badge, Page, PageHead, Panel, Seg } from "../kit";
import { ago, fmtDate } from "../time";
import EventList from "./ops/EventList";
import { BriefingList, Face, FlagList, agentEvents, watchdogFlags } from "./ops/agentsShared";
import { nd } from "./ops/shared";

export default function AgentsPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Agents")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Agents")) ? tabOf("Agents") : tabs[0].id;
  return (
    <Page>
      {tab === "overview" && <Overview d={d} />}
      {tab === "briefing" && <Briefing d={d} />}
      {tab === "watchdog" && <Watchdog d={d} />}
      {tab === "activity" && <Activity d={d} />}
    </Page>
  );
}

function Overview({ d }: { d: DemoState }) {
  return (
    <>
      <PageHead title="Agents" sub="Six simulated operational agents. Each reads the demo records and can draft, flag or send one approved template; people make every decision. None of them designs, certifies or advises." />
      <div className="jo-agents">
        {AGENTS.map((a) => {
          const last = agentEvents(d, a)[0];
          return (
            <button key={a.id} type="button" className="jo-agent" onClick={() => openDetail({ kind: "agent", id: a.id })} aria-label={"Open " + a.name + " agent profile"}>
              <div className="jo-agent-head">
                <Face a={a} />
                <div className="jo-grow">
                  <div className="j-h2">{a.name}</div>
                  <div style={{ marginTop: 4 }}><Badge tone="neutral" icon="info">Simulated</Badge></div>
                </div>
              </div>
              <div className="j-text" style={{ fontSize: 13 }}>{a.purpose}</div>
              <div className="j-small">{last ? "Last activity " + ago(last.at, d.now) + ": " + nd(last.summary) : "No recorded activity yet."}</div>
            </button>
          );
        })}
      </div>
    </>
  );
}

function Briefing({ d }: { d: DemoState }) {
  const a = AGENTS.find((x) => x.id === "ag-briefing")!;
  return (
    <>
      <PageHead title={"Morning briefing, prepared " + fmtDate(d.now)} sub="Written by the Briefing agent from the live records. It updates as soon as anything changes and is read-only: it changes nothing." />
      <Panel title={<span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}><Face a={a} size={28} />For Ciaran</span>} sub="Each line opens the records behind it.">
        <BriefingList d={d} />
      </Panel>
    </>
  );
}

function Watchdog({ d }: { d: DemoState }) {
  const flags = watchdogFlags(d);
  const a = AGENTS.find((x) => x.id === "ag-ops-watchdog")!;
  return (
    <>
      <PageHead title="Ops Watchdog" sub="Flags computed from the store: overdue tasks, work missing an owner or target, programme conflicts and recorded external dates that are close. Escalations are drafts saved as internal notes; the watchdog never sends, reassigns or moves a date." />
      <Panel title={<span style={{ display: "inline-flex", gap: 10, alignItems: "center" }}><Face a={a} size={28} />Current flags</span>} sub={flags.length + " flag" + (flags.length === 1 ? "" : "s") + " right now."}>
        <FlagList d={d} flags={flags} />
      </Panel>
    </>
  );
}

function Activity({ d }: { d: DemoState }) {
  const [who, setWho] = useState<string>("all");
  const all = AGENTS.flatMap((a) => agentEvents(d, a));
  const uniq = Array.from(new Map(all.map((e) => [e.id, e])).values()).sort((x, y) => y.at - x.at);
  const shown = who === "all" ? uniq : agentEvents(d, AGENTS.find((a) => a.id === who)!);
  return (
    <>
      <PageHead title="Agent activity" sub="Everything the simulated agents recorded, newest first. Drafts and flags only; each row opens the event." />
      <Panel flush>
        <div style={{ padding: "16px 20px 12px" }}>
          <Seg label="Agent" value={who} onChange={setWho} options={[{ id: "all", label: "All agents", count: uniq.length }, ...AGENTS.map((a) => ({ id: a.id, label: a.name, count: agentEvents(d, a).length }))]} />
        </div>
        <EventList d={d} events={shown} empty={{ title: "No activity for this agent yet", body: "It records an event when an action in the demo gives it something to do." }} />
      </Panel>
    </>
  );
}
