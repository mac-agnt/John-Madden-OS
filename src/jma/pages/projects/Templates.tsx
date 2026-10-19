/* Stage templates: the published template as a table, a local draft for
   administrators, publish as a new version, and version history. Publishing
   never rewrites existing jobs: each keeps its template snapshot. */
import { useState } from "react";
import type { StageDef, StageTemplate } from "../../types";
import { act, useDemo } from "../../store";
import * as S from "../../selectors";
import { Badge, Btn, Field, KV, Panel } from "../../kit";
import { fmtDate, fmtDateTime } from "../../time";

export default function Templates() {
  const d = useDemo();
  const canEdit = S.canConfigure(d);
  const [draft, setDraft] = useState<StageTemplate | null>(null);
  const [err, setErr] = useState("");
  const tpl = draft || d.template;

  const byVersion = new Map<string, string[]>();
  Object.values(d.projects).forEach((p) => byVersion.set(p.templateVersion, (byVersion.get(p.templateVersion) || []).concat([p.id])));

  const patch = (key: StageDef["key"], fn: (s: StageDef) => StageDef) => {
    if (!draft) return;
    setDraft({ ...draft, stages: draft.stages.map((s) => (s.key === key ? fn(s) : s)) });
    setErr("");
  };
  const publish = () => {
    if (!draft) return;
    const bad = draft.stages.find((s) => !s.name.trim() || !(s.days >= 0) || !s.required.some((r) => r.trim()));
    if (bad) { setErr("Stage " + bad.n + " needs a name, a duration of zero or more working days and at least one required exit item."); return; }
    const clean: StageTemplate = { ...draft, stages: draft.stages.map((s) => ({ ...s, name: s.name.trim(), clientText: s.clientText.trim(), required: s.required.map((r) => r.trim()).filter(Boolean) })) };
    const r = act.publishTemplate(clean);
    if (r.ok) setDraft(null); else setErr(r.message);
  };

  const flags = (s: StageDef) => (
    <div className="jp-reasons">
      {s.pre && <Badge tone="neutral" icon="info">Pre-project (Sales)</Badge>}
      {s.conditional && <Badge tone="info" icon="refresh">Conditional loop</Badge>}
      {s.scoped && <Badge tone="info" icon="layers">{s.key === "commencement" ? "Scoped: off unless in service scope" : "Scoped: planning service"}</Badge>}
      {!s.pre && !s.conditional && !s.scoped && <span className="j-faint">Standard</span>}
    </div>
  );

  return (
    <div className="j-stack">
      <Panel title={"Stage template: " + d.template.version}
        sub={"Published " + fmtDateTime(d.template.publishedAt) + ". " + d.template.note}
        actions={canEdit ? (draft
          ? <><Btn variant="ghost" onClick={() => { setDraft(null); setErr(""); }}>Discard draft</Btn><Btn variant="primary" icon="upload" onClick={publish}>Publish as new version</Btn></>
          : <Btn icon="edit" onClick={() => setDraft(structuredClone(d.template))}>Edit a draft</Btn>)
          : <Badge tone="neutral" icon="lock">Read only: administrators edit templates</Badge>}>
        <div className="j-stack">
          <div className="j-note">
            Editing a template never rewrites existing jobs. Each project keeps the template version it was created with; only new jobs use a newly published version. Durations are internal assumptions in working days, not promises to clients.
          </div>
          {draft && (
            <div className="j-grid j-grid-2">
              <Field label="Version note" htmlFor="tpl-note" hint={"Publishing creates the next minor version after " + d.template.version + "."}>
                <input id="tpl-note" className="j-input" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
              </Field>
              <div className="j-note warn" role="status">Draft open. Changes stay local until you publish.{err && <div className="j-error" role="alert" style={{ marginTop: 6 }}>{err}</div>}</div>
            </div>
          )}
        </div>
      </Panel>

      <Panel flush title="Stages" sub="Stages 1 and 2 run in Sales before a job exists. Stage 10 is a conditional loop. Stage 13 is off unless commencement documents are in the agreed service.">
        <div className="j-tablewrap">
          <table className="j-table jp-tpl-table">
            <thead><tr><th>#</th><th>Stage</th><th>Default accountable role</th><th>Duration (working days)</th><th>Required exit items</th><th>Client wording</th><th>Flags</th></tr></thead>
            <tbody>
              {tpl.stages.map((s) => (
                <tr key={s.key}>
                  <td className="jp-narrow j-mono">{s.n}</td>
                  <td>{draft ? <input aria-label={"Stage " + s.n + " name"} className="j-input" value={s.name} onChange={(e) => patch(s.key, (x) => ({ ...x, name: e.target.value }))} /> : <span className="j-cell-main">{s.name}</span>}</td>
                  <td>{draft ? <input aria-label={"Stage " + s.n + " role"} className="j-input" value={s.role} onChange={(e) => patch(s.key, (x) => ({ ...x, role: e.target.value }))} /> : s.role}</td>
                  <td className="jp-narrow">{draft ? <input aria-label={"Stage " + s.n + " duration in working days"} type="number" min={0} max={200} className="j-input" value={s.days} onChange={(e) => patch(s.key, (x) => ({ ...x, days: Math.max(0, Math.round(+e.target.value || 0)) }))} /> : <span className="j-mono">{s.days}</span>}</td>
                  <td>{draft ? <textarea aria-label={"Stage " + s.n + " required exit items, one per line"} className="j-textarea" value={s.required.join("\n")} onChange={(e) => patch(s.key, (x) => ({ ...x, required: e.target.value.split("\n") }))} /> : <ul style={{ margin: 0, paddingLeft: 16 }}>{s.required.map((r) => <li key={r}>{r}</li>)}</ul>}</td>
                  <td>{draft ? <input aria-label={"Stage " + s.n + " client wording"} className="j-input" value={s.clientText} onChange={(e) => patch(s.key, (x) => ({ ...x, clientText: e.target.value }))} /> : "“" + s.clientText + "”"}</td>
                  <td>
                    {flags(s)}
                    {draft && !s.pre && (
                      <div className="j-stack" style={{ gap: 6, marginTop: 8 }}>
                        <label className="j-check"><input type="checkbox" checked={!!s.conditional} onChange={(e) => patch(s.key, (x) => ({ ...x, conditional: e.target.checked }))} />Conditional</label>
                        <label className="j-check"><input type="checkbox" checked={!!s.scoped} onChange={(e) => patch(s.key, (x) => ({ ...x, scoped: e.target.checked }))} />Scoped</label>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="j-grid j-grid-2">
        <Panel title="Version history" sub="Every published version is kept.">
          <div className="j-list">
            {d.templateHistory.slice().reverse().map((v) => (
              <div key={v.version + v.publishedAt} className="j-list-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="j-cell-main">{v.version}{v.version === d.template.version && <> <Badge tone="ok" icon="check">Current</Badge></>}</div>
                  <div className="j-cell-sub">Published {fmtDate(v.publishedAt)}. {v.note}</div>
                </div>
                <span className="j-small">{(byVersion.get(v.version) || []).length} jobs</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Which jobs use which version" sub="The template snapshot is fixed when a job is created.">
          <KV cols={1} items={[...byVersion.entries()].sort().map(([v, ids]) => [v + " (" + ids.length + " jobs)", ids.sort().join(", ")])} />
        </Panel>
      </div>
    </div>
  );
}
