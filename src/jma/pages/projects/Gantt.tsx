/* Programme Gantt for one project. Baseline is the faint bar, forecast the
   solid bar; fixed dates (client commitments, recorded external dates) are
   markers that a slip never moves. Edits are previewed before they apply. */
import { useEffect, useRef, useState } from "react";
import { act, programmeView, useDemo, type ProgView } from "../../store";
import { openDetail } from "../../ui";
import { Badge, Btn, Empty, Field, Icon } from "../../kit";
import { DAY, atLocal, fmtDate, fmtDateTime, fmtShortDate, localParts } from "../../time";
import { isOffice } from "./common";

const PX = 24;
const LABEL_W = 270;

function conflictMap(view: ProgView[]) {
  /** non-fixed item id → fixed items it runs past */
  const m = new Map<string, ProgView[]>();
  view.filter((v) => v.fixed && v.conflict).forEach((f) => {
    f.deps.forEach((dep) => {
      const src = view.find((x) => x.id === dep);
      if (src && src.end > f.start) m.set(dep, (m.get(dep) || []).concat([f]));
    });
  });
  return m;
}

function ItemBadges({ v, runsPast }: { v: ProgView; runsPast?: ProgView[] }) {
  return (
    <div className="jp-reasons">
      {v.fixed && <Badge tone="info" icon="lock">{v.dateKind}</Badge>}
      {v.fixed && v.conflict && <Badge tone="bad" icon="alert">Conflict: forecast runs past this fixed date</Badge>}
      {runsPast?.map((f) => <Badge key={f.id} tone="bad" icon="alert">Conflict: ends after {f.label}</Badge>)}
      {v.overdue && <Badge tone="bad" icon="clock">Overdue, forecast from today</Badge>}
      {!v.fixed && !v.overdue && v.moved && <Badge tone="warn" icon="arrow">Moved from baseline</Badge>}
    </div>
  );
}

