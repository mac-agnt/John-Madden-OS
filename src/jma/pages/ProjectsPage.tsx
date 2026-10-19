/* Projects module: run jobs, dependencies, milestones and project records.
   The shell draws the module tabs; this page renders the active one. */
import { useDemo } from "../store";
import * as S from "../selectors";
import { MODULES, tabOf, tabsFor, useUi } from "../ui";
import { Page, PageHead } from "../kit";
import AllProjects from "./projects/AllProjects";
import StageBoard from "./projects/StageBoard";
import ProgrammeTab from "./projects/ProgrammeTab";
import Templates from "./projects/Templates";
import "../../styles/jma-projects.css";

const SUB: Record<string, string> = {
  all: "Every live job with its stage, who is accountable, who holds the work now and what happens next.",
  board: "Jobs by stage, with gate progress and a controlled way to move them on.",
  programme: "Forecasts against baseline, fixed client and external dates, and the impact of a slip before you apply it.",
  templates: "The residential stage template. New versions apply to new jobs only.",
};

export default function ProjectsPage() {
  const d = useDemo();
  useUi();
  const mod = MODULES.find((m) => m.id === "Projects")!;
  const tabs = tabsFor(mod, d.persona.kind);
  const tab = tabs.some((t) => t.id === tabOf("Projects")) ? tabOf("Projects") : tabs[0].id;
  const c = S.counts(d);
  const label = tabs.find((t) => t.id === tab)?.label || "Projects";
  return (
    <Page className="jp-root">
      <PageHead title={label} sub={SUB[tab] + (tab === "all" || tab === "board" ? " " + c.live + " live, " + c.attention + " need attention." : "")} />
      {tab === "all" && <AllProjects />}
      {tab === "board" && <StageBoard />}
      {tab === "programme" && <ProgrammeTab />}
      {tab === "templates" && <Templates />}
    </Page>
  );
}
