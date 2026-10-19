/* Agent drawer body: what the agent reads, what it may do, where a person must
   decide, and what it has recently recorded. */
import { useDemo } from "../store";
import { AGENTS } from "../agents";
import { Badge, Empty, Panel } from "../kit";
import EventList from "./ops/EventList";
import { BriefingList, Face, FlagList, agentEvents, watchdogFlags } from "./ops/agentsShared";

export default function AgentProfile({ id }: { id: string; tab?: string; versionId?: string }) {
  const d = useDemo();
  const a = AGENTS.find((x) => x.id === id);
  if (!a) return <Empty title="Agent not found" />;
  const events = agentEvents(d, a).slice(0, 12);
  return (
    <div className="j-stack">
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Face a={a} size={52} />
        <div className="jo-grow">
          <div className="j-text">{a.purpose}</div>
          <div className="j-row-wrap" style={{ marginTop: 8 }}><Badge tone="neutral" icon="info">Simulated in this demo</Badge></div>
        </div>
      </div>
      <div className="jo-two even">
        <Panel title="Reads">
          <ul className="j-text" style={{ margin: 0, paddingLeft: 18 }}>{a.inputs.map((x) => <li key={x}>{x}</li>)}</ul>
        </Panel>
        <Panel title="Allowed actions">
          <ul className="j-text" style={{ margin: 0, paddingLeft: 18 }}>{a.allowed.map((x) => <li key={x}>{x}</li>)}</ul>
        </Panel>
      </div>
      <div className="j-note"><strong>Approval boundary.</strong> {a.boundary}</div>
      <div className="j-note warn"><strong>Never does.</strong> {a.never} It runs only inside this demo, on local data.</div>

      {a.id === "ag-briefing" && (
        <Panel title="Current briefing" sub="Recomputed from the records now.">
          <BriefingList d={d} />
        </Panel>
      )}
      {a.id === "ag-ops-watchdog" && (
        <Panel title="Current flags">
          <FlagList d={d} flags={watchdogFlags(d)} inDrawer />
        </Panel>
      )}

      <Panel title="Recent activity" sub="Events this agent recorded, newest first." flush>
        <EventList d={d} events={events} grouped={false} empty={{ title: "No activity recorded yet" }} />
      </Panel>
    </div>
  );
}
