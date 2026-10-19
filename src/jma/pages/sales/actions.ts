/* Domain actions owned by the Sales, Clients and Knowledge modules. They go
   through transact() so the store stays the one place state changes. */
import type { Lead, LeadSource } from "../../types";
import { transact, logEvent, newTaskIn, currentActorId, type ActionResult } from "../../store";
import { addWorkingDays, atLocal, fmtDateTime } from "../../time";

/**
 * Manual capture of a phone, walk-in, email or referral enquiry.
 * Same rules as act.createManualLead (required fields, duplicate detection by
 * email, linking an existing client who enquires about another site), with one
 * difference: LEAD-009 is reserved for the guided Dunne website enquiry, so a
 * hand-recorded lead never takes that number and the story keeps working.
 */
export function recordManualLead(input: { name: string; locality: string; source: LeadSource; email: string; phone: string; notes: string }): ActionResult {
  return transact((d) => {
    if (!input.name.trim() || !input.locality.trim()) return { ok: false, message: "Name and site locality are required." };
    if (!input.email.trim() && !input.phone.trim()) return { ok: false, message: "Add an email or a phone number so someone can respond." };
    const email = input.email.trim().toLowerCase();
    const dupLead = email ? Object.values(d.leads).find((l) => l.email.toLowerCase() === email && l.status !== "Lost" && l.status !== "Accepted") : undefined;
    if (dupLead) return { ok: false, message: "Possible duplicate: " + dupLead.id + " " + dupLead.name + " already uses this email. Open that lead instead.", id: dupLead.id };
    const client = email ? Object.values(d.contacts).find((c) => c.email.toLowerCase() === email) : undefined;
    let num = Object.keys(d.leads).length + 1;
    const taken = (n: number) => !!d.leads["LEAD-" + String(n).padStart(3, "0")] || (n === 9 && !d.leads["LEAD-009"]);
    while (taken(num)) num++;
    const id = "LEAD-" + String(num).padStart(3, "0");
    const ownerId = "s-niamh";
    const lead: Lead = {
      id, name: input.name.trim(), locality: input.locality.trim(), source: input.source, status: "New", receivedAt: d.now, ownerId,
      email: input.email.trim(), phone: input.phone.trim(), requestedService: "One-off house design", notes: input.notes.trim(),
      nextContactAt: atLocal(addWorkingDays(d.now, 1), 12), followUpReason: "Qualify requirements and site", duplicateOfClientId: client?.clientId,
    };
    d.leads[id] = lead;
    newTaskIn(d, { title: "Follow up: " + lead.name, kind: "followup", leadId: id, assigneeId: ownerId, ownerId, team: "Mullingar", priority: "Medium", due: lead.nextContactAt!, state: "Open", deps: [], links: {} });
    const actor = currentActorId(d);
    const household = client ? d.clients[client.clientId]?.household : undefined;
    logEvent(d, d.now, { kind: "staff", id: actor, name: d.staff[actor]?.name || "Staff" }, "lead.created",
      input.source + " enquiry recorded manually: " + lead.name + (household ? " (existing client " + household + ", new site)" : ""),
      { kind: "lead", id, label: id + " " + lead.name });
    const manual = input.source === "Phone" || input.source === "Walk-in";
    return {
      ok: true, id,
      message: id + " recorded. " + (manual ? "Manual channel: no automated acknowledgement. " : "") + (household ? "Linked to existing client " + household + " as a new site." : ""),
    };
  });
}

/** The quote form lets staff choose an expiry; the store defaults to 30 days, so set it afterwards. */
export function setQuoteExpiry(qid: string, expiresAt: number): ActionResult {
  return transact((d) => {
    const q = d.quotes[qid];
    if (!q) return { ok: false, message: "Quote not found." };
    if (q.status !== "Draft" && q.status !== "Sent") return { ok: true, message: qid + " expiry unchanged." };
    q.expiresAt = expiresAt;
    return { ok: true, message: qid + " saved. Expires " + fmtDateTime(expiresAt) + ". Demo fee; tax treatment to confirm.", id: qid };
  });
}
