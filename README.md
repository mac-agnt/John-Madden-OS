# John Madden OS (demo)

A clickable, frontend-only demonstration of John Madden & Associates' residential project operation, built on the Pulse v5 Harbour template. All operating data is fictional; integrations are simulated. See `docs/PRD.md` for the draft PRD, the presentation route and the assumptions that need Ciaran's confirmation.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build      # type-check + production build into dist/
```

## What's in it

| Area | Where |
| --- | --- |
| Demo model, fixtures, domain actions, selectors | `src/jma/` (`types.ts`, `seed.ts`, `store.ts`, `selectors.ts`) |
| Module pages and record drawers | `src/jma/pages/` |
| Guided Dunne story | `src/jma/story.ts` (demo strip → Run client story) |
| Shared UI kit on the Pulse tokens | `src/jma/kit.tsx`, `src/styles/jma.css` |
| Pulse shell, Home chat, Records and ontology | `src/views/`, `src/logic/PulseLogic.js`, `src/logic/data.js` |
| Sample drawings, documents, video guide | `public/demo/` |
| Theme tokens (`jma` dark, slate light) | `src/styles/pulse.css` |

State lives in one store and persists to this browser's localStorage. "Reset demo" restores the 19 October 2026 09:00 baseline.

Customising rules for the template are in `CLAUDE.md`. Don't run `npm run import-design` on this copy: it overwrites the customised views and logic.
