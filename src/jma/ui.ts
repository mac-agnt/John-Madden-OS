/* View state shared by the shell and the module pages: which top-bar tab is
   open per module, which record drawer is open, and page filters. It is kept
   apart from the demo store so a reset never fights with navigation. */
import { useSyncExternalStore } from "react";
import type { PersonaKind } from "./types";

export type ModuleId =
  | "Home" | "Agents" | "Dashboard" | "Projects" | "Drawings" | "Clients" | "Sales"
  | "Work" | "Knowledge" | "Records" | "Activity" | "Settings";

export type DetailKind = "project" | "lead" | "client" | "task" | "drawing" | "agent" | "event" | "staff" | "article" | "document";
export type Detail = { kind: DetailKind; id: string; tab?: string; versionId?: string } | null;

export interface ModuleDef {
  id: ModuleId; label: string; icon: string; group: string; hint?: string;
  tabs: { id: string; label: string }[];
  personas: PersonaKind[];
}

/* Icons are stroke paths in the Pulse icon family (24×24, 1.6 stroke). */
export const MODULE_ICONS: Record<string, string> = {
  projects: "M3.5 11.2 12 4.5l8.5 6.7 M5.8 9.6v9.9h12.4V9.6 M10 19.5v-5.2h4v5.2",
  drawings: "M4.5 4.5h15v15h-15z M4.5 9.5h6v10 M10.5 13.5h9 M14.5 4.5v9",
  clients: "M9 11a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 9 11Z M3.5 19.5c.6-3 2.8-4.7 5.5-4.7s4.9 1.7 5.5 4.7 M16 11.2a2.7 2.7 0 1 0 0-5.4 M17.2 14.9c1.8.4 3 1.9 3.4 4.6",
  sales: "M4 5h16l-6 7.2v5.6l-4 1.7v-7.3z",
  knowledge: "M5 4.5h5.5a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H5z M19 4.5h-5.5a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6H19z",
};

export const MODULES: ModuleDef[] = [
  { id: "Home", label: "Home", icon: "helios", group: "", tabs: [], personas: ["admin", "mullingar"] },
  { id: "Agents", label: "Agents", icon: "navAgents", group: "", tabs: [
    { id: "overview", label: "Agent overview" }, { id: "briefing", label: "Briefing" }, { id: "watchdog", label: "Ops Watchdog" }, { id: "activity", label: "Agent activity" }], personas: ["admin", "mullingar"] },
  { id: "Dashboard", label: "Dashboard", icon: "navDash", group: "OVERSIGHT", tabs: [
    { id: "executive", label: "Executive" }, { id: "delivery", label: "Delivery" }, { id: "workload", label: "Team workload" }, { id: "sales", label: "Sales performance" }], personas: ["admin", "mullingar"] },
  { id: "Projects", label: "Projects", icon: "projects", group: "DELIVERY", tabs: [
    { id: "all", label: "All projects" }, { id: "board", label: "Stage board" }, { id: "programme", label: "Programme" }, { id: "templates", label: "Stage templates" }], personas: ["admin", "mullingar"] },
  { id: "Drawings", label: "Drawings", icon: "drawings", group: "DELIVERY", tabs: [
    { id: "register", label: "Drawing register" }, { id: "queue", label: "Philippines queue" }, { id: "review", label: "Office review" }, { id: "amendments", label: "Amendments" }], personas: ["admin", "mullingar", "philippines"] },
  { id: "Work", label: "Work", icon: "navWork", group: "DELIVERY", tabs: [
    { id: "tasks", label: "Tasks" }, { id: "approvals", label: "Approvals" }, { id: "workflows", label: "Workflows" }, { id: "schedules", label: "Schedules" }], personas: ["admin", "mullingar", "sales", "philippines"] },
  { id: "Clients", label: "Clients", icon: "clients", group: "CLIENTS AND SALES", tabs: [
    { id: "directory", label: "Client directory" }, { id: "messages", label: "Messages" }, { id: "waiting", label: "Waiting on clients" }, { id: "portal", label: "Portal preview" }], personas: ["admin", "mullingar", "sales"] },
  { id: "Sales", label: "Sales", icon: "sales", group: "CLIENTS AND SALES", tabs: [
    { id: "pipeline", label: "Pipeline" }, { id: "enquiries", label: "Enquiries" }, { id: "quotes", label: "Quotes" }, { id: "followups", label: "Follow-ups" }], personas: ["admin", "mullingar", "sales"] },
  { id: "Knowledge", label: "Knowledge", icon: "knowledge", group: "REFERENCE", tabs: [
    { id: "faqs", label: "Client FAQs" }, { id: "videos", label: "Video guides" }, { id: "procedures", label: "Internal procedures" }], personas: ["admin", "mullingar", "sales", "philippines"] },
  { id: "Records", label: "Records", icon: "navRecords", group: "REFERENCE", tabs: [], personas: ["admin", "mullingar"] },
  { id: "Activity", label: "Activity", icon: "pulseLine", group: "REFERENCE", tabs: [
    { id: "all", label: "Everything" }, { id: "people", label: "People" }, { id: "agents", label: "Agents" }, { id: "systems", label: "Systems" }, { id: "attention", label: "Needs attention" }], personas: ["admin", "mullingar", "sales", "philippines"] },
  { id: "Settings", label: "Settings", icon: "navAdmin", group: "", tabs: [
    { id: "organisation", label: "Organisation" }, { id: "access", label: "Teams and access" }, { id: "systems", label: "Systems" }, { id: "rules", label: "Workflow rules" }, { id: "templates", label: "Message templates" }, { id: "governance", label: "Governance and AI" }, { id: "experience", label: "Experience" }], personas: ["admin", "mullingar", "sales", "philippines"] },
];

