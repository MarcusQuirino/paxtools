---
description: Use Bun instead of Node.js, npm, pnpm, or vite.
globs: "*.ts, *.tsx, *.html, *.css, *.js, *.jsx, package.json"
alwaysApply: false
---

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## GitHub

Always use the `gh` CLI to interface with GitHub (PRs, issues, releases, etc.). Never use the GitHub web UI or direct API calls.

## Quality Checks

After any code changes, always run:
1. `bun test` — run the test suite
2. `bun run lint` — check for lint errors

Fix any failures before considering the task done.

## Changesets

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and changelog management. It is not published to npm, so never use `bun run release`.

Workflow:
1. After completing a feature or fix, run `bun run changeset` to record the change (choose `patch`, `minor`, or `major` and write a short description).
2. Before a release, run `bun run version` to consume pending changesets, bump `package.json`, and generate/update `CHANGELOG.md`.
3. Commit the resulting changes.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
