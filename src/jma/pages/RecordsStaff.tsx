/* Records → Staff: the eight people in the demo, with their local time from the
   demo clock and their current task load. */
import { useDemo } from "../store";
import * as S from "../selectors";
import { openDetail } from "../ui";
import { Avatar, Badge, Page, PageHead, Panel } from "../kit";
import { fmtTime, zoneLabel } from "../time";
import { RowMain, clickRow } from "./ops/shared";
import type { Staff } from "../types";

export default function RecordsStaff() {
  const d = useDemo();
  const rows = S.workload(d);
  const open = (s: Staff) => openDetail({ kind: "staff", id: s.id });
  return (
    <Page>
      <PageHead title="Staff" sub="Five people in Mullingar and three outsourced drawing staff in the Philippines. Everyone except Ciaran is fictional; demo email aliases are illustrative and nothing is sent to them." />
      <Panel flush>
        <div className="j-tablewrap jo-desktop">
          <table className="j-table">
            <thead><tr><th>Name</th><th>Role</th><th>Team</th><th>Local time</th><th>Open</th><th>Overdue</th><th>Email</th></tr></thead>
            <tbody>
              {rows.map(({ staff: s, open: o, overdue }) => (
                <tr key={s.id} {...clickRow(() => open(s))}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <Avatar name={s.name} colour={s.colour} />
                      <RowMain onClick={() => open(s)} label={"Open " + s.name}>{s.name}</RowMain>
                    </div>
                  </td>
                  <td style={{ minWidth: 180 }}>{s.role}</td>
                  <td>{s.team}</td>
                  <td className="jo-num">{fmtTime(d.now, s.tz)} {zoneLabel(s.tz)}<div className="j-cell-sub">{s.tz}</div></td>
                  <td className="jo-num">{o}</td>
                  <td>{overdue ? <Badge tone="bad" icon="alert">{overdue} overdue</Badge> : <span className="j-dim">None</span>}</td>
                  <td style={{ minWidth: 200 }}>
                    <div className="j-cell-main">{s.email}</div>
                    <div className="j-cell-sub">{s.real ? "Supplied contact. Demo role assumed; formal title unconfirmed." : "Illustrative alias, nothing is sent."}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="jo-mobile jo-cards">
          {rows.map(({ staff: s, open: o, overdue }) => (
            <div key={s.id} className="jo-card" onClick={() => open(s)}>
              <div className="jo-card-top">
                <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                  <Avatar name={s.name} colour={s.colour} />
                  <RowMain onClick={() => open(s)} label={"Open " + s.name}>{s.name}</RowMain>
                </div>
                {s.real && <Badge tone="accent" icon="user">Supplied contact</Badge>}
              </div>
              <div className="j-small">{s.role} · {s.team}</div>
              <div className="jo-card-meta">
                <span>{fmtTime(d.now, s.tz)} {zoneLabel(s.tz)}</span>
                <span>{o} open</span>
                <span className={overdue ? "jo-late" : undefined}>{overdue} overdue</span>
              </div>
              <div className="j-small">{s.email} · {s.real ? "supplied contact" : "illustrative alias, nothing is sent"}</div>
            </div>
          ))}
        </div>
      </Panel>
    </Page>
  );
}
