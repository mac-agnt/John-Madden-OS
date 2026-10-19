/* Stage board: one column per project stage (pre-project sales stages live in
   Sales). Empty stages collapse to a narrow column with a note. */
import { useDemo } from "../../store";
import * as S from "../../selectors";
import { openDetail, useUi } from "../../ui";
import { STAGES } from "../../template";
import { Badge, Panel } from "../../kit";
import { AdvanceStage, GateProgress, ReasonBadges } from "./common";

export default function StageBoard() {
  const d = useDemo();
  useUi();
  const vis = S.visibleProjectIds(d);
  const rows = S.projectRows(d).filter((r) => vis.has(r.p.id));
  const cols = STAGES.filter((s) => !s.pre);

  return (
    <Panel title="Stage board" sub={"Each column is a stage of the residential template. Moving a job checks its stage gate first; an override needs a reason and is recorded. Scroll sideways for later stages."}>
      <div className="jp-board" role="region" aria-label="Stage board, scrolls sideways" tabIndex={0}>
        {cols.map((s) => {
          const jobs = rows.filter((r) => r.p.stage === s.key);
          return (
            <section key={s.key} className={"jp-col" + (jobs.length ? "" : " empty")} aria-label={s.name + ", " + jobs.length + " jobs"}>
              <header className="jp-col-head">
                <div style={{ minWidth: 0 }}>
                  <div className="jp-col-n">STAGE {s.n}</div>
                  <div className="jp-col-name">{s.name}</div>
                </div>
                <Badge tone="neutral" icon={false}>{jobs.length}</Badge>
              </header>
              {s.conditional && <div className="j-small">Conditional: only when the council asks for further information.</div>}
              {s.key === "commencement" && <div className="j-small">Scoped: used only when commencement documents are in the agreed service.</div>}
              {jobs.length === 0 && <div className="j-small j-faint">No live jobs at this stage.</div>}
              {jobs.map((r) => (
                <article key={r.p.id} className="jp-bcard">
                  <button type="button" className="jp-bcard-title" onClick={() => openDetail({ kind: "project", id: r.p.id })}>
                    {r.household}, {r.p.locality}
                    <span className="j-cell-sub" style={{ display: "block", fontWeight: 400 }}>{r.p.id} · {r.days} {r.days === 1 ? "day" : "days"} in stage</span>
                  </button>
                  <dl className="jp-meta">
                    <dt>Owner</dt><dd>{r.owner}</dd>
                    {r.holder !== r.owner && <><dt>Holder</dt><dd>{r.holder}</dd></>}
                    <dt>Next</dt><dd>{r.next}</dd>
                  </dl>
                  {r.reasons.length > 0 && <ReasonBadges reasons={r.reasons} compact />}
                  <GateProgress pid={r.p.id} />
                  <AdvanceStage pid={r.p.id} size="sm" primary={false} />
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
