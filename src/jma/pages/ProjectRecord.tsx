/* Body of the project record drawer (DetailHost draws the drawer and title). */
import { useEffect, useState } from "react";
import { useDemo } from "../store";
import * as S from "../selectors";
import { Empty, Tabs } from "../kit";
import Overview from "./projects/record/Overview";
import TasksTab from "./projects/record/TasksTab";
import { DocumentsTab, DrawingsTab, HistoryTab, MessagesTab } from "./projects/record/RecordTabs";
import ProgrammeGantt from "./projects/Gantt";
import "../../styles/jma-projects.css";

const TABS = ["overview", "programme", "drawings", "tasks", "documents", "messages", "history"] as const;
type TabId = (typeof TABS)[number];
const isTab = (t?: string): t is TabId => !!t && (TABS as readonly string[]).includes(t);

export default function ProjectRecord({ id, tab }: { id: string; tab?: string; versionId?: string }) {
  const d = useDemo();
  const [cur, setCur] = useState<TabId>(isTab(tab) ? tab : "overview");
  useEffect(() => { if (isTab(tab)) setCur(tab); }, [tab, id]);
  const p = d.projects[id];
  if (!p) return <Empty title="Project not found" body={id} />;

  const openTasks = Object.values(d.tasks).filter((t) => t.projectId === id && S.isOpen(t)).length;
  const msgs = Object.values(d.messages).filter((m) => m.projectId === id && m.delivery === "Failed").length;
  const labels: Record<TabId, string> = {
    overview: "Overview", programme: "Programme", drawings: "Drawings (" + S.drawingsFor(d, id).length + ")",
    tasks: "Tasks (" + openTasks + " open)", documents: "Documents", messages: "Messages" + (msgs ? " (" + msgs + " failed)" : ""), history: "History",
  };
  const shown = TABS.filter((t) => d.persona.kind !== "client" || t !== "tasks");

  return (
    <div className="j-stack jp-root">
      <Tabs label={"Sections of " + id} value={cur} onChange={(v) => setCur(v as TabId)} tabs={shown.map((t) => ({ id: t, label: labels[t] }))} />
      <div role="tabpanel" aria-label={labels[cur]}>
        {cur === "overview" && <Overview id={id} />}
        {cur === "programme" && <div className="j-panel"><div className="j-panel-body flush" style={{ paddingTop: 14 }}><ProgrammeGantt pid={id} /></div></div>}
        {cur === "drawings" && <DrawingsTab id={id} />}
        {cur === "tasks" && <TasksTab id={id} />}
        {cur === "documents" && <DocumentsTab id={id} />}
        {cur === "messages" && <MessagesTab id={id} />}
        {cur === "history" && <HistoryTab id={id} />}
      </div>
    </div>
  );
}
