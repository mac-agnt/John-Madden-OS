/* The persistent, understated demo strip: what this is, the demo clock, the
   persona preview, and the guided client story with its reset. */
import { useState } from "react";
import { createPortal } from "react-dom";
import { act, PERSONAS, useDemo } from "./store";
import { setStoryOpen, useUi, go, resetUi } from "./ui";
import { STORY, runNextStep, storyIndex } from "./story";
import { Btn, Dialog, Icon, cls } from "./kit";
import { fmtDateTime, TZ_PH } from "./time";

export default function DemoBar() {
  const d = useDemo();
  const ui = useUi();
  const [confirmReset, setConfirmReset] = useState(false);
  const idx = storyIndex(d);
  const cur = STORY[idx];
  const pkey = JSON.stringify(PERSONAS.find((p) => p.persona.kind === d.persona.kind && p.persona.staffId === d.persona.staffId)?.persona || "");
  const isClient = d.persona.kind === "client";
  return (
    <>
      <div className="j-demobar" role="region" aria-label="Demo controls">
        <span className="j-demobar-tag"><Icon name="info" size={13} />Demo · fictional data · integrations simulated</span>
        <span className="j-clock" title={"Demo clock. Manila: " + fmtDateTime(d.now, TZ_PH)}><Icon name="clock" size={13} />{fmtDateTime(d.now)} Dublin</span>
        <span className="j-demobar-grow" />
        {!isClient && (
          <label className="j-demobar-tag">
            <span className="j-sr">Preview as</span>
            <Icon name="user" size={13} />
            <select value={pkey} onChange={(e) => { const p = PERSONAS.find((x) => JSON.stringify(x.persona) === e.target.value); if (p) { act.setPersona(p.persona); resetUi(); go(p.persona.kind === "philippines" ? "Drawings" : p.persona.kind === "sales" ? "Sales" : "Home"); } }} aria-label="Preview as persona">
              {PERSONAS.map((p) => <option key={p.label} value={JSON.stringify(p.persona)}>{p.label}</option>)}
            </select>
          </label>
        )}
        {isClient && <Btn size="sm" icon="back" onClick={() => { act.setPersona({ kind: "admin", staffId: "s-ciaran" }); go("Clients", "portal"); }}>Return to office preview</Btn>}
        <Btn size="sm" variant={ui.storyOpen ? "primary" : "secondary"} icon="play" onClick={() => setStoryOpen(!ui.storyOpen)} pressed={ui.storyOpen}>
          {idx >= STORY.length ? "Client story complete" : "Run client story · " + (idx + 1) + "/" + STORY.length}
        </Btn>
      </div>
      {ui.storyOpen && createPortal(
        <div className="j-story" role="dialog" aria-label="Guided client story">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div className="j-eyebrow">Guided story · Dunne, Tyrrellspass</div>
              <div className="j-small" style={{ marginTop: 3 }}>Each step uses the same actions as the page buttons. You can also click through by hand.</div>
            </div>
            <Btn size="sm" variant="ghost" icon="x" ariaLabel="Close story" onClick={() => setStoryOpen(false)} />
          </div>
          <div className="j-list" style={{ marginTop: 6 }}>
            {STORY.map((s, i) => {
              const done = s.done(d);
              const showGroup = i === 0 || STORY[i - 1].group !== s.group;
              return (
                <div key={i}>
                  {showGroup && <div className="j-eyebrow" style={{ padding: "10px 6px 4px" }}>{s.group} · {s.groupTitle}</div>}
                  <div className={cls("j-story-step", done && "done", i === idx && "cur")}>
                    <span className="j-story-dot">{done ? <Icon name="check" size={11} stroke={2.6} /> : i + 1}</span>
                    <span><span style={{ fontWeight: 500 }}>{s.title}</span>{i === idx && <span style={{ display: "block", marginTop: 2 }} className="j-small">{s.detail}</span>}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="j-row-wrap" style={{ marginTop: 12, justifyContent: "space-between" }}>
            <Btn variant="danger" size="sm" icon="refresh" onClick={() => setConfirmReset(true)}>Reset demo</Btn>
            <Btn variant="primary" icon="arrow" disabled={idx >= STORY.length} onClick={() => runNextStep()}>{cur ? "Run step " + (idx + 1) : "All steps done"}</Btn>
          </div>
        </div>, document.getElementById("jma-theme-root") || document.body
      )}
      <Dialog open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset the demo?"
        footer={<><Btn onClick={() => setConfirmReset(false)}>Cancel</Btn><Btn variant="danger" onClick={() => { act.reset(); resetUi(); setConfirmReset(false); go("Home"); }}>Reset to baseline</Btn></>}>
        <p className="j-text" style={{ margin: 0 }}>This restores the 19 October 09:00 baseline: 24 live projects, 8 open leads and the original clock. Every change made in this browser is cleared. It only affects this local demo; there is no real data behind it.</p>
      </Dialog>
    </>
  );
}
