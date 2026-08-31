# Contributing

This is a personal local checkout, not a public project.
There is no git remote, no fork, and no pull request process.
"Contributing" here just means editing your own copy and keeping it healthy.

## What this repo is

Showme is a local fork of lavish-axi by Kun Chen, used under the MIT license.
See `LICENSE` for the original copyright.

This fork removes the parts that sent data off your machine: usage tracking, hosted sharing to a third-party website, and automatic network binding beyond your own computer.

It is deliberately not published to npm (Node Package Manager, the public place JavaScript packages are downloaded from).
`package.json` sets `"private": true`, so a publish would be refused.
Never install or update this tool from the npm registry: no `npm install -g showme`, no `npx showme`.
That name belongs to somebody else's package.
Build it from this checkout instead.
(`npm` itself still has to be installed, because `pnpm run check` calls `npm run` internally.)

## Setup

You need Node 22 or newer and `pnpm` (a package manager for JavaScript projects).

```sh
pnpm install
pnpm run build
```

`pnpm run build` bundles the command-line tool, and every package it depends on, into a single `dist/cli.mjs`, then copies the browser files the server serves (the chrome client, its CSS, the design assets, and the whiteboard bundle) into `dist/`.
Because the dependencies are bundled in, `dist/` runs on its own with no `node_modules` anywhere near it.
Treat all of `dist/` as the build output, not just the one file.
Run it with `node <path-to-this-repo>/dist/cli.mjs`, or put a small launcher script on your `PATH` that does the same.

## Before you commit

Run the full check:

```sh
pnpm run check
```

That one command runs, in order: `build`, `lint`, `format:check`, `typecheck` (TypeScript checking the JavaScript files), the test suite, and the freshness checks for the generated skill and plugin files.
If any step fails, fix it before committing.

You can also run the pieces on their own: `pnpm run lint`, `pnpm run format:check`, `pnpm run typecheck`, `pnpm test`.
To run one test file: `node --test test/server.test.js`.

Five real-browser suites are skipped by default.
Run them with `SHOWME_BROWSER_E2E=1 pnpm test`, which needs the `chrome-devtools-axi` tool installed.

## House rules

- Do not hand-edit `CHANGELOG.md`.
  It is upstream history from the original project and is left exactly as it was.
- Do not hand-edit `skills/showme/SKILL.md`.
  It is generated from `src/skill.js` by `pnpm run build:skill`.
  Change the source, then regenerate.
- Do not hand-edit the root `plugin.json`.
  It is generated from `package.json` by `pnpm run build:plugin`.
  Change the source, then regenerate.
- Commit `dist/` whenever you change anything under `src/` or `bin/`.
  It is checked in on purpose: installing this as a Claude Code plugin is a plain `git clone`, which never runs a build or an install, so `dist/` is the only thing that actually runs on another machine.
  `pnpm run build` bundles every dependency into `dist/cli.mjs`, so it needs no `node_modules` beside it.
  `test/dist-standalone.test.js` runs the built file with no dependencies present, and CI fails if `dist/` does not match the source it was built from.
- `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json` are the Claude Code plugin manifests, and they are hand-maintained.
  No build step or check covers them, so if you bump the version in `package.json`, bump it in those two files by hand as well.
- `.github/workflows/ci.yml` is left over from the original project.
  It never runs here because there is no remote, and it does not include the skill and plugin freshness checks, so `pnpm run check` is the real gate.
- Use TDD (Test-Driven Development, meaning you write a failing test first) for bug fixes.
  Reproduce the bug in a test, watch it fail, then fix it.
- Node 22+, ESM-only JavaScript (ES Modules, the `import`/`export` style).
  There is no TypeScript source; the `.js` files are type-checked in `checkJs` mode.
