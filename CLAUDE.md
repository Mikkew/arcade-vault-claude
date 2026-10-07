# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

`arcade-vault` is a freshly scaffolded `create-next-app` project (single initial commit). `app/page.tsx` and the metadata in `app/layout.tsx` are still template boilerplate, so expect to replace them rather than build on them.

## Commands

```bash
npm run dev     # dev server at http://localhost:3000 (also regenerates the AGENTS.md block)
npm run build   # production build; also the main type-check step
npm run start   # serve the production build
npm run lint    # runs ESLint directly (flat config); `next lint` no longer exists
npx tsc --noEmit  # standalone type-check
```

There is no test runner configured yet.

## Stack and conventions

- **Next.js 16.3 (App Router only) + React 19.2.** The APIs differ from older Next.js versions. Before writing framework code, check the bundled docs in `node_modules/next/dist/docs/` (`01-app/` covers the App Router: getting-started, guides, api-reference).
- **Typed route helpers are global.** `LayoutProps<"/">` / `PageProps<"/route">` come from types Next generates into `.next/types` (included via `tsconfig.json`). They need no import, and they only resolve after `next dev` or `next build` has run.
- **Tailwind CSS v4**, configured CSS-first: there is no `tailwind.config.*`. Theme tokens live in `app/globals.css` under `@theme inline`, which maps the CSS variables `--background`/`--foreground` and the Geist font variables to Tailwind utilities (`bg-background`, `font-sans`, `font-mono`). Dark mode follows `prefers-color-scheme`. PostCSS uses `@tailwindcss/postcss`.
- **Fonts**: Geist and Geist Mono load through `next/font/google` in `app/layout.tsx` and are exposed as CSS variables on `<html>`.
- **Import alias**: `@/*` maps to the repo root (there is no `src/` directory).
- ESLint uses `eslint-config-next` core-web-vitals + typescript presets (`eslint.config.mjs`).

## Spec-driven workflow

The project ships two user-invoked skills (installed under `.agents/skills/` and symlinked into `.claude/skills/`, tracked in `skills-lock.json`):

- `/spec <feature>` designs a spec through clarifying questions and saves it to `specs/` (numbered `NN-name`). It does not write code.
- `/spec-impl <NN-spec-name>` implements a spec whose status is "Approved". It creates and switches to a branch named after the spec (unless `specs/.spec-config.yml` sets `AutoCreateBranch: false`), then implements step by step, pausing for diff review.

New features are expected to go through `/spec` and then `/spec-impl`. When a spec exists for the work, follow it.
