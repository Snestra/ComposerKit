# ComposerKit

A React component library built on shadcn/ui and Base UI, with a component gallery and a documentation site.

| Path | Package | What it is |
| --- | --- | --- |
| `packages/react` | `composerkit` | The components, hooks, utilities, global styles and design tokens (`DESIGN.md`). Published to npm as `composerkit` and imported inside the repo as `@workspace/react`. |
| `apps/docs` | `docs` | Fumadocs site and component gallery. Each page in `content/docs/components` shows the matching `/gallery/<name>` page in a frame. `/preview` and `/preferences` are the preview page and the preferences demo. |

## Develop

```bash
pnpm install
pnpm dev
```

The docs run on http://localhost:3003/docs, and the gallery pages on http://localhost:3003/gallery.

## Add a shadcn component

Run the CLI inside the react package, so the files land in `packages/react/src/components/ui`:

```bash
cd packages/react
pnpm dlx shadcn@latest add button
```

Import it from the package:

```tsx
import { Button } from "@workspace/react/components/ui/button";
```

## Registry

`apps/docs/registry.json` defines the shadcn registry. Its files come from `packages/react/src`. Build it with:

```bash
pnpm registry:build
```

The output goes to `apps/docs/public/r`. CI publishes that folder to GitHub Pages.

## Check

```bash
pnpm typecheck
pnpm lint
pnpm build
```

The gallery lives in `apps/docs/app/(gallery)` with its own root layout, so the library's global styles never load on a docs page. The docs and the gallery are two root layouts, so moving between them reloads the page.
