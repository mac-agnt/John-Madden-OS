/* Small display helpers shared by the Sales, Clients and Knowledge pages. */
import type { Channel, DemoState, Delivery, DepositStatus, ID, LeadSource, LeadStatus, Message, Quote, QuoteStatus, StageKey } from "../../types";
import { STAGES } from "../../template";
import { Badge, type Tone } from "../../kit";
import { fmtDateTime, fmtShortDate, fmtTime, TZ_OFFICE } from "../../time";
import "../../../styles/jma-scx.css";

/** Date and time, or a plain fallback (never a dash). */
export const when = (ts: number | null | undefined, fallback = "Not set") => (ts == null ? fallback : fmtDateTime(ts));
/** Date and time with seconds, for receipt and acknowledgement times. */
export const whenSecs = (ts: number | null | undefined, fallback = "Not recorded") => (ts == null ? fallback : fmtShortDate(ts) + ", " + fmtTime(ts, TZ_OFFICE, true));

export const SOURCES: LeadSource[] = ["Website", "Phone", "Email", "Referral", "Walk-in"];
const SOURCE_ICON: Record<LeadSource, string> = { Website: "link", Phone: "chat", Email: "send", Referral: "user", "Walk-in": "pin" };
export function SourceBadge({ source }: { source: LeadSource }) {
  return <Badge tone="info" icon={SOURCE_ICON[source]}>{source}</Badge>;
}
/** Whether a source gets the automated acknowledgement. */
export const isAutoSource = (s: LeadSource) => s === "Website" || s === "Email";

const LEAD_TONE: Record<LeadStatus, [Tone, string]> = {
  New: ["accent", "flag"], Contacted: ["info", "chat"], Qualified: ["info", "check"], "Quote sent": ["warn", "send"], Accepted: ["ok", "check"], Lost: ["neutral", "x"],
};
export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const [tone, icon] = LEAD_TONE[status];
  return <Badge tone={tone} icon={icon}>{status === "Accepted" ? "Accepted, converted" : status}</Badge>;
}

const QUOTE_TONE: Record<QuoteStatus, [Tone, string]> = {
  Draft: ["neutral", "edit"], Sent: ["warn", "send"], Accepted: ["ok", "check"], Declined: ["bad", "x"], Expired: ["neutral", "clock"],
};
export function QuoteStatusBadge({ status }: { status: QuoteStatus }) {
  const [tone, icon] = QUOTE_TONE[status];
  return <Badge tone={tone} icon={icon}>{status === "Accepted" ? "Accepted (simulated)" : status}</Badge>;
}

const DEPOSIT_TONE: Record<DepositStatus, [Tone, string]> = {
  "Not requested": ["neutral", "info"], Requested: ["warn", "clock"], "Received (simulation)": ["ok", "check"], Waived: ["info", "flag"],
};
export function DepositBadge({ status }: { status: DepositStatus }) {
  const [tone, icon] = DEPOSIT_TONE[status];
  return <Badge tone={tone} icon={icon}>{status === "Received (simulation)" ? "Received (simulation), no payment taken" : status}</Badge>;
}

const DELIVERY_TONE: Record<Delivery, [Tone, string]> = {
  Queued: ["neutral", "clock"], Sent: ["info", "send"], Delivered: ["ok", "check"], Failed: ["bad", "alert"], Retrying: ["warn", "refresh"],
};
export function DeliveryBadge({ state, internal }: { state: Delivery; internal?: boolean }) {
  if (internal) return <Badge tone="neutral" icon="lock">Not sent</Badge>;
  const [tone, icon] = DELIVERY_TONE[state];
  return <Badge tone={tone} icon={icon}>{state}{state === "Delivered" ? " (simulated receipt)" : ""}</Badge>;
}

const CHANNEL_ICON: Record<Channel, string> = { Email: "send", Portal: "layers", WhatsApp: "chat", SMS: "chat", Phone: "chat", "Internal note": "lock" };
export const isPreviewChannel = (c: Channel) => c === "WhatsApp" || c === "SMS";
export function ChannelBadge({ channel }: { channel: Channel }) {
  return <Badge tone="info" icon={CHANNEL_ICON[channel]}>{channel}{isPreviewChannel(channel) ? " · Simulated, provider to be selected" : ""}</Badge>;
}

/** The delivery log as written, step by step. Never claims a state the log does not hold. */
export function DeliveryLog({ m }: { m: Message }) {
  return (
    <ol className="jx-dlog">
      {m.deliveryLog.map((s, i) => (
        <li key={i}>
          <DeliveryBadge state={s.state} internal={m.audience === "Internal"} />
          <span className="j-small">{whenSecs(s.at)}{s.note ? " · " + s.note : ""}</span>
        </li>
      ))}
    </ol>
  );
}

export const plural = (n: number, one: string, many = one + "s") => n + " " + (n === 1 ? one : many);

/** The most recent quote for a lead. */
export function quoteFor(d: DemoState, leadId: ID): Quote | undefined {
  return Object.values(d.quotes).filter((q) => q.leadId === leadId).sort((a, b) => b.createdAt - a.createdAt)[0];
}

export const canEditKnowledge = (d: DemoState) => d.persona.kind === "admin" || d.persona.kind === "mullingar";
export const stageNames = (keys: StageKey[]) => (keys.length ? STAGES.filter((s) => keys.includes(s.key)).map((s) => s.n + ". " + s.name).join(", ") : "No stage linked");
