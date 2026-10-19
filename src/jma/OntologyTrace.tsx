/* Added to the stock ontology's left column: pick a project and walk its real
   chain Client → Project → Drawing → Revision → Amendment → Task → Approval.
   Each link opens the record; "Highlight" runs the graph's own path search. */
import { useState } from "react";
import { useDemo } from "./store";
import * as S from "./selectors";
import { openDetail } from "./ui";
import { stageDef } from "./template";

type Link = { rel: string; label: string; open: () => void; sub?: string };

export default function OntologyTrace({ onHighlight }: { onHighlight: (q: string) => void }) {
  const d = useDemo();
  const vis = S.visibleProjectIds(d);
  const projects = S.liveProjects(d).filter((p) => vis.has(p.id));
  const [pid, setPid] = useState(projects.find((p) => p.id === "JMA-26025")?.id || "JMA-26005");
  const p = d.projects[pid];
  const chain: Link[] = [];
  if (p) {
    const c = d.clients[p.clientId];
    chain.push({ rel: "Client", label: c.household + " household", sub: c.contactIds.map((x) => d.contacts[x].name).join(", "), open: () => openDetail({ kind: "client", id: c.id }) });
    if (p.leadId) chain.push({ rel: "Lead (history)", label: p.leadId + " · " + d.leads[p.leadId].source, open: () => openDetail({ kind: "lead", id: p.leadId! }) });
    chain.push({ rel: "Project", label: p.id + " · " + stageDef(p.stage).name, sub: "Template " + p.templateVersion, open: () => openDetail({ kind: "project", id: p.id }) });
    for (const dw of S.drawingsFor(d, p.id)) {
      chain.push({ rel: "Drawing", label: dw.number, sub: dw.title, open: () => openDetail({ kind: "drawing", id: dw.id }) });
      for (const v of S.versionsFor(d, dw.id)) {
        chain.push({ rel: "Revision", label: "Rev " + v.rev + " · " + v.state, sub: v.changeSummary, open: () => openDetail({ kind: "drawing", id: dw.id, versionId: v.id }) });
        for (const a of Object.values(d.amendments).filter((x) => x.versionId === v.id)) {
          chain.push({ rel: "Amendment", label: a.state + " · pinned on Rev " + v.rev, sub: a.text, open: () => openDetail({ kind: "drawing", id: dw.id, versionId: v.id }) });
          if (a.taskId && d.tasks[a.taskId]) chain.push({ rel: "Task", label: d.tasks[a.taskId].state + " · " + S.staffName(d, d.tasks[a.taskId].assigneeId), sub: d.tasks[a.taskId].title, open: () => openDetail({ kind: "task", id: a.taskId! }) });
          if (a.resolvedByVersionId) chain.push({ rel: "Resolved by", label: "Rev " + d.versions[a.resolvedByVersionId]?.rev, open: () => openDetail({ kind: "drawing", id: dw.id, versionId: a.resolvedByVersionId }) });
        }
        const ap = S.approvalFor(d, v.id);
        if (ap) chain.push({ rel: "Approval", label: "Rev " + v.rev + " approved by " + S.staffName(d, ap.actorId), sub: "Applies to this revision only", open: () => openDetail({ kind: "drawing", id: dw.id, versionId: v.id }) });
      }
    }
    const docs = S.visibleDocs(d).filter((x) => x.projectId === p.id).length;
    const msgs = Object.values(d.messages).filter((m) => m.projectId === p.id).length;
    chain.push({ rel: "Documents · Messages", label: docs + " documents · " + msgs + " messages", open: () => openDetail({ kind: "project", id: p.id, tab: "documents" }) });
  }
  return (
    <div style={{ padding: "14px 16px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", boxShadow: "var(--card-shadow)" }}>
      <div style={{ fontSize: 9, letterSpacing: "0.13em", color: "var(--faint)" }}>TRACE A PROJECT</div>
      <label className="j-sr" htmlFor="onto-trace">Project to trace</label>
      <select id="onto-trace" className="j-select" style={{ marginTop: 8, minHeight: 34, fontSize: 12 }} value={pid} onChange={(e) => setPid(e.target.value)}>
        {projects.map((x) => <option key={x.id} value={x.id}>{x.id} · {S.household(d, x.id)}</option>)}
      </select>
      <ol style={{ listStyle: "none", margin: "10px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {chain.map((l, i) => (
          <li key={i}>
            <button type="button" onClick={l.open} className="j-row" style={{ all: "unset", boxSizing: "border-box", display: "block", width: "100%", padding: "6px 8px", borderRadius: 8, cursor: "pointer", borderLeft: "2px solid var(--accent-line)" }}>
              <span style={{ display: "block", fontSize: 9.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--faint)" }}>{l.rel}</span>
              <span style={{ display: "block", fontSize: 12, color: "var(--ink)", overflowWrap: "anywhere" }}>{l.label}</span>
              {l.sub && <span style={{ display: "block", fontSize: 11, color: "var(--dim)", overflowWrap: "anywhere" }}>{l.sub}</span>}
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className="j-btn j-btn-secondary j-btn-sm" style={{ marginTop: 10, width: "100%" }} onClick={() => onHighlight("clients approvals")}>Highlight client to approval path</button>
    </div>
  );
}
