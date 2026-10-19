/* Article editor and preview (drawer body). id "new-faq" or "new-procedure"
   starts a new article. Saving goes through act.saveArticle, which also
   refuses to publish an internal procedure to clients. */
import { useState } from "react";
import type { Article, StageKey } from "../types";
import { act, useDemo } from "../store";
import { openDetail } from "../ui";
import * as S from "../selectors";
import { Badge, Btn, Empty, Field, KV } from "../kit";
import { STAGES } from "../template";
import { canEditKnowledge, stageNames, when } from "./sales/shared";

export default function ArticleDetail({ id }: { id: string; tab?: string; versionId?: string }) {
  return <Editor key={id} id={id} />;
}

const RISKY = /\b(guarantee[ds]?|will be granted|will get (planning|permission)|definitely|certain to|decision (by|on|within)|within \d+ (days|weeks)|legally (required|binding)|you must legally)\b/i;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 28) || "article";

function Editor({ id }: { id: string }) {
  const d = useDemo();
  const existing = d.articles[id];
  const isNew = !existing && id.startsWith("new-");
  const kind: Article["kind"] = existing?.kind || (id === "new-procedure" ? "procedure" : "faq");
  const edit = canEditKnowledge(d);
  const blank: Article = { id, kind, title: "", body: "", audience: kind === "procedure" ? "Internal" : "Client", stages: [], published: false, updatedAt: d.now, updatedBy: d.persona.staffId || "s-ciaran" };
  const [a, setA] = useState<Article>(existing ? structuredClone(existing) : blank);
  const [hasVideo, setHasVideo] = useState(!!existing?.video);
  const [errors, setErrors] = useState<Partial<Record<"title" | "body" | "url" | "captions" | "transcript" | "form", string>>>({});

  if (!existing && !isNew) return <Empty title="Article not found" />;
  if (!edit) return isNew ? <Empty title="Read only" body="Only administrators and Mullingar staff can create articles." /> : <ReadView a={existing!} />;

  const set = <K extends keyof Article>(k: K, v: Article[K]) => setA((x) => ({ ...x, [k]: v }));
  const video = a.video || { url: "", captions: "", transcript: "", label: "Demo guide" };
  const setVideo = (patch: Partial<NonNullable<Article["video"]>>) => setA((x) => ({ ...x, video: { ...video, ...patch } }));
  const toggleStage = (k: StageKey) => set("stages", a.stages.includes(k) ? a.stages.filter((s) => s !== k) : STAGES.filter((s) => s.key === k || a.stages.includes(s.key)).map((s) => s.key));
  const urlOk = (u: string) => /^(\/|https:\/\/)\S+$/.test(u.trim());
  const risky = a.audience === "Client" && RISKY.test(a.title + " " + a.body);

  const save = () => {
    const er: typeof errors = {};
    if (!a.title.trim()) er.title = "Add a title.";
    if (!a.body.trim()) er.body = "Add the article text.";
    if (hasVideo) {
      if (!video.url.trim()) er.url = "Add the approved video URL, or untick the video.";
      else if (!urlOk(video.url)) er.url = "Use a site path starting with / or an https:// address on approved hosting.";
      if (video.captions.trim() && !urlOk(video.captions)) er.captions = "Use a site path starting with / or an https:// address.";
      if (video.url.trim() && !video.transcript.trim()) er.transcript = "A transcript is required when a video is set.";
    }
    setErrors(er);
    if (Object.keys(er).length) return;
    let newId = a.id;
    if (isNew) {
      const base = "kb-" + (kind === "faq" ? "faq" : "proc") + "-" + slug(a.title);
      newId = base; let n = 2;
      while (d.articles[newId]) newId = base + "-" + n++;
    }
    const out: Article = { ...a, id: newId, kind, title: a.title.trim(), body: a.body.trim(), audience: kind === "procedure" ? "Internal" : a.audience, video: hasVideo && video.url.trim() ? { url: video.url.trim(), captions: video.captions.trim(), transcript: video.transcript.trim(), label: video.label.trim() || "Demo guide" } : undefined };
    const r = act.saveArticle(out);
    if (!r.ok) { setErrors({ form: r.message }); return; }
    if (isNew) openDetail({ kind: "article", id: newId });
  };

  const dirty = !existing || JSON.stringify({ ...a, video: hasVideo ? a.video : undefined }) !== JSON.stringify(existing);

  return (
    <div className="j-stack jx-scope">
      <div className="j-row-wrap">
        <Badge tone={kind === "faq" ? "accent" : "neutral"} icon={kind === "faq" ? "eye" : "lock"}>{kind === "faq" ? "Client FAQ" : "Internal procedure"}</Badge>
        {existing ? (existing.published ? <Badge tone="ok" icon="check">Published</Badge> : <Badge tone="warn" icon="edit">Draft</Badge>) : <Badge tone="neutral" icon="plus">New, not saved</Badge>}
        {existing && <span className="j-small">Last updated {when(existing.updatedAt)} by {S.staffName(d, existing.updatedBy)}</span>}
      </div>

      <form className="j-stack" onSubmit={(e) => { e.preventDefault(); save(); }} noValidate>
        <Field label="Title" htmlFor="jx-a-title" error={errors.title}>
          <input id="jx-a-title" className="j-input" value={a.title} onChange={(e) => set("title", e.target.value)} data-autofocus aria-invalid={!!errors.title} />
        </Field>
        <Field label="Text" htmlFor="jx-a-body" error={errors.body} hint={a.audience === "Client" ? "Plain, general guidance. Do not give definitive planning or legal advice, and do not promise decision dates." : "Numbered steps work well for procedures."}>
          <textarea id="jx-a-body" className="j-textarea" rows={8} value={a.body} onChange={(e) => set("body", e.target.value)} aria-invalid={!!errors.body} />
        </Field>
        {risky && <div className="j-note warn" role="status">This text may read as a promise or as definitive advice. Consider softer wording, for example "the council may" rather than a firm outcome or date.</div>}
        <Field label="Audience" htmlFor="jx-a-aud" hint={kind === "procedure" ? "Internal procedures can never be published to clients." : a.audience === "Client" ? "Clients see it in the portal at the linked stages once published." : "Staff only. Never shown in the portal."}>
          <select id="jx-a-aud" className="j-select" value={kind === "procedure" ? "Internal" : a.audience} onChange={(e) => set("audience", e.target.value as Article["audience"])} disabled={kind === "procedure"}>
            <option value="Client" disabled={kind === "procedure"}>Client</option>
            <option value="Internal">Internal</option>
          </select>
        </Field>
        <fieldset className="j-field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="j-label" style={{ marginBottom: 6 }}>Linked stages</legend>
          <div className="jx-checks">
            {STAGES.map((s) => (
              <label key={s.key} className="j-check">
                <input type="checkbox" checked={a.stages.includes(s.key)} onChange={() => toggleStage(s.key)} />
                <span>{s.n}. {s.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <label className="j-check">
          <input type="checkbox" checked={a.published} onChange={(e) => set("published", e.target.checked)} />
          <span><b>Published</b><br /><span className="j-small">{a.audience === "Client" && kind === "faq" ? "Published client edits appear in the portal straight away. Untick to keep it as a draft." : "Published procedures are visible to staff only."}</span></span>
        </label>

        <label className="j-check">
          <input type="checkbox" checked={hasVideo} onChange={(e) => { setHasVideo(e.target.checked); if (e.target.checked && !a.video) setVideo({}); }} />
          <span><b>Attach an approved video</b><br /><span className="j-small">Optional. A transcript is required with any video.</span></span>
        </label>
        {hasVideo && (
          <div className="jx-form">
            <Field label="Video URL" htmlFor="jx-a-vurl" error={errors.url} hint="Approved hosting only, for example /demo/video/how-to-review-your-drawings.mp4">
              <input id="jx-a-vurl" className="j-input" value={video.url} onChange={(e) => setVideo({ url: e.target.value })} />
            </Field>
            <Field label="Captions URL (WebVTT)" htmlFor="jx-a-vtt" error={errors.captions}>
              <input id="jx-a-vtt" className="j-input" value={video.captions} onChange={(e) => setVideo({ captions: e.target.value })} />
            </Field>
            <Field label="Label" htmlFor="jx-a-vlabel" hint="Shown with the player, for example Demo guide.">
              <input id="jx-a-vlabel" className="j-input" value={video.label} onChange={(e) => setVideo({ label: e.target.value })} />
            </Field>
            <div className="jx-span">
              <Field label="Transcript" htmlFor="jx-a-tr" error={errors.transcript}>
                <textarea id="jx-a-tr" className="j-textarea" rows={5} value={video.transcript} onChange={(e) => setVideo({ transcript: e.target.value })} aria-invalid={!!errors.transcript} />
              </Field>
            </div>
          </div>
        )}

        {errors.form && <div className="j-note warn" role="alert">{errors.form}</div>}
        <div className="jx-formfoot">
          <Btn type="submit" variant="primary" icon="check" disabled={!dirty}>{isNew ? "Create article" : "Save changes"}</Btn>
          {existing && dirty && <Btn variant="ghost" onClick={() => { setA(structuredClone(existing)); setHasVideo(!!existing.video); setErrors({}); }}>Discard changes</Btn>}
          {!dirty && existing && <span className="j-small">No unsaved changes.</span>}
        </div>
      </form>

      <div>
        <h3 className="j-h3" style={{ marginBottom: 8 }}>{a.audience === "Client" && kind === "faq" ? "Preview as the client sees it" : "Staff preview"}</h3>
        <Preview a={{ ...a, audience: kind === "procedure" ? "Internal" : a.audience, video: hasVideo && video.url.trim() ? video : undefined }} />
      </div>
    </div>
  );
}

function Preview({ a }: { a: Article }) {
  const client = a.audience === "Client";
  return (
    <div className="jx-preview" aria-label="Article preview">
      {!client && <div className="j-note internal" style={{ marginBottom: 10 }}>Internal. Clients never see this.</div>}
      {client && !a.published && <div className="j-note warn" style={{ marginBottom: 10 }}>Draft. Clients do not see this until it is published.</div>}
      <h3>{a.title || "Untitled"}</h3>
      <p>{a.body || "No text yet."}</p>
      {a.video?.url && (
        <div style={{ marginTop: 12 }}>
          <video className="jx-video" controls preload="metadata" aria-label={(a.title || "Video") + ", " + (a.video.label || "video")}>
            <source src={a.video.url} />
            {a.video.captions && <track kind="captions" default src={a.video.captions} srcLang="en" label="English captions" />}
          </video>
          <div className="j-small" style={{ marginTop: 6 }}>{a.video.label || "Video"}. Transcript: {a.video.transcript || "not added"}</div>
        </div>
      )}
      <div className="j-small" style={{ marginTop: 12 }}>{client ? "Shown in the portal at: " : "Linked stages: "}{stageNames(a.stages)}</div>
    </div>
  );
}

function ReadView({ a }: { a: Article }) {
  const d = useDemo();
  return (
    <div className="j-stack jx-scope">
      <div className="j-note">Read only for this role. Administrators and Mullingar staff can edit.</div>
      <KV items={[
        ["Audience", a.audience],
        ["State", a.published ? "Published" : "Draft"],
        ["Stages", stageNames(a.stages)],
        ["Last updated", when(a.updatedAt) + " by " + S.staffName(d, a.updatedBy)],
      ]} />
      <Preview a={a} />
    </div>
  );
}
