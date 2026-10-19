/* Staff drawer body: who they are, where they work from, what they hold now
   and what they recently did. */
import { useDemo } from "../store";
import * as S from "../selectors";
import { openDetail } from "../ui";
import { Avatar, Badge, Empty, KV, Panel } from "../kit";
import { fmtDateTime, fmtTime, zoneLabel } from "../time";
import { stageDef } from "../template";
import TaskList from "./ops/TaskList";
import EventList from "./ops/EventList";
import { LinkBtn } from "./ops/shared";

export default function StaffDetail({ id }: { id: string; tab?: string; versionId?: string }) {
  const d = useDemo();
  const s = d.staff[id];
  if (!s) return <Empty title="Person not found" />;
  const w = S.workload(d).find((x) => x.staff.id === id);
  const tasks = w?.tasks || [];
  const briefs = Object.values(d.briefs).filter((b) => b.assigneeId === id && S.ACTIVE_BRIEF.includes(b.status));
  const owned = S.liveProjects(d).filter((p) => p.ownerId === id);
  const events = S.visibleEvents(d).filter((e) => e.actor.id === id).sort((a, b) => b.at - a.at).slice(0, 12);
  return (
    <div className="j-stack">
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Avatar name={s.name} colour={s.colour} size={44} />
        <div className="jo-grow">
          <div className="j-text">{s.role}</div>
          <div className="j-row-wrap" style={{ marginTop: 6 }}>
            <Badge tone="neutral" icon="user">{s.team}</Badge>
            {s.real ? <Badge tone="accent" icon="info">Supplied contact</Badge> : <Badge tone="neutral" icon="info">Fictional person</Badge>}
          </div>
        </div>
      </div>
      <KV items={[
        ["Team", s.team === "Philippines" ? "Philippines (outsourced drawing staff)" : "Mullingar office"],
        ["Timezone", s.tz + " · now " + fmtTime(d.now, s.tz) + " " + zoneLabel(s.tz)],
        ["Email", s.email],
        ["Email note", s.real ? "Supplied contact. Demo role assumed; formal title unconfirmed." : "Illustrative alias, nothing is sent."],
        ["Open tasks", String(w?.open ?? 0)],
        ["Overdue", String(w?.overdue ?? 0)],
      ]} />

      <Panel title="Open tasks" flush>
        <TaskList d={d} tasks={tasks} compact empty={{ title: "No open tasks", body: s.name.split(" ")[0] + " has nothing open." }} />
      </Panel>

      <Panel title="Current assignments">
        {briefs.length === 0 && owned.length === 0 ? <div className="j-small">No active drawing briefs and no projects as accountable owner.</div> : (
          <div className="j-list">
            {briefs.map((b) => (
              <div key={b.id} className="j-list-item">
                <Badge tone="info" icon="doc">Drawing brief</Badge>
                <div className="jo-grow">
                  <LinkBtn onClick={() => openDetail({ kind: "drawing", id: b.drawingId })}>{b.projectId} · {S.household(d, b.projectId)}</LinkBtn>
                  <div className="j-small">{b.status}{b.due ? " · due " + fmtDateTime(b.due, s.tz, true) : ""}</div>
                </div>
              </div>
            ))}
            {owned.map((p) => (
              <div key={p.id} className="j-list-item">
                <Badge tone="neutral" icon="flag">Accountable owner</Badge>
                <div className="jo-grow">
                  <LinkBtn onClick={() => openDetail({ kind: "project", id: p.id })}>{p.id} · {S.household(d, p.id)}</LinkBtn>
                  <div className="j-small">{stageDef(p.stage).name}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Recent activity" sub="Events where this person is the actor." flush>
        <EventList d={d} events={events} grouped={false} empty={{ title: "No recorded activity" }} />
      </Panel>
    </div>
  );
}
