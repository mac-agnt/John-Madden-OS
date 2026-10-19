/* ⌘K search over the demo records, scoped to the previewed persona so the
   Philippines preview never surfaces quotes, fees or the client directory. */
import type { DemoState } from "./types";
import * as S from "./selectors";
import { stageDef } from "./template";
import { MODULES, go, openDetail, setStoryOpen } from "./ui";
import { AGENTS } from "./agents";
import { act } from "./store";

export type SearchItem = { title: string; meta: string; hint: string; glyph: string; go: () => void };
export type SearchGroup = { group: string; scope: string; items: SearchItem[] };

export function jmaSearch(d: DemoState, extra: { themeTitle: string; toggleTheme: () => void; newChat: () => void }): SearchGroup[] {
  const k = d.persona.kind;
  const office = k === "admin" || k === "mullingar";
  const vis = S.visibleProjectIds(d);
  const groups: SearchGroup[] = [];
  const actions: SearchItem[] = [
    { title: "Run the guided client story", meta: "Dunne enquiry to exact-version approval", hint: "DEMO", glyph: "action", go: () => setStoryOpen(true) },
    { title: extra.themeTitle, meta: "Appearance", hint: "ACTION", glyph: "action", go: extra.toggleTheme },
  ];
  if (office) actions.unshift({ title: "Start a new Home conversation", meta: "Clears the current thread", hint: "ACTION", glyph: "action", go: extra.newChat });
  if (office || k === "sales") actions.push({ title: "Simulate website enquiry", meta: "Sales · creates LEAD-009 once", hint: "ACTION", glyph: "action", go: () => { act.simulateWebsiteEnquiry(); go("Sales", "enquiries", { kind: "lead", id: "LEAD-009" }); } });
  groups.push({ group: "Actions", scope: "Actions", items: actions });
  if (office) groups.push({ group: "Agents", scope: "Agents", items: AGENTS.map((a) => ({ title: a.name, meta: a.purpose, hint: "AGENT", glyph: "agent", go: () => go("Agents", "overview", { kind: "agent", id: a.id }) })) });
  const tasks = S.openTasks(d).filter((t) => k === "philippines" ? t.assigneeId === d.persona.staffId : k === "sales" ? !!t.leadId : true);
  groups.push({ group: "Work", scope: "Work", items: tasks.sort((a, b) => a.due - b.due).map((t) => ({ title: t.title, meta: (t.projectId ? t.projectId + " · " : t.leadId ? t.leadId + " · " : "") + S.staffName(d, t.assigneeId) + (S.isOverdue(d, t) ? " · overdue" : ""), hint: "TASK", glyph: "task", go: () => go("Work", "tasks", { kind: "task", id: t.id }) })) });
  const rec: SearchItem[] = [];
  if (k !== "sales") {
    S.liveProjects(d).filter((p) => vis.has(p.id)).forEach((p) => rec.push({ title: p.id + " · " + (k === "philippines" ? p.locality : S.household(d, p.id)), meta: p.locality + " · " + stageDef(p.stage).name, hint: "PROJECT", glyph: "org", go: () => k === "philippines" ? go("Drawings", "queue") : go("Projects", "all", { kind: "project", id: p.id }) }));
    Object.values(d.drawings).filter((x) => vis.has(x.projectId)).forEach((x) => rec.push({ title: x.number, meta: x.title + " · " + (k === "philippines" ? d.projects[x.projectId].locality : S.household(d, x.projectId)), hint: "DRAWING", glyph: "page", go: () => go("Drawings", k === "philippines" ? "queue" : "register", { kind: "drawing", id: x.id }) }));
  }
  if (k !== "philippines") {
    Object.values(d.clients).filter((c) => Object.values(d.projects).some((p) => p.clientId === c.id)).forEach((c) => rec.push({ title: c.household + " household", meta: c.contactIds.map((x) => d.contacts[x].name).join(", ") + " · " + c.locality, hint: "CLIENT", glyph: "person", go: () => go("Clients", "directory", { kind: "client", id: c.id }) }));
    Object.values(d.leads).forEach((l) => rec.push({ title: l.id + " · " + l.name, meta: l.source + " · " + l.status + " · " + l.locality, hint: "LEAD", glyph: "person", go: () => go("Sales", "enquiries", { kind: "lead", id: l.id }) }));
  }
  groups.push({ group: "Records", scope: "Records", items: rec });
  groups.push({ group: "Pages", scope: "Pages", items: MODULES.filter((m) => m.personas.includes(k)).flatMap((m) => (m.tabs.length ? m.tabs : [{ id: "", label: m.label }]).map((t) => ({ title: m.label + (t.id ? " · " + t.label : ""), meta: "Open page", hint: "PAGE", glyph: "page", go: () => go(m.id, t.id || undefined) }))) });
  void openDetail;
  return groups;
}