export default function ProgrammeGantt({ pid, editable = true }: { pid: string; editable?: boolean }) {
  const d = useDemo();
  const view = programmeView(d, pid);
  const [editId, setEditId] = useState<string | null>(null);
  const [wd, setWd] = useState(2);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const canEdit = editable && isOffice(d);
  const scroller = useRef<HTMLDivElement>(null);
  const todayX = useRef(0);
  // open the track at today rather than at the start of the job
  useEffect(() => { if (scroller.current) scroller.current.scrollLeft = Math.max(0, todayX.current - 140); }, [pid]);

  if (!view.length) return <Empty title="No programme for this job" body="Programme items are created from the stage template when a job is live." />;

  const editItem = editId ? view.find((v) => v.id === editId) : undefined;
  const preview = editItem ? programmeView(d, pid, { itemId: editItem.id, wd }) : null;
  const cmap = conflictMap(view);

  const stamps = [d.now, ...view.flatMap((v) => [v.start, v.end, v.baseStart, v.baseEnd]), ...(preview || []).map((v) => v.end)].filter((t) => t > 0);
  const origin = atLocal(Math.min(...stamps) - 2 * DAY, 0, 0);
  const days = Math.ceil((Math.max(...stamps) - origin) / DAY) + 5;
  const width = days * PX;
  const x = (ts: number) => ((ts - origin) / DAY) * PX;
  todayX.current = x(d.now);

  const cols = Array.from({ length: days }, (_, i) => {
    const ts = origin + i * DAY;
    const lp = localParts(ts + 12 * 3600000);
    return { i, ts: ts + 12 * 3600000, wd: lp.wd };
  });

  const taskDone = (v: ProgView) => !!v.taskId && d.tasks[v.taskId]?.state === "Done";
  const startEdit = (v: ProgView) => { setEditId(v.id); setWd(2); setReason(""); setErr(""); };
  const apply = () => {
    if (!editItem) return;
    if (!reason.trim()) { setErr("Give a reason. It is saved with the change."); return; }
    const r = act.slipProgramme(editItem.id, wd, reason.trim());
    if (r.ok) setEditId(null); else setErr(r.message);
  };

  const moves = preview ? preview.filter((p) => { const c = view.find((v) => v.id === p.id); return c && !p.fixed && Math.abs(c.end - p.end) > 60000; }) : [];
  const conflicts = preview ? preview.filter((p) => p.conflict) : [];

  return (
    <div className="j-stack" style={{ gap: 0 }}>
      <div style={{ padding: "4px 20px 14px" }} className="j-stack">
        <div className="jp-legend" aria-label="Legend">
          <span><i className="jp-lg-base" />Baseline</span>
          <span><i className="jp-lg-fc" />Forecast</span>
          <span><i className="jp-lg-fix" />Fixed date (client commitment or recorded external date)</span>
          <span><i className="jp-lg-today" />Today on the demo clock, {fmtDateTime(d.now)}</span>
        </div>
        <p className="j-small" style={{ margin: 0 }}>
          Forecasts are calculated from the stage template's internal duration assumptions and live task targets. Client commitments and recorded external dates are fixed: a slip never moves them. Council dates are recorded from correspondence (sample data), never calculated.
        </p>
      </div>

      {/* Desktop and tablet: scrolling Gantt with a fixed label column */}
      <div ref={scroller} className="jp-gantt jp-desktop" role="region" aria-label={"Programme for " + pid + ", scrolls sideways"} tabIndex={0}>
        <div className="jp-g-inner" style={{ width: LABEL_W + width }}>
          <div className="jp-g-row jp-g-head">
            <div className="jp-g-label">Item</div>
            <div className="jp-g-track" style={{ width }}>
              {cols.filter((c) => c.wd === 0 || c.wd === 6).map((c) => <div key={"w" + c.i} className="jp-g-wkend" style={{ left: c.i * PX, width: PX }} />)}
              {cols.filter((c, i) => c.wd === 1 || i === 0).map((c) => <div key={"t" + c.i} className={"jp-g-tick" + (c.wd === 1 ? " mon" : "")} style={{ left: c.i * PX }}>{fmtDate(c.ts)}</div>)}
              <div className="jp-g-todaylbl" style={{ left: x(d.now) }}>Today</div>
            </div>
          </div>
          {view.map((v) => {
            const pv = preview?.find((p) => p.id === v.id);
            const showPv = pv && !v.fixed && Math.abs(pv.end - v.end) > 60000;
            const done = taskDone(v);
            return (
              <div key={v.id} className="jp-g-row">
                <div className="jp-g-label">
                  <div className="jp-g-name">{v.label}</div>
                  <div className="jp-g-sub">{v.fixed ? v.dateKind + ": " + fmtDateTime(v.start) : (done ? "Completed " : v.dateKind + ": ends ") + fmtDateTime(v.end)}</div>
                  <ItemBadges v={v} runsPast={cmap.get(v.id)} />
                  <div className="jp-g-actions">
                    {canEdit && !v.fixed && !done && <Btn size="sm" variant={editId === v.id ? "primary" : "secondary"} icon="edit" onClick={() => startEdit(v)} ariaLabel={"Edit target for " + v.label}>Edit target</Btn>}
                    {v.taskId && <button type="button" className="j-link" style={{ fontSize: 12 }} onClick={() => openDetail({ kind: "task", id: v.taskId! })}>Task {v.taskId}</button>}
                  </div>
                </div>
                <div className="jp-g-track" style={{ width }}>
                  {cols.filter((c) => c.wd === 0 || c.wd === 6).map((c) => <div key={"w" + c.i} className="jp-g-wkend" style={{ left: c.i * PX, width: PX }} />)}
                  {v.fixed ? (
                    <>
                      <div className={"jp-fix" + (v.conflict ? " conflict" : "")} style={{ left: x(v.start) }} />
                      <div className="jp-fix-lbl" style={{ left: x(v.start) }}>{fmtShortDate(v.start)} {fmtDateTime(v.start).split(", ")[1]}, {v.dateKind.toLowerCase()}</div>
                    </>
                  ) : (
                    <>
                      <div className="jp-bar-base" style={{ left: x(v.baseStart), width: Math.max(4, x(v.baseEnd) - x(v.baseStart)) }} title={"Baseline: " + fmtDateTime(v.baseStart) + " to " + fmtDateTime(v.baseEnd)} />
                      <div className={"jp-bar " + v.kind + (done ? " done" : v.overdue ? " overdue" : cmap.has(v.id) ? " conflict" : v.moved ? " moved" : "")} style={{ left: x(v.start), width: Math.max(6, x(v.end) - x(v.start)) }} title={"Forecast: " + fmtDateTime(v.start) + " to " + fmtDateTime(v.end)} />
                      {showPv && <div className="jp-bar preview" style={{ left: x(pv!.start), width: Math.max(6, x(pv!.end) - x(pv!.start)), background: "transparent" }} title={"Preview: ends " + fmtDateTime(pv!.end)} />}
                      <div className="jp-bar-lbl" style={{ left: Math.max(x(v.end), showPv ? x(pv!.end) : 0) }}>{fmtShortDate(v.end)}{showPv ? ", preview " + fmtShortDate(pv!.end) : ""}</div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          <div className="jp-g-today" style={{ left: LABEL_W + x(d.now) }} aria-hidden="true" />
        </div>
      </div>

      {/* Mobile: short milestone list instead of the Gantt */}
      <div className="jp-mobile" style={{ padding: "0 16px" }}>
        <div className="j-list" aria-label={"Programme milestones for " + pid}>
          {view.map((v) => (
            <div key={v.id} className="j-list-item" style={{ flexDirection: "column", gap: 6 }}>
              <div className="j-cell-main">{v.label}</div>
              <div className="j-small">{v.fixed ? v.dateKind + ": " + fmtDateTime(v.start) : (taskDone(v) ? "Completed " : v.dateKind + ": ends ") + fmtDateTime(v.end)}{!v.fixed && v.moved ? ". Baseline " + fmtDateTime(v.baseEnd) : ""}</div>
              <ItemBadges v={v} runsPast={cmap.get(v.id)} />
              {canEdit && !v.fixed && !taskDone(v) && <Btn size="sm" icon="edit" onClick={() => startEdit(v)}>Edit target</Btn>}
            </div>
          ))}
        </div>
      </div>

      {editItem && preview && (
        <div className="jp-edit" role="group" aria-label={"Edit target for " + editItem.label}>
          <div className="jp-bar-row">
            <h3 className="j-h3">Edit target: {editItem.label}</h3>
            <Btn size="sm" variant="ghost" icon="x" onClick={() => setEditId(null)}>Cancel</Btn>
          </div>
          <div className="j-grid j-grid-2">
            <Field label="Move the forecast by" htmlFor="slip-wd" hint="Working days (Mon to Fri; holidays not modelled).">
              <select id="slip-wd" className="j-select" value={wd} onChange={(e) => setWd(+e.target.value)}>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>+{n} working day{n > 1 ? "s" : ""}</option>)}
              </select>
            </Field>
            <Field label="Reason (required)" htmlFor="slip-reason" error={err}>
              <textarea id="slip-reason" className="j-textarea" style={{ minHeight: 60 }} value={reason} onChange={(e) => { setReason(e.target.value); setErr(""); }} placeholder="For example: client asked for an extra week to confirm the layout" />
            </Field>
          </div>
          <div className="jp-preview" aria-live="polite">
            <div className="j-label">Preview before applying</div>
            {moves.length === 0 ? <div className="j-small">No forecasts move.</div> : moves.map((m) => {
              const c = view.find((v) => v.id === m.id)!;
              return (
                <div key={m.id} className="jp-preview-row">
                  <span className="j-cell-main" style={{ flex: "1 1 220px" }}>{m.label}</span>
                  <span>{fmtDateTime(c.end)} <Icon name="arrow" size={12} style={{ verticalAlign: "-2px" }} /> {fmtDateTime(m.end)}</span>
                  <span className="j-faint">Forecast</span>
                </div>
              );
            })}
            {conflicts.map((c) => {
              const was = view.find((v) => v.id === c.id)?.conflict;
              return (
                <div key={c.id} className="j-note warn jp-wrapb">
                  <Badge tone="bad" icon="alert">{was ? "Still conflicts" : "New conflict"}</Badge>{" "}
                  Forecast runs past {c.label} ({c.dateKind.toLowerCase()}, {fmtDateTime(c.start)}). This date is fixed and will not move; agree a new date with the client or recover the time.
                </div>
              );
            })}
            {!conflicts.length && <div className="j-small"><Icon name="check" size={12} style={{ verticalAlign: "-2px" }} /> No conflict with fixed dates.</div>}
          </div>
          <div className="j-actions">
            <Btn variant="primary" icon="check" onClick={apply}>Apply +{wd} working day{wd > 1 ? "s" : ""}</Btn>
            <Btn variant="ghost" onClick={() => setEditId(null)}>Cancel</Btn>
          </div>
          <div className="j-small">{editItem.taskId ? "This item is linked to a task: its target moves and the original date stays in the task history." : "Fixed dates are never moved by a slip."}</div>
        </div>
      )}
    </div>
  );
}
