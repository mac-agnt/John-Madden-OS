import { Fragment, type ReactNode } from "react";
import { arr, cat, css, txt } from "../../runtime/template";
import { useDemo } from "../../jma/store";
import * as S from "../../jma/selectors";
import { go, openDetail } from "../../jma/ui";
import { briefingLines } from "../../jma/agents";
import { dueLabel, fmtDateTime, fmtShortDate, fmtTime, ago, TZ_PH } from "../../jma/time";

type Props = { v: any };

/* Briefings, my work, what is coming up and recent work done by simulated
   automations. All of it is read from the store; the Home centre stays clean. */
function RailCard({ title, count, onRemove, edit, children, action }: { title: string; count?: ReactNode; onRemove?: () => void; edit?: boolean; children: ReactNode; action?: ReactNode }) {
  return (
    <section aria-label={title} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--card-r,18px)", boxShadow: "var(--card-shadow)", padding: "16px 18px 10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h2 style={{ flex: 1, margin: 0, fontSize: "13.5px", fontWeight: 600 }}>{title}</h2>
        {count != null && <span style={{ height: 24, display: "flex", alignItems: "center", padding: "0 10px", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: "var(--r-sm,9px)", fontSize: 11, color: "var(--dim)" }}>{count}</span>}
        {action}
        {edit && onRemove && <button type="button" className="ixd" onClick={onRemove} aria-label={"Remove " + title} style={{ width: 24, height: 24, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", color: "var(--dim)", cursor: "pointer" }}>×</button>}
      </div>
      <div style={{ marginTop: 8 }}>{children}</div>
    </section>
  );
}

const rowBtn: React.CSSProperties = { all: "unset", boxSizing: "border-box", display: "flex", gap: 10, alignItems: "flex-start", width: "100%", padding: "9px 0", borderTop: "1px solid var(--border)", cursor: "pointer", fontSize: "12.5px", lineHeight: 1.45, color: "var(--body)" };
const dot = (c: string) => <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: 7, background: c, flex: "none", marginTop: 6 }} />;

