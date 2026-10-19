/* One task list used by Work, Dashboard drill-downs and staff records:
   a table on desktop and a card list under 760px. Rows open TaskDetail. */
import type { DemoState, Task } from "../../types";
import * as S from "../../selectors";
import { Empty } from "../../kit";
import { openDetail } from "../../ui";
import { LinkBtn, Priority, RowMain, TASK_KIND, TaskDue, TaskState, clickRow, nd, taskRecordRef } from "./shared";

export default function TaskList({ d, tasks, empty, compact }: { d: DemoState; tasks: Task[]; empty?: { title: string; body?: string }; compact?: boolean }) {
  if (!tasks.length) return <Empty title={empty?.title || "No tasks match"} body={empty?.body || "Change or clear the filters to see more."} />;
  const open = (t: Task) => openDetail({ kind: "task", id: t.id });
  return (
    <>
      <div className="j-tablewrap jo-desktop">
        <table className="j-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>Project or lead</th>
              <th>Assignee / owner</th>
              <th>Due</th>
              <th>State</th>
              {!compact && <th>Priority</th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const ref = taskRecordRef(d, t);
              return (
                <tr key={t.id} {...clickRow(() => open(t))}>
                  <td style={{ minWidth: 220 }}>
                    <RowMain onClick={() => open(t)} label={"Open task " + nd(t.title)}>{nd(t.title)}</RowMain>
                    <div className="j-cell-sub">{TASK_KIND[t.kind]} · {t.team}</div>
                  </td>
                  <td>{ref ? <LinkBtn onClick={ref.open}>{ref.label}</LinkBtn> : <span className="j-dim">None</span>}</td>
                  <td>
                    <div className="j-cell-main">{S.staffName(d, t.assigneeId)}</div>
                    <div className="j-cell-sub">{t.ownerId === t.assigneeId ? "Also accountable owner" : "Owner: " + S.staffName(d, t.ownerId)}</div>
                  </td>
                  <td><TaskDue d={d} t={t} /></td>
                  <td><TaskState d={d} t={t} /></td>
                  {!compact && <td><Priority p={t.priority} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="jo-mobile jo-cards">
        {tasks.map((t) => {
          const ref = taskRecordRef(d, t);
          return (
            <div key={t.id} className="jo-card" onClick={() => open(t)}>
              <div className="jo-card-top">
                <RowMain onClick={() => open(t)} label={"Open task " + nd(t.title)}>{nd(t.title)}</RowMain>
                <TaskState d={d} t={t} />
              </div>
              <div className="jo-card-meta">
                <span>{S.staffName(d, t.assigneeId)}{t.ownerId !== t.assigneeId ? " (owner " + S.firstName(d, t.ownerId) + ")" : ""}</span>
                <span>{t.priority} priority</span>
              </div>
              <TaskDue d={d} t={t} />
              {ref && <LinkBtn onClick={ref.open}>{ref.label}</LinkBtn>}
            </div>
          );
        })}
      </div>
    </>
  );
}
