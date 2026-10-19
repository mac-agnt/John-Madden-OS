/* One record drawer for the whole app. Any page opens a record with
   ui.openDetail / ui.go(..., detail); the body component per kind lives in pages/. */
import { useDemo } from "./store";
import { closeDetail, useUi } from "./ui";
import { Drawer, Empty, Btn, Badge } from "./kit";
import * as S from "./selectors";
import { stageDef } from "./template";
import ProjectRecord from "./pages/ProjectRecord";
import DrawingDetail from "./pages/DrawingDetail";
import LeadRecord from "./pages/LeadRecord";
import ClientRecord from "./pages/ClientRecord";
import TaskDetail from "./pages/TaskDetail";
import AgentProfile from "./pages/AgentProfile";
import EventDetail from "./pages/EventDetail";
import StaffDetail from "./pages/StaffDetail";
import ArticleDetail from "./pages/ArticleDetail";
import { fmtDateTime } from "./time";
import { AGENTS } from "./agents";

export default function DetailHost() {
  const d = useDemo();
  const ui = useUi();
  const det = ui.detail;
  if (!det) return null;
  let title = det.id, eyebrow = "", wide = false, body: JSX.Element | null = null, allowed = true;
  const vis = S.visibleProjectIds(d);
  switch (det.kind) {
    case "project": {
      const p = d.projects[det.id];
      allowed = !!p && vis.has(det.id);
      title = p ? det.id + " · " + S.household(d, det.id) + ", " + p.locality : det.id;
      eyebrow = p ? "PROJECT · " + stageDef(p.stage).name.toUpperCase() : "PROJECT";
      wide = true; body = <ProjectRecord id={det.id} tab={det.tab} />; break;
    }
    case "drawing": {
      const dw = d.drawings[det.id];
      allowed = !!dw && vis.has(dw.projectId);
      title = dw ? dw.number + " · " + dw.title : det.id; eyebrow = dw ? "DRAWING · " + dw.projectId + " " + (d.persona.kind === "philippines" ? d.projects[dw.projectId].locality : S.household(d, dw.projectId)) : "DRAWING";
      wide = true; body = <DrawingDetail id={det.id} versionId={det.versionId} />; break;
    }
    case "lead": {
      const l = d.leads[det.id]; allowed = !!l && (d.persona.kind === "admin" || d.persona.kind === "mullingar" || d.persona.kind === "sales");
      title = l ? det.id + " · " + l.name : det.id; eyebrow = l ? "LEAD · " + l.status.toUpperCase() : "LEAD"; body = <LeadRecord id={det.id} />; break;
    }
    case "client": {
      const c = d.clients[det.id]; allowed = !!c && Object.values(d.projects).some((p) => p.clientId === det.id && vis.has(p.id));
      title = c ? c.household + " household · " + c.locality : det.id; eyebrow = "CLIENT"; body = <ClientRecord id={det.id} />; break;
    }
    case "task": {
      const t = d.tasks[det.id];
      allowed = !!t && (d.persona.kind !== "philippines" || t.assigneeId === d.persona.staffId) && (d.persona.kind !== "client");
      title = t ? t.title : det.id; eyebrow = t ? "TASK · " + t.state.toUpperCase() : "TASK"; body = <TaskDetail id={det.id} />; break;
    }
    case "agent": { const a = AGENTS.find((x) => x.id === det.id); title = a ? a.name : det.id; eyebrow = "AGENT · SIMULATED"; body = <AgentProfile id={det.id} />; break; }
    case "event": { const e = d.events.find((x) => x.id === det.id); allowed = !!e && S.visibleEvents(d).some((x) => x.id === det.id); title = e ? e.summary : det.id; eyebrow = e ? "EVENT · " + fmtDateTime(e.at).toUpperCase() : "EVENT"; body = <EventDetail id={det.id} />; break; }
    case "staff": { const s = d.staff[det.id]; title = s ? s.name : det.id; eyebrow = s ? "STAFF · " + s.team.toUpperCase() : "STAFF"; body = <StaffDetail id={det.id} />; break; }
    case "article": { const a = d.articles[det.id]; allowed = !!a && (a.audience === "Client" || d.persona.kind !== "client"); title = a ? a.title : "New article"; eyebrow = a ? (a.kind === "faq" ? "CLIENT FAQ" : "INTERNAL PROCEDURE") : "KNOWLEDGE"; body = <ArticleDetail id={det.id} />; break; }
    case "document": {
      const x = S.visibleDocs(d).find((y) => y.id === det.id); allowed = !!x;
      title = x ? x.name : det.id; eyebrow = x ? "DOCUMENT · " + x.type.toUpperCase() : "DOCUMENT";
      body = x ? (
        <div className="j-stack">
          <div className="j-row-wrap"><Badge tone={x.visibility === "Client" ? "accent" : "neutral"} icon={x.visibility === "Client" ? "eye" : "lock"}>{x.visibility}{x.published ? " · published" : ""}</Badge></div>
          <div className="j-note">Stored at: {x.storage}. Proposed reference only; the demo does not connect to SharePoint.</div>
          <div className="j-small">Uploaded {fmtDateTime(x.at)} by {S.staffName(d, x.uploadedBy)} · version {x.version}</div>
          {x.asset ? <a className="j-btn j-btn-secondary" href={x.asset} download>Download sample file{x.size ? " (" + x.size + ")" : ""}</a> : <div className="j-small">No sample file attached to this reference.</div>}
          {x.projectId && <Btn onClick={() => { closeDetail(); setTimeout(() => import("./ui").then((u) => u.go("Projects", "all", { kind: "project", id: x.projectId! })), 0); }}>Open {x.projectId}</Btn>}
        </div>
      ) : null; break;
    }
  }
  return (
    <Drawer open onClose={closeDetail} title={allowed ? title : "Not available"} eyebrow={allowed ? eyebrow : undefined} wide={wide && allowed}>
      {allowed ? body : <Empty title="Not visible in this preview" body="This record is outside the previewed persona's scope. Switch back to the office preview to see it." />}
    </Drawer>
  );
}