/** What a persona is allowed to open in the preview (some tabs narrow further). */
export const PERSONA_TABS: Partial<Record<PersonaKind, Partial<Record<ModuleId, string[]>>>> = {
  philippines: { Drawings: ["queue"], Work: ["tasks"], Knowledge: ["procedures"], Activity: ["all"], Settings: ["experience"] },
  sales: { Work: ["tasks", "schedules"], Clients: ["directory", "messages", "waiting"], Knowledge: ["faqs", "videos", "procedures"], Activity: ["all", "people"], Settings: ["experience"] },
  mullingar: { Settings: ["organisation", "access", "systems", "rules", "templates", "governance", "experience"] },
};

export function tabsFor(m: ModuleDef, persona: PersonaKind) {
  const allow = PERSONA_TABS[persona]?.[m.id];
  return allow ? m.tabs.filter((t) => allow.includes(t.id)) : m.tabs;
}

type UiState = { tabs: Partial<Record<ModuleId, string>>; detail: Detail; filters: Record<string, unknown>; focusProject?: string; storyOpen: boolean };
let ui: UiState = { tabs: {}, detail: null, filters: {}, storyOpen: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getUi = () => ui;
export const subscribeUi = (fn: () => void) => { listeners.add(fn); return () => listeners.delete(fn); };
export const useUi = () => useSyncExternalStore(subscribeUi, getUi, getUi);

let navigator: ((page: ModuleId) => void) | null = null;
let currentPage: ModuleId = "Home";
/** PulseLogic registers how to change page, and reports the current one. */
export function registerNavigator(fn: (page: ModuleId) => void) { navigator = fn; }
export function reportPage(p: ModuleId) { currentPage = p; }
export const getPage = () => currentPage;

export function tabOf(m: ModuleId): string {
  const def = MODULES.find((x) => x.id === m);
  return ui.tabs[m] || def?.tabs[0]?.id || "";
}
export function setTab(m: ModuleId, tab: string) { ui = { ...ui, tabs: { ...ui.tabs, [m]: tab } }; emit(); }

/** Go to a module (and tab), optionally opening a record drawer. */
export function go(m: ModuleId, tab?: string, detail?: Detail) {
  ui = { ...ui, tabs: tab ? { ...ui.tabs, [m]: tab } : ui.tabs, detail: detail === undefined ? null : detail };
  emit();
  navigator?.(m);
}
export function openDetail(detail: Detail) { ui = { ...ui, detail }; emit(); }
export function closeDetail() { ui = { ...ui, detail: null }; emit(); }
export function setFilter(key: string, value: unknown) { ui = { ...ui, filters: { ...ui.filters, [key]: value } }; emit(); }
export function getFilter<T>(key: string, fallback: T): T { return (key in ui.filters ? ui.filters[key] : fallback) as T; }
export function setStoryOpen(open: boolean) { ui = { ...ui, storyOpen: open }; emit(); }
export function resetUi() { ui = { tabs: {}, detail: null, filters: {}, storyOpen: ui.storyOpen }; emit(); }
