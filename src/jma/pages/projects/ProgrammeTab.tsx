/* Programme tab: pick a live project, see its Gantt, slip a forecast with a
   preview. Defaults to JMA-26002 Kelly (fixed client meeting on 22 Oct). */
import { programmeView, useDemo } from "../../store";
import * as S from "../../selectors";
import { getFilter, openDetail, setFilter, useUi } from "../../ui";
import { stageDef } from "../../template";
import { Badge, Btn, Panel } from "../../kit";
import { fmtDateTime } from "../../time";
import ProgrammeGantt from "./Gantt";

export default function ProgrammeTab() {
  const d = useDemo();
  useUi();
  const vis = S.visibleProjectIds(d);
  const live = S.liveProjects(d).filter((p) => vis.has(p.id));
  const want = getFilter<string>("projects.programme", "JMA-26002");
  const pid = live.some((p) => p.id === want) ? want : live[0]?.id;
  const p = pid ? d.projects[pid] : undefined;

  const summary = live.map((x) => {
    const v = programmeView(d, x.id);
    return { p: x, cur: v[0], conflict: v.some((i) => i.conflict), fixed: v.filter((i) => i.fixed) };
  });

  return (
    <div className="jp-prog-layout">
      <Panel flush title="Live projects" sub="Forecast end of the current stage. Select a job to see its programme.">
        <div className="jp-projpick" aria-label="Choose a project">
          {summary.map(({ p: x, cur, conflict, fixed }) => (
            <button key={x.id} type="button" className="jp-projpick-item" aria-pressed={x.id === pid} onClick={() => setFilter("projects.programme", x.id)}>
              <span className="j-cell-main">{x.id} · {S.household(d, x.id)}</span>
              <span className="j-cell-sub">{stageDef(x.stage).name}{cur ? ", forecast " + fmtDateTime(cur.end) : ""}</span>
              {(conflict || fixed.length > 0) && (
                <span className="jp-reasons">
                  {conflict && <Badge tone="bad" icon="alert">Conflict with a fixed date</Badge>}
                  {fixed.map((f) => <Badge key={f.id} tone="info" icon="lock">{f.dateKind}</Badge>)}
                </span>
              )}
            </button>
          ))}
        </div>
      </Panel>
      {p ? (
        <Panel flush title={"Programme: " + p.id + " " + S.household(d, p.id) + ", " + p.locality}
          sub={"Stage " + stageDef(p.stage).n + ", " + stageDef(p.stage).name + ". Template " + p.templateVersion + "."}
          actions={<Btn size="sm" icon="eye" onClick={() => openDetail({ kind: "project", id: p.id, tab: "programme" })}>Open project</Btn>}>
          <ProgrammeGantt key={p.id} pid={p.id} />
        </Panel>
      ) : (
        <Panel title="Programme"><p className="j-small">No live projects in this preview.</p></Panel>
      )}
    </div>
  );
}
