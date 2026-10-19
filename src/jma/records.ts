/* Adapters that feed the stock Records views (file tree, directory, ontology
   legend) from the demo store, so Records stays the original Pulse screen while
   showing this practice's connected data. */
import type { DemoState } from "./types";
import { transact, logEvent, nextId, currentActorId } from "./store";
import * as S from "./selectors";
import { stageDef } from "./template";
import { fmtDateTime } from "./time";
import { go } from "./ui";

type TreeRow = {
  type: "folder" | "file"; id: string; name: string; depth: number; parent?: string; indexed?: boolean;
  path?: string; title?: string; facts?: [string, string][]; body?: string[]; links?: [string, string, () => void][];
};

export function jmaFileTree(d: DemoState): TreeRow[] {
  const vis = S.visibleProjectIds(d);
  const docs = S.visibleDocs(d);
  const rows: TreeRow[] = [];
  for (const p of Object.values(d.projects).filter((x) => vis.has(x.id)).sort((a, b) => a.id.localeCompare(b.id))) {
    const pdocs = docs.filter((x) => x.projectId === p.id);
    const vers = S.drawingsFor(d, p.id).flatMap((dw) => S.versionsFor(d, dw.id).map((v) => ({ dw, v })));
    if (!pdocs.length && !vers.length) continue;
    const fid = "f-" + p.id;
    rows.push({ type: "folder", id: fid, name: p.id + " · " + S.household(d, p.id), depth: 0 });
    for (const x of pdocs) {
      rows.push({ type: "file", id: x.id, name: x.name, depth: 1, parent: fid, indexed: !!x.asset,
        path: x.storage, title: x.name,
        facts: [["TYPE", x.type], ["ADDED", fmtDateTime(x.at)], ["VISIBILITY", x.visibility + (x.published ? " · published" : " · not published")], ["BY", S.staffName(d, x.uploadedBy)]],
        body: [
          x.asset ? "A sample file is attached and can be downloaded from the project record." : "Reference only. In production this links to the SharePoint location shown above; the demo does not connect to SharePoint.",
          x.visibility === "Client" ? "Published to the client portal for " + S.household(d, p.id) + "." : "Internal: excluded from the client portal and from the Philippines preview unless it is a drawing input.",
        ],
        links: [[p.id + " · " + S.household(d, p.id), "project", () => go("Projects", "all", { kind: "project", id: p.id })]] });
    }
    for (const { dw, v } of vers) {
      rows.push({ type: "file", id: v.id, name: dw.number + " Rev " + v.rev + ".svg", depth: 1, parent: fid, indexed: true,
        path: "Drawing register · " + dw.number, title: dw.number + " Rev " + v.rev + " · " + dw.title,
        facts: [["STATE", v.state], ["UPLOADED", fmtDateTime(v.uploadedAt)], ["RELEASED", v.releasedAt ? fmtDateTime(v.releasedAt) : "Not released"], ["AUTHOR", S.staffName(d, v.authorId)]],
        body: [v.changeSummary, v.state === "In office review" ? "Not client-visible until the office releases it." : v.state === "Superseded" ? "Kept in history; superseded for current review." : "Released version."],
        links: [["Open drawing", "drawing", () => go("Drawings", "register", { kind: "drawing", id: dw.id, versionId: v.id })], [p.id, "project", () => go("Projects", "all", { kind: "project", id: p.id })]] });
    }
  }
  const unfiled = docs.filter((x) => !x.projectId);
  if (unfiled.length && (d.persona.kind === "admin" || d.persona.kind === "mullingar")) {
    rows.push({ type: "folder", id: "f-unfiled", name: "Unfiled records", depth: 0 });
    for (const x of unfiled) rows.push({ type: "file", id: x.id, name: x.name, depth: 1, parent: "f-unfiled", indexed: false, path: x.storage, title: x.name,
      facts: [["TYPE", x.type], ["ADDED", fmtDateTime(x.at)], ["VISIBILITY", x.visibility], ["BY", S.staffName(d, x.uploadedBy)]],
      body: ["Created from a Records template in this demo. Link it to a project from the project record when the real model exists."], links: [] });
  }
  return rows;
}

/** Records → New record: creates an internal record from the chosen template. */
export function createRecordFromTemplate(name: string, template: string) {
  return transact((d) => {
    if (!name.trim()) return { ok: false, message: "Give the record a name first." };
    const id = nextId(d, "doc");
    d.documents[id] = { id, name: name.trim(), type: template + " record", storage: "Created in John Madden OS (demo, stored in this browser)", version: "1", visibility: "Internal", published: false, uploadedBy: currentActorId(d), at: d.now };
    logEvent(d, d.now, { kind: "staff", id: currentActorId(d), name: d.staff[currentActorId(d)]?.name || "Staff" }, "record.created", "Created “" + name.trim() + "” from the " + template + " template", { kind: "document", id, label: name.trim() }, [id]);
    return { ok: true, message: "“" + name.trim() + "” created under Records → Documents → Unfiled records.", id };
  });
}

/** [name, role, email, organisation, tag, colour, open] */
export function jmaContacts(d: DemoState): [string, string, string, string, string, string, () => void][] {
  const vis = S.visibleProjectIds(d);
  const out: [string, string, string, string, string, string, () => void][] = [];
  for (const c of Object.values(d.clients).sort((a, b) => a.household.localeCompare(b.household))) {
    const projects = Object.values(d.projects).filter((p) => p.clientId === c.id && vis.has(p.id));
    if (!projects.length) continue;
    for (const id of c.contactIds) {
      const ct = d.contacts[id];
      out.push([ct.name, ct.role + " contact", ct.email, c.household + " household · " + projects.map((p) => p.id).join(", "), stageDef(projects[0].stage).name.toLowerCase(), "#c9d8e8", () => go("Clients", "directory", { kind: "client", id: c.id })]);
    }
  }
  for (const l of S.openLeads(d)) out.push([l.name, "Prospect (" + l.source.toLowerCase() + ")", l.email, l.id + " · " + l.locality, "lead", "#e8d9b0", () => go("Sales", "enquiries", { kind: "lead", id: l.id })]);
  return out;
}

/** Cluster legend counts and graph totals from real records. Order matches CLUSTERS in data.js. */
export function jmaGraphStats(d: DemoState) {
  const counts = [
    Object.keys(d.clients).length + Object.keys(d.contacts).length + Object.keys(d.leads).length,
    Object.keys(d.projects).length,
    Object.keys(d.drawings).length + Object.keys(d.briefs).length,
    Object.keys(d.versions).length + Object.keys(d.amendments).length,
    Object.keys(d.tasks).length,
    Object.keys(d.approvals).length,
    Object.keys(d.documents).length + Object.keys(d.messages).length,
    Object.keys(d.staff).length,
  ];
  const rel =
    Object.keys(d.contacts).length + Object.keys(d.projects).length + Object.values(d.tasks).reduce((n, t) => n + (t.projectId ? 1 : 0) + (t.leadId ? 1 : 0) + 1 + t.deps.length + Object.keys(t.links).length, 0)
    + Object.keys(d.drawings).length + Object.keys(d.versions).length + Object.keys(d.amendments).length * 2 + Object.keys(d.approvals).length * 2
    + Object.values(d.documents).filter((x) => x.projectId).length + Object.values(d.messages).filter((x) => x.projectId || x.leadId).length
    + Object.values(d.briefs).filter((b) => b.assigneeId).length * 2 + Object.keys(d.quotes).length + Object.values(d.leads).filter((l) => l.projectId).length;
  return { counts, records: counts.reduce((a, b) => a + b, 0), relationships: rel };
}
