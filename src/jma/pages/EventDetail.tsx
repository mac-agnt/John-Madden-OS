/* Event drawer body: what happened, who or what did it, what changed and the
   records it touched. */
import { useDemo } from "../store";
import * as S from "../selectors";
import { Badge, Btn, Empty, KV, Panel } from "../kit";
import { TZ_PH, fmtDateTime } from "../time";
import { agentFor } from "./ops/agentsShared";
import { ACTOR_KIND, EventStatus, nd, refFor, subjectRef } from "./ops/shared";
import { openDetail } from "../ui";

export default function EventDetail({ id }: { id: string; tab?: string; versionId?: string }) {
  const d = useDemo();
  const e = S.visibleEvents(d).find((x) => x.id === id);
  if (!e) return <Empty title="Event not available" body="It is outside this preview's scope or was removed by a demo reset." />;
  const subj = subjectRef(d, e.subject);
  const related = e.related.map((r) => ({ id: r, ref: refFor(d, r) }));
  const ph = e.actor.kind === "staff" && d.staff[e.actor.id]?.tz === TZ_PH;
  const ag = e.actor.kind === "agent" ? agentFor(e.actor.name) : undefined;
  const actorOpen = e.actor.kind === "staff" && d.staff[e.actor.id] ? () => openDetail({ kind: "staff", id: e.actor.id }) : ag ? () => openDetail({ kind: "agent", id: ag.id }) : undefined;
  return (
    <div className="j-stack">
      <div className="j-row-wrap"><EventStatus s={e.status} /><Badge tone="neutral" icon="info">{e.type}</Badge></div>
      <div className="j-text">{nd(e.summary)}</div>
      <KV items={[
        ["When (Dublin)", fmtDateTime(e.at)],
        ...(ph ? [["When (Manila)", fmtDateTime(e.at, TZ_PH)] as [string, string]] : []),
        ["Actor", <span key="a">{actorOpen ? <button type="button" className="j-link" onClick={actorOpen}>{e.actor.name}</button> : e.actor.name} <span className="j-dim">({ACTOR_KIND[e.actor.kind]})</span></span>],
        ["Source", e.source],
        ["Subject", subj ? <button key="s" type="button" className="j-link" onClick={subj.open}>{subj.label}</button> : nd(e.subject.label) || e.subject.kind],
        ["Event id", e.id],
      ]} />
      {(e.before || e.after) && (
        <Panel title="What changed">
          <KV items={[["Before", nd(e.before) || "Not recorded"], ["After", nd(e.after) || "Not recorded"]]} />
        </Panel>
      )}
      <Panel title="Related records">
        {related.length === 0 ? <div className="j-small">No other records linked to this event.</div> : (
          <div className="j-list">
            {related.map((r) => (
              <div key={r.id} className="j-list-item" style={{ alignItems: "center" }}>
                {r.ref ? <Btn size="sm" icon="link" onClick={r.ref.open}>{r.ref.label}</Btn> : <span className="j-dim">{r.id} (not a viewable record)</span>}
              </div>
            ))}
          </div>
        )}
      </Panel>
      <div className="j-note">Demo history, stored in this browser and changed by a reset. A production audit log needs backend design so entries cannot be edited or deleted.</div>
    </div>
  );
}
