/* Client-side pieces shared by the Clients page and the client record:
   one message entry, portal status lines and the portal preview switch. */
import type { Client, DemoState, Message } from "../../types";
import { act, useDemo } from "../../store";
import * as S from "../../selectors";
import { Badge, Btn, Icon, cls } from "../../kit";
import { stageDef } from "../../template";
import { fmtShortDate } from "../../time";
import { ChannelBadge, DeliveryBadge, DeliveryLog, whenSecs } from "./shared";

/** Projects of a household that the current persona may see. */
export function clientProjects(d: DemoState, clientId: string) {
  const vis = S.visibleProjectIds(d);
  return Object.values(d.projects).filter((p) => p.clientId === clientId && vis.has(p.id)).sort((a, b) => a.id.localeCompare(b.id));
}

/** Plain status line for a household, read from its records. */
export function portalStatus(d: DemoState, c: Client): string {
  const projects = clientProjects(d, c.id);
  if (!projects.length) return "No live project";
  const parts: string[] = [];
  for (const p of projects) {
    const reqs = Object.values(d.requests).filter((r) => r.projectId === p.id && (r.state === "Outstanding" || r.state === "Paused"));
    const doc = reqs.find((r) => r.kind === "Document");
    if (doc) { parts.push(doc.label + " outstanding"); continue; }
    if (p.stage === "review") {
      const dw = S.drawingsFor(d, p.id)[0];
      const v = dw ? S.latestReleased(d, dw.id) : undefined;
      const dec = reqs.find((r) => r.kind === "Decision");
      if (v) { parts.push("Rev " + v.rev + " issued" + (dec?.nextReminderAt ? ", reminder scheduled " + fmtShortDate(dec.nextReminderAt) : dec?.state === "Paused" ? ", reminders paused" : "")); continue; }
    }
    parts.push(stageDef(p.stage).clientText);
  }
  return parts.join("; ");
}

export const canOpenPortal = (d: DemoState) => d.persona.kind === "admin" || d.persona.kind === "mullingar";
export function openPortal(d: DemoState, clientId: string) {
  const c = d.clients[clientId];
  if (!c) return;
  act.setPersona({ kind: "client", clientId, contactId: c.contactIds[0] });
}

export function MessageItem({ m, showProject }: { m: Message; showProject?: boolean }) {
  const d = useDemo();
  const internal = m.audience === "Internal";
  const from = m.direction === "in" ? S.staffName(d, m.fromId) + " (client)" : m.automated ? "Workflow (simulated)" : S.staffName(d, m.fromId);
  const to = m.contactId ? d.contacts[m.contactId]?.name : undefined;
  const failed = m.delivery === "Failed";
  const head = (
    <div className="jx-msg-head">
      {internal ? <span className="jx-internal-label"><Icon name="lock" size={12} />Internal note · never shown to the client</span> : <>
        <ChannelBadge channel={m.channel} />
        <Badge tone="accent" icon="eye">Client</Badge>
        <Badge tone="neutral" icon={m.direction === "in" ? "back" : "arrow"}>{m.direction === "in" ? "Received from client" : "Sent to client"}</Badge>
        <Badge tone="neutral" icon={m.automated ? "bolt" : "user"}>{m.automated ? "Automated" : "Manual"}</Badge>
      </>}
      {showProject && m.projectId && <span className="j-small">{m.projectId} · {S.household(d, m.projectId)}</span>}
      <span className="j-small j-mono">{whenSecs(m.at)}</span>
    </div>
  );
  const body = (
    <>
      <div className="j-small">{from}{!internal && m.direction === "out" && to ? " to " + to : ""}</div>
      {m.subject && <div className="jx-msg-subject">{m.subject}</div>}
      <div className="jx-msg-body">{m.body}</div>
    </>
  );
  if (internal) {
    return <article className="j-note internal" aria-label="Internal note, never shown to the client">{head}{body}</article>;
  }
  return (
    <article className={cls("jx-msg", m.direction === "in" && "in", failed && "failed")}>
      {head}
      {body}
      <div className="j-row-wrap">
        <DeliveryBadge state={m.delivery} />
        {failed && <Btn size="sm" variant="primary" icon="refresh" onClick={() => act.retryMessage(m.id)}>Retry (simulated)</Btn>}
      </div>
      <details className="jx-fold">
        <summary><Icon name="down" size={12} />Delivery log ({m.deliveryLog.length} {m.deliveryLog.length === 1 ? "step" : "steps"})</summary>
        <DeliveryLog m={m} />
      </details>
    </article>
  );
}

export function PortalButton({ clientId, label, size = "sm" }: { clientId: string; label?: string; size?: "sm" | "md" }) {
  const d = useDemo();
  if (!canOpenPortal(d)) return null;
  return <Btn size={size} icon="eye" onClick={() => openPortal(d, clientId)}>{label || "Open portal state"}</Btn>;
}
