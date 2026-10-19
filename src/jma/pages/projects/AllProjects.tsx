/* All projects: search, filters (stage, accountable owner, attention), sort.
   Desktop table, stacked cards under 760 px. Every count comes from records. */
import { useDemo } from "../../store";
import * as S from "../../selectors";
import { getFilter, openDetail, setFilter, useUi } from "../../ui";
import { STAGES } from "../../template";
import { Badge, Btn, DateTag, Empty, Panel, SearchBox, Seg, rowProps } from "../../kit";
import { ReasonBadges } from "./common";

type Att = "all" | "attention" | "ontrack";
type SortKey = "project" | "days" | "target" | "stage";
type Sort = { key: SortKey; dir: 1 | -1 };

const SORTS: { id: SortKey; label: string }[] = [
  { id: "project", label: "Project" }, { id: "days", label: "Days in stage" }, { id: "target", label: "Target" }, { id: "stage", label: "Stage" },
];

export default function AllProjects() {
  const d = useDemo();
  useUi();
  const vis = S.visibleProjectIds(d);
  const rows = S.projectRows(d).filter((r) => vis.has(r.p.id));
  const attIds = new Set(S.attention(d).map((a) => a.project.id));

  const att = getFilter<Att>("projects.attention", "all");
  const stage = getFilter<string>("projects.stage", "all");
  const owner = getFilter<string>("projects.owner", "all");
  const q = getFilter<string>("projects.q", "");
  const sort = getFilter<Sort>("projects.sort", { key: "project", dir: 1 });

  const needle = q.trim().toLowerCase();
  const matchQ = (r: S.ProjectRow) => !needle || [r.p.id, r.household, r.p.locality, r.stageName, r.owner, r.holder, r.next, r.p.note].join(" ").toLowerCase().includes(needle);
  const matchAtt = (r: S.ProjectRow) => att === "all" || (att === "attention" ? attIds.has(r.p.id) : !attIds.has(r.p.id));
  const matchStage = (r: S.ProjectRow) => stage === "all" || r.p.stage === stage;
  const matchOwner = (r: S.ProjectRow) => owner === "all" || r.p.ownerId === owner;

  // pill counts reflect the other active filters, so they always add up
  const base = rows.filter((r) => matchQ(r) && matchStage(r) && matchOwner(r));
  const attCount = { all: base.length, attention: base.filter((r) => attIds.has(r.p.id)).length, ontrack: base.filter((r) => !attIds.has(r.p.id)).length };
  const stageBase = rows.filter((r) => matchQ(r) && matchAtt(r) && matchOwner(r));
  const ownerBase = rows.filter((r) => matchQ(r) && matchAtt(r) && matchStage(r));
  const owners = [...new Set(rows.map((r) => r.p.ownerId))].sort((a, b) => S.staffName(d, a).localeCompare(S.staffName(d, b)));

  const filtered = base.filter(matchAtt);
  const cmp = (a: S.ProjectRow, b: S.ProjectRow) => {
    const k = sort.key;
    const v = k === "days" ? a.days - b.days : k === "target" ? a.target - b.target : k === "stage" ? STAGES.findIndex((s) => s.key === a.p.stage) - STAGES.findIndex((s) => s.key === b.p.stage) : a.p.id.localeCompare(b.p.id);
    return v * sort.dir || a.p.id.localeCompare(b.p.id);
  };
  const list = filtered.slice().sort(cmp);
  const anyFilter = att !== "all" || stage !== "all" || owner !== "all" || !!needle;
  const clear = () => { setFilter("projects.attention", "all"); setFilter("projects.stage", "all"); setFilter("projects.owner", "all"); setFilter("projects.q", ""); };
  const setSort = (key: SortKey) => setFilter("projects.sort", { key, dir: sort.key === key ? (-sort.dir as 1 | -1) : 1 });
  const open = (id: string) => openDetail({ kind: "project", id });

  const sortHead = (key: SortKey, label: string) => (
    <th aria-sort={sort.key === key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className="jp-sortbtn" onClick={() => setSort(key)} aria-label={"Sort by " + label}>
        {label}{sort.key === key ? (sort.dir === 1 ? " ▲" : " ▼") : ""}
      </button>
    </th>
  );

  return (
    <Panel flush title="All live projects" sub={rows.length + " live projects in this preview. Accountable owner answers for the job; the current holder is whoever has the work right now."}>
      <div className="j-stack" style={{ padding: "4px 20px 14px" }}>
        <div className="jp-toolbar">
          <SearchBox value={q} onChange={(v) => setFilter("projects.q", v)} placeholder="Search ID, household, locality, person, next action" label="Search projects" />
          <Seg<Att> label="Attention" value={att} onChange={(v) => setFilter("projects.attention", v)} options={[
            { id: "all", label: "All", count: attCount.all },
            { id: "attention", label: "Needs attention", count: attCount.attention },
            { id: "ontrack", label: "On track", count: attCount.ontrack },
          ]} />
        </div>
        <div className="jp-toolbar">
          <label className="jp-filter"><span>Stage</span>
            <select className="j-select" value={stage} onChange={(e) => setFilter("projects.stage", e.target.value)}>
              <option value="all">All stages ({stageBase.length})</option>
              {STAGES.filter((s) => !s.pre).map((s) => { const n = stageBase.filter((r) => r.p.stage === s.key).length; return <option key={s.key} value={s.key}>{s.n}. {s.name} ({n})</option>; })}
            </select>
          </label>
          <label className="jp-filter"><span>Accountable owner</span>
            <select className="j-select" value={owner} onChange={(e) => setFilter("projects.owner", e.target.value)}>
              <option value="all">Everyone ({ownerBase.length})</option>
              {owners.map((o) => <option key={o} value={o}>{S.staffName(d, o)} ({ownerBase.filter((r) => r.p.ownerId === o).length})</option>)}
            </select>
          </label>
          <label className="jp-filter"><span>Sort by</span>
            <select className="j-select" value={sort.key + ":" + sort.dir} onChange={(e) => { const [k, dir] = e.target.value.split(":"); setFilter("projects.sort", { key: k as SortKey, dir: +dir as 1 | -1 }); }}>
              {SORTS.flatMap((s) => [
                <option key={s.id + "1"} value={s.id + ":1"}>{s.label}{s.id === "days" ? ", fewest first" : s.id === "target" ? ", soonest first" : ", ascending"}</option>,
                <option key={s.id + "-1"} value={s.id + ":-1"}>{s.label}{s.id === "days" ? ", most first" : s.id === "target" ? ", latest first" : ", descending"}</option>,
              ])}
            </select>
          </label>
          <div className="j-actions" style={{ marginLeft: "auto", alignSelf: "center" }}>
            <span className="jp-count" aria-live="polite">Showing {list.length} of {rows.length}</span>
            {anyFilter && <Btn size="sm" variant="ghost" icon="x" onClick={clear}>Clear filters</Btn>}
          </div>
        </div>
        {att === "attention" && <div className="j-small"><Badge tone="warn" icon="alert">Filtered</Badge> Showing jobs with an overdue task, a blocking client item, a near deadline or a programme conflict.</div>}
      </div>

      {list.length === 0 ? (
        <Empty title="No projects match these filters" body={"Nothing in the " + rows.length + " live projects matches" + (needle ? " “" + q.trim() + "”" : "") + " with the filters set. Clear the filters to see every job."} action={<Btn icon="x" onClick={clear}>Clear filters</Btn>} />
      ) : (
        <>
          <div className="j-tablewrap jp-desktop">
            <table className="j-table jp-table">
              <thead>
                <tr>
                  {sortHead("project", "Project / client")}
                  <th>Locality</th>
                  {sortHead("stage", "Stage")}
                  <th>Accountable owner</th>
                  <th>Current holder</th>
                  {sortHead("days", "Days in stage")}
                  <th>Next action</th>
                  {sortHead("target", "Target")}
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.p.id} {...rowProps(() => open(r.p.id), "Open " + r.p.id + " " + r.household)}>
                    <td><div className="j-cell-main">{r.p.id}</div><div className="j-cell-sub">{r.household} household</div></td>
                    <td>{r.p.locality}</td>
                    <td><div>{r.stageName}</div><div className="j-cell-sub">Stage {STAGES.find((s) => s.key === r.p.stage)?.n}</div></td>
                    <td>{r.owner}</td>
                    <td><div className={r.holder === r.owner ? "" : "j-cell-main"}>{r.holder}</div><div className="j-cell-sub">{r.holder === r.owner ? "Owner holds it" : r.holderWhy}</div></td>
                    <td className="j-mono">{r.days} {r.days === 1 ? "day" : "days"}</td>
                    <td className="jp-col-next">{r.next}</td>
                    <td><DateTag ts={r.target} kind={r.targetKind} now={d.now} />{r.target < d.now && <div className="j-cell-sub j-ink-bad">Past target</div>}</td>
                    <td className="jp-col-status"><ReasonBadges reasons={r.reasons} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="jp-cards">
            {list.map((r) => (
              <button key={r.p.id} type="button" className="jp-card" onClick={() => open(r.p.id)}>
                <div className="jp-card-top">
                  <div><div className="j-cell-main">{r.p.id} · {r.household}</div><div className="j-cell-sub">{r.p.locality} · {r.stageName}</div></div>
                  <DateTag ts={r.target} kind={r.targetKind} now={d.now} />
                </div>
                <dl className="jp-meta">
                  <dt>Owner</dt><dd>{r.owner}</dd>
                  <dt>Holder</dt><dd>{r.holder}{r.holder !== r.owner ? " (" + r.holderWhy + ")" : ""}</dd>
                  <dt>In stage</dt><dd>{r.days} {r.days === 1 ? "day" : "days"}</dd>
                  <dt>Next</dt><dd>{r.next}</dd>
                </dl>
                <ReasonBadges reasons={r.reasons} />
              </button>
            ))}
          </div>
        </>
      )}
    </Panel>
  );
}
