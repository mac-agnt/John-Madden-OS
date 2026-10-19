/* Knowledge: client FAQs, video guides and internal procedures, each linked to
   template stages. The client portal reads the same articles, so a published
   edit shows up there straight away. */
import { useState } from "react";
import type { Article } from "../types";
import { useDemo } from "../store";
import { MODULES, openDetail, tabOf, tabsFor, useUi } from "../ui";
import * as S from "../selectors";
import { Badge, Btn, Empty, Page, PageHead, Panel, SearchBox, Seg, rowProps } from "../kit";
import { stageDef } from "../template";
import { canEditKnowledge, plural, stageNames, when } from "./sales/shared";


export default function KnowledgePage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Knowledge")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Knowledge")) ? tabOf("Knowledge") : tabs[0].id;
  const edit = canEditKnowledge(d);
  return (
    <Page className="jx-scope">
      <PageHead
        title="Knowledge"
        sub={edit
          ? "Stage-specific help for clients and working instructions for staff. Published client articles appear in the portal at the stages they are linked to."
          : "Stage-specific help and working instructions. Read only for this role."}
        actions={edit && tab !== "videos" ? <Btn variant="primary" icon="plus" onClick={() => openDetail({ kind: "article", id: tab === "procedures" ? "new-procedure" : "new-faq" })}>{tab === "procedures" ? "New procedure" : "New FAQ"}</Btn> : undefined}
      />
      {tab === "faqs" && <ArticleList kind="faq" />}
      {tab === "videos" && <Videos />}
      {tab === "procedures" && <ArticleList kind="procedure" />}
    </Page>
  );
}

function ArticleList({ kind }: { kind: Article["kind"] }) {
  const d = useDemo();
  const [q, setQ] = useState("");
  const [state, setState] = useState<"all" | "published" | "draft">("all");
  const all = Object.values(d.articles).filter((a) => a.kind === kind).sort((a, b) => stageOrder(a) - stageOrder(b) || a.title.localeCompare(b.title));
  const term = q.trim().toLowerCase();
  const rows = all.filter((a) => (state === "all" || (state === "published") === a.published) && (!term || (a.title + " " + a.body + " " + stageNames(a.stages)).toLowerCase().includes(term)));
  const edit = canEditKnowledge(d);
  return (
    <Panel
      title={kind === "faq" ? "Client FAQs" : "Internal procedures"}
      sub={kind === "faq"
        ? plural(all.length, "article") + ". General guidance only: no definitive planning or legal advice, and no promised decision dates."
        : plural(all.length, "procedure") + ". Internal only; procedures can never be published to clients." + (edit ? "" : " Read only for this role.")}
      actions={<SearchBox value={q} onChange={setQ} placeholder="Search title, text or stage" label={"Search " + (kind === "faq" ? "FAQs" : "procedures")} />}
      flush>
      <div style={{ padding: "0 20px 12px" }}>
        <Seg label="Filter by state" value={state} onChange={setState}
          options={[{ id: "all", label: "All", count: all.length }, { id: "published", label: "Published", count: all.filter((a) => a.published).length }, { id: "draft", label: "Draft", count: all.filter((a) => !a.published).length }]} />
      </div>
      {rows.length === 0 ? <Empty title="Nothing matches" body="Clear the search or the filter." /> : (
        <div className="j-tablewrap" role="region" aria-label={kind === "faq" ? "FAQ list" : "Procedure list"} tabIndex={0}>
          <table className="j-table">
            <thead><tr><th>Title</th><th>Audience</th><th>Stages</th><th>State</th><th>Last updated</th></tr></thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} {...rowProps(() => openDetail({ kind: "article", id: a.id }), (edit ? "Edit " : "Read ") + a.title)}>
                  <td style={{ minWidth: 220 }}><div className="j-cell-main">{a.title}</div><div className="j-cell-sub">{a.body.slice(0, 90)}{a.body.length > 90 ? "..." : ""}</div>{a.video && <div className="j-cell-sub"><Badge tone="info" icon="play">Video: {a.video.label}</Badge></div>}</td>
                  <td><Badge tone={a.audience === "Client" ? "accent" : "neutral"} icon={a.audience === "Client" ? "eye" : "lock"}>{a.audience}</Badge></td>
                  <td style={{ minWidth: 180 }}><div className="j-cell-sub" style={{ marginTop: 0 }}>{stageNames(a.stages)}</div></td>
                  <td>{a.published ? <Badge tone="ok" icon="check">Published</Badge> : <Badge tone="warn" icon="edit">Draft</Badge>}</td>
                  <td><div className="j-cell-main">{S.staffName(d, a.updatedBy)}</div><div className="j-cell-sub">{when(a.updatedAt)}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

const stageOrder = (a: Article) => (a.stages.length ? Math.min(...a.stages.map((k) => stageDef(k).n)) : 99);

function Videos() {
  const d = useDemo();
  const vids = Object.values(d.articles).filter((a) => a.video && a.video.url && (a.audience === "Client" || d.persona.kind !== "client"));
  const edit = canEditKnowledge(d);
  if (!vids.length) return <Panel title="Video guides"><Empty title="No video guides yet" body={edit ? "Add an approved video URL, captions and a transcript to any article." : undefined} /></Panel>;
  return (
    <>
      {vids.map((a) => <VideoGuide key={a.id} a={a} edit={edit} />)}
    </>
  );
}

function VideoGuide({ a, edit }: { a: Article; edit?: boolean }) {
  const d = useDemo();
  const [failed, setFailed] = useState(false);
  const v = a.video!;
  return (
    <Panel title={a.title} sub={<>{v.label} · {stageNames(a.stages)} · {a.published ? "Published" : "Draft"} · updated {when(a.updatedAt)} by {S.staffName(d, a.updatedBy)}</>}
      actions={<>
        <Badge tone="info" icon="play">{v.label}</Badge>
        {edit && <Btn size="sm" icon="edit" onClick={() => openDetail({ kind: "article", id: a.id })}>Edit article</Btn>}
      </>}>
      <div className="j-stack">
        {failed ? (
          <div className="j-note warn" role="status">Video guide to be supplied. The walkthrough below covers the same steps.</div>
        ) : (
          <video className="jx-video" controls preload="metadata" onError={() => setFailed(true)} aria-label={a.title + ", " + v.label}>
            <source src={v.url} type="video/mp4" onError={() => setFailed(true)} />
            {v.captions && <track kind="captions" default src={v.captions} srcLang="en" label="English captions" />}
            Your browser cannot play this video. The transcript below covers the same steps.
          </video>
        )}
        <div className="j-small">Illustrative screens of the client portal with a fictional project. Captions are on by default.</div>
        <div>
          <h3 className="j-h3" style={{ marginBottom: 6 }}>Transcript</h3>
          <p className="jx-transcript" style={{ margin: 0 }}>{v.transcript}</p>
        </div>
      </div>
    </Panel>
  );
}
