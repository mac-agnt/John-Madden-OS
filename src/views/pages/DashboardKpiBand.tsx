import { css, cat } from "../../runtime/template";
import KpiBackdrop from "./KpiBackdrop";
import { useDemo } from "../../jma/store";
import * as S from "../../jma/selectors";
import { go, setFilter } from "../../jma/ui";
import { KPI_DEFS } from "../../logic/data";

type Props = { v: any };

/* The four executive KPIs. Values are computed from the store on every render
   and each card opens the records behind it. Labels live in KPI_DEFS (data.js). */
export default function DashboardKpiBand({ v }: Props) {
  const d = useDemo();
  const c = S.counts(d);
  const att = S.attention(d);
  const ph = c.phOverdue;
  const cards = [
    { key: "live", value: c.live, hint: S.stageCounts(d).filter((x) => x.count).length + " stages in use", open: () => { setFilter("projects.attention", "all"); go("Projects", "all"); } },
    { key: "attention", value: c.attention, hint: att.map((a) => S.household(d, a.project.id)).join(", ") || "Nothing flagged", tone: c.attention ? "var(--warn)" : undefined, open: () => { setFilter("projects.attention", "attention"); go("Projects", "all"); } },
    { key: "review", value: c.awaitingReview, hint: "Released, no decision or change yet", open: () => go("Work", "approvals") },
    { key: "overdue", value: c.overdue, hint: ph + " Philippines · " + (c.overdue - ph) + " Mullingar", tone: c.overdue ? "var(--bad)" : undefined, open: () => { setFilter("work.due", "overdue"); go("Work", "tasks"); } },
  ];
  return (
    <div data-kpi-band="1" style={css(cat("position:relative;z-index:3;flex:none;width:100%;margin:0 auto;padding:22px 24px 18px;box-sizing:border-box;background:none;--kb:", v.kpiBackdrop))}>
      {v.kpiBackdropOn && <KpiBackdrop v={v} />}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 12, paddingBottom: 10, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px", minWidth: 0 }}>
          <div style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.13em", color: "var(--on-accent-2)" }}>EXECUTIVE · DEMO DATA</div>
          <div style={{ fontSize: "24px", fontWeight: 600, letterSpacing: "-.6px", marginTop: 6, color: "var(--ink)" }}>{v.dashTitle}</div>
        </div>
      </div>
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))", gap: 14, marginTop: 6 }}>
        {cards.map((k) => {
          const def = (KPI_DEFS as Record<string, { label: string; hint: string }>)[k.key];
          return (
            <button key={k.key} type="button" className="ixc j-kpi" onClick={k.open} aria-label={def.label + ": " + k.value + ". Open the records."}
              style={{ position: "relative", minWidth: 0, padding: "18px 20px 16px", textAlign: "left", background: "linear-gradient(160deg,rgba(255,255,255,.075),rgba(255,255,255,.015) 55%)", border: "1px solid rgba(255,255,255,.1)", borderRadius: "var(--card-r,20px)", color: "var(--ink)", cursor: "pointer", backdropFilter: "blur(22px) saturate(1.5)", boxShadow: "inset 0 1px 0 rgba(255,255,255,.12),0 10px 30px rgba(0,0,0,.22)", transition: "border-color .2s var(--ease)" }}>
              <div style={{ fontSize: "10.5px", fontWeight: 600, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--faint)" }}>{def.label}</div>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-1px", marginTop: 8, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: k.tone || "var(--ink)" }}>{k.value}</div>
              <div style={{ fontSize: 12, marginTop: 8, color: "var(--dim)", overflowWrap: "anywhere" }}>{k.hint}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: "var(--faint)" }}>{def.hint}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