export default function HomeWidgetRail({ v }: Props) {
  const d = useDemo();
  const att = S.attention(d);
  const me = d.persona.staffId || "s-ciaran";
  const mine = S.openTasks(d).filter((t) => d.persona.kind === "admin" ? S.isOverdue(d, t) || t.due < d.now + 2 * 86400000 : t.assigneeId === me).sort((a, b) => a.due - b.due).slice(0, 6);
  const soon = d.now + 8 * 86400000;
  const coming = [
    ...Object.values(d.visits).filter((x) => x.state === "Scheduled" && x.at >= d.now && x.at < soon).map((x) => ({ at: x.at, text: "Site visit · " + S.household(d, x.projectId) + " (" + S.staffName(d, x.ownerId) + ")", go: () => openDetail({ kind: "project", id: x.projectId }) })),
    ...Object.values(d.programme).filter((x) => x.fixed && x.fixedStart! >= d.now && x.fixedStart! < soon).map((x) => ({ at: x.fixedStart!, text: x.label + " · " + S.household(d, x.projectId), go: () => go("Projects", "programme") })),
    ...Object.values(d.council).filter((x) => x.state === "Response in preparation").map((x) => ({ at: x.internalTarget, text: "Internal response target · " + S.household(d, x.projectId) + " (sample)", go: () => openDetail({ kind: "project", id: x.projectId }) })),
  ].sort((a, b) => a.at - b.at).slice(0, 5);
  const recent = S.visibleEvents(d).filter((e) => e.type === "drawing.released" || e.actor.kind === "agent" || e.actor.kind === "system" || e.status === "failed").slice(-6).reverse();
  return (
    <>
      <aside style={{"position":"relative","zIndex":"1","width":"352px","flex":"none","minHeight":"0","overflowY":"auto","display":"flex","flexDirection":"column","gap":"14px","padding":"2px 0 6px 20px"}}>
        <div style={{"flex":"0 0 auto","minWidth":"0","overflow":"hidden","display":"flex","flexWrap":"nowrap","alignItems":"center","justifyContent":"space-between","gap":"4px","padding":"2px 0 4px","fontFamily":"var(--mono)"}}>
          {arr(v.flipUnits).map((u: any, i15: number) => (
            <Fragment key={i15}>
              <div style={{"display":"flex","flexWrap":"nowrap","alignItems":"center","gap":"3px"}}>
                {arr(u?.tiles).map((t: any, i16: number) => (
                  <Fragment key={i16}>
                    {t?.isColon && (
                      <>
                        <div style={{"display":"flex","flexDirection":"column","gap":"3px","padding":"0 1px"}}>
                          <span style={{"width":"2.5px","height":"2.5px","borderRadius":"2px","background":"var(--accent)","animation":"tickPulse 1s ease-in-out infinite"}} />
                          <span style={{"width":"2.5px","height":"2.5px","borderRadius":"2px","background":"var(--accent)","animation":"tickPulse 1s ease-in-out .1s infinite"}} />
                        </div>
                      </>
                    )}
                    {t?.isTile && (
                      <>
                        <span style={css(cat("position:relative;display:flex;align-items:center;justify-content:center;min-width:", t?.w, ";height:", t?.h, ";padding:0 3px;border-radius:var(--r-sm,9px);background:var(--flap);border:1px solid var(--border);box-shadow:0 3px 8px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.13);font-size:", t?.size, ";font-weight:500;letter-spacing:-0.3px;color:", t?.color, ";overflow:hidden;perspective:100px"))}>
                          <span style={{"position":"absolute","left":"0","right":"0","top":"50%","height":"1px","background":"var(--flap-hinge)","zIndex":"4"}} />
                          {"\n"}
                          {txt(t?.v)}
                          {"\n"}
                          <span style={css(cat("position:absolute;top:0;left:0;right:0;height:50%;overflow:hidden;background:var(--flap);transform-origin:bottom center;backface-visibility:hidden;z-index:3;display:", t?.flapShow, ";animation:", t?.topAnim))}>
                            <span style={{"position":"absolute","top":"0","left":"0","right":"0","height":"200%","display":"flex","alignItems":"center","justifyContent":"center"}}>
                              {txt(t?.prev)}
                            </span>
                          </span>
                          <span style={css(cat("position:absolute;bottom:0;left:0;right:0;height:50%;overflow:hidden;background:var(--flap);transform-origin:top center;backface-visibility:hidden;z-index:3;display:", t?.flapShow, ";animation:", t?.botAnim))}>
                            <span style={{"position":"absolute","bottom":"0","left":"0","right":"0","height":"200%","display":"flex","alignItems":"center","justifyContent":"center"}}>
                              {txt(t?.v)}
                            </span>
                          </span>
                        </span>
                      </>
                    )}
                  </Fragment>
                ))}
              </div>
            </Fragment>
          ))}
        </div>
        <div style={{"display":"flex","alignItems":"center","gap":"8px","padding":"0 4px"}}>
          <span style={{"flex":"1","fontFamily":"var(--mono)","fontSize":"9.5px","letterSpacing":"0.12em","color":"var(--faint)"}}>
            {txt(v.widgetHint)}
          </span>
          <button className="ixm" onClick={v.toggleBgMenu} title="Change background" style={css(v.bgButtonStyle)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" style={css(v.bgPlusStyle)}>
              <path d="M12 5v14 M5 12h14" />
            </svg>
          </button>
          <button onClick={v.toggleWidgetEdit} style={css(cat("height:26px;display:flex;align-items:center;gap:6px;padding:0 11px;background:", v.widgetEditBg, ";border:1px solid ", v.widgetEditBorder, ";border-radius:var(--r-ctl,9px);font-size:11.5px;color:", v.widgetEditColor, ";cursor:pointer;transition:background .2s var(--ease),border-color .2s var(--ease)"))}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 20h4L19 9a2.4 2.4 0 0 0-3.4-3.4L4.6 16.6V20Z" />
            </svg>
            {txt(v.widgetEditLabel)}
          </button>
        </div>
        {v.widgetEdit && (
          <>
            <div style={{"padding":"14px 16px","background":"var(--surface)","border":"1px dashed var(--border-strong)","borderRadius":"var(--card-r,18px)","animation":"expandIn .28s var(--ease) both"}}>
              <div style={{"fontSize":"12.5px","color":"var(--dim)"}}>
                {"Add a widget"}
              </div>
              <div style={{"display":"flex","flexWrap":"wrap","gap":"7px","marginTop":"10px"}}>
                {arr(v.widgetChoices).map((w: any, i17: number) => (
                  <Fragment key={i17}>
                    <button className="ixe" onClick={w?.add} style={{"height":"30px","display":"flex","alignItems":"center","gap":"7px","padding":"0 12px","background":"var(--surface-2)","border":"1px solid var(--border)","borderRadius":"var(--r-ctl,9px)","fontSize":"12px","color":"var(--body)","cursor":"pointer","transition":"border-color .2s var(--ease),transform .18s var(--ease)"}}>
                      <span style={{"color":"var(--accent)"}}>
                        {"+"}
                      </span>
                      {txt(w?.label)}
                    </button>
                  </Fragment>
                ))}
                {v.noWidgetChoices && (
                  <>
                    <span style={{"fontSize":"12px","color":"var(--faint)"}}>
                      {"Every widget is on the board."}
                    </span>
                  </>
                )}
              </div>
            </div>
          </>
        )}
        {v.show?.inbox && (
          <RailCard title="Briefing" count={att.length + " need attention"} edit={v.widgetEdit} onRemove={v.removeInbox} action={<button type="button" className="j-btn j-btn-ghost j-btn-sm" onClick={() => go("Agents", "briefing")}>Open</button>}>
            {briefingLines(d).slice(0, 5).map((l, i) => (
              <button key={i} type="button" style={rowBtn} onClick={() => l.go && go(l.go[0] as never, l.go[1], l.go[2] ? { kind: "project", id: l.go[2] } : undefined)}>
                <span style={{ flex: "none", width: 78, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--faint)", paddingTop: 1 }}>{l.k}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{l.v}</span>
              </button>
            ))}
          </RailCard>
        )}
        {v.show?.work && (
          <RailCard title={d.persona.kind === "admin" ? "Due soon across the practice" : "My work"} count={mine.length} edit={v.widgetEdit} onRemove={v.removeWork}>
            {mine.length === 0 && <div className="j-small" style={{ padding: "8px 0" }}>Nothing due in the next two days.</div>}
            {mine.map((t) => {
              const late = S.isOverdue(d, t);
              return (
                <button key={t.id} type="button" style={rowBtn} onClick={() => openDetail({ kind: "task", id: t.id })}>
                  {dot(late ? "var(--bad)" : "var(--accent)")}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", color: "var(--ink)" }}>{t.title}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: late ? "var(--bad)" : "var(--dim)" }}>{(late ? "Overdue · " : "") + S.staffName(d, t.assigneeId) + " · " + dueLabel(t.due, d.now, d.staff[t.assigneeId]?.tz)}</span>
                  </span>
                </button>
              );
            })}
          </RailCard>
        )}
        {v.show?.visits && (
          <RailCard title="Coming up" count={coming.length} edit={v.widgetEdit} onRemove={v.removeVisits}>
            {coming.length === 0 && <div className="j-small" style={{ padding: "8px 0" }}>No visits, meetings or recorded dates in the next week.</div>}
            {coming.map((c, i) => (
              <button key={i} type="button" style={rowBtn} onClick={c.go}>
                <span style={{ flex: "none", width: 78, fontSize: 11.5, color: "var(--dim)" }}>{fmtShortDate(c.at)}<br />{fmtTime(c.at)}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{c.text}</span>
              </button>
            ))}
          </RailCard>
        )}
        {v.show?.activity && (
          <RailCard title="Releases and automation work" edit={v.widgetEdit} onRemove={v.removeActivity} action={<button type="button" className="j-btn j-btn-ghost j-btn-sm" onClick={() => go("Activity", "all")}>All</button>}>
            {recent.map((e) => (
              <button key={e.id} type="button" style={rowBtn} onClick={() => openDetail({ kind: "event", id: e.id })}>
                {dot(e.status === "failed" ? "var(--bad)" : e.status === "attention" ? "var(--warn)" : "var(--accent)")}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block" }}><span style={{ color: "var(--ink)" }}>{e.actor.name}</span> · {e.summary}</span>
                  <span style={{ display: "block", fontSize: 11, color: "var(--faint)" }}>{(e.status === "failed" ? "Failed · " : "") + ago(e.at, d.now) + " · " + fmtDateTime(e.at)}</span>
                </span>
              </button>
            ))}
          </RailCard>
        )}
      </aside>
    </>
  );
}
