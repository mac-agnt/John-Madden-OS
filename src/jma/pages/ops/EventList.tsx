/* Event rows, newest first, optionally grouped by Dublin day. Each row opens
   EventDetail; the subject button opens the record the event changed. */
import { useState } from "react";
import type { ActivityEvent, DemoState } from "../../types";
import { openDetail } from "../../ui";
import { Btn, Empty } from "../../kit";
import { fmtDateTime, fmtTime } from "../../time";
import { ACTOR_KIND, EventStatus, LinkBtn, RowMain, groupByDay, nd, subjectRef } from "./shared";

function Row({ d, e, withDate }: { d: DemoState; e: ActivityEvent; withDate?: boolean }) {
  const ref = subjectRef(d, e.subject);
  const open = () => openDetail({ kind: "event", id: e.id });
  return (
    <div className="jo-ev j-row" onClick={open}>
      <span className="jo-ev-time">{withDate ? fmtDateTime(e.at) : fmtTime(e.at)}</span>
      <div style={{ minWidth: 0 }}>
        <RowMain onClick={open} label={"Open event: " + nd(e.summary)}>{nd(e.summary)}</RowMain>
        <div className="jo-ev-meta">
          <span>{e.actor.name} <span className="j-faint">({ACTOR_KIND[e.actor.kind]})</span></span>
          {ref && <LinkBtn onClick={ref.open}>{ref.label}</LinkBtn>}
        </div>
      </div>
      <EventStatus s={e.status} />
    </div>
  );
}

export default function EventList({ d, events, grouped = true, empty, page = 120 }: { d: DemoState; events: ActivityEvent[]; grouped?: boolean; empty?: { title: string; body?: string }; page?: number }) {
  const [limit, setLimit] = useState(page);
  if (!events.length) return <Empty title={empty?.title || "No events"} body={empty?.body} />;
  const list = events.slice(0, limit);
  const more = events.length > limit;
  return (
    <>
      {grouped ? groupByDay(list, (e) => e.at).map((g) => (
        <div key={g.key} className="jo-day">
          <div className="jo-day-head">{g.label}</div>
          {g.items.map((e) => <Row key={e.id} d={d} e={e} />)}
        </div>
      )) : list.map((e) => <Row key={e.id} d={d} e={e} withDate />)}
      {more && (
        <div style={{ padding: "12px 20px 16px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span className="j-small">Showing {list.length} of {events.length}.</span>
          <Btn size="sm" onClick={() => setLimit(limit + page)}>Show more</Btn>
        </div>
      )}
    </>
  );
}
