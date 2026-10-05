# Fossil Design

An open-source design system for agentic coding. Tokens live in git and flow into CSS, typed React components, Figma variables and a Figma component library generated from code. Shared lint configs and docs bundled into the packages keep the UI that coding agents write on-system.

> **Status: pre-release, built in public.** The repository foundation and the token build are in place. Components, the Figma sync and the lint configs arrive phase by phase, as set out in the [PRD](./docs/PRD.md). Packages publish as `0.x` until the token taxonomy has survived a real migration.

## Why

Coding agents produce off-system UI in two different ways, and most design systems only address one of them.

1. **The agent doesn't know what exists,** so it invents. The fix is context: token and component metadata the agent can read.
2. **The agent knows and drifts anyway.** Its training pulls harder than your documentation, so it writes `bg-gray-100` with your tokens in plain view. The fix is constraint: make off-system values impossible to express.

Fossil does both. The usual approach is to allow any CSS and lint it afterwards. Fossil closes the surface instead: layout props accept only token keys, styles accept only semantic tokens, and lint covers what remains. Phase 7 then measures how often agents stay on-system with and without each layer, so the claim comes with a number.

## How it works

```
Design tokens (DTCG JSON in git, reviewed in pull requests)
 ├─▶ Figma Variables            values round-trip through the Figma MCP server
 └─▶ Style Dictionary build     one validated run
      ├─▶ tokens.css, tokens.json, tokens.ts
      └─▶ React components      CSS Modules, props typed to token keys
           ├─▶ npm packages, with Markdown docs for agents
           └─▶ Figma component library, generated from code
```

| Layer        | What Fossil does                                                                                                      |
| ------------ | --------------------------------------------------------------------------------------------------------------------- |
| Context      | An always-on `AGENTS.md` block, component docs bundled in the installed package, Figma variables with code syntax     |
| Constraint   | `Box` props typed to tokens, a Stylelint config that allows only semantic tokens, an ESLint rule against raw `<div>`s |
| Verification | Token build validation, interaction and accessibility tests, a check that the Figma library matches the code          |

Everything runs on a Figma Professional or Education plan and free tiers elsewhere: no Code Connect, no Variables REST API.

## Packages

| Package                                                          | What it is                                                                  | Status      |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------- |
| [`@fossil-design/tokens`](./packages/tokens)                     | DTCG token source and the build that turns it into CSS, JSON and TypeScript | Early (0.x) |
| [`@fossil-design/react`](./packages/react)                       | React components, precompiled to JavaScript and one stylesheet              | Early (0.x) |
| [`@fossil-design/eslint-config`](./packages/eslint-config)       | Keeps JSX on-system                                                         | Early (0.x) |
| [`@fossil-design/stylelint-config`](./packages/stylelint-config) | Keeps CSS on-system                                                         | Early (0.x) |
| [`@fossil-design/figma-sync`](./packages/figma-sync)             | Syncs tokens with Figma; runs from the repo, not published                  | Private     |

## Make it your own

Fossil is a template with a reference brand. To use it for your own brand, create a copy with GitHub's **Use this template** button, or fork it. Then set your system's name, CSS prefix and npm scope in [`fossil.config.json`](./fossil.config.json), replace the token values, and run the same pipeline against your own Figma file.

- **Use this template** gives you a fresh history, and the copy can be private.
- **Fork** keeps the link to this repository, so you can pull later fixes and send changes back. A fork of a public repository stays public.

A step-by-step adoption guide arrives with Phase 8.

## Development

You need Node 22.14 or later and pnpm 12.8.1, the version pinned in [`package.json`](./package.json).

```sh
pnpm install --frozen-lockfile
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

[`AGENTS.md`](./AGENTS.md) lists every command and the rules for contributing, for people and coding agents alike.

## Reasoning

Every decision has a written reason:

- [`docs/PRD.md`](./docs/PRD.md): the phases, tasks and exit criteria.
- [`docs/Learnings.md`](./docs/Learnings.md): the research behind each decision, including a survey of how Primer, Carbon, Atlassian, Spectrum, Polaris, Fluent and Material are built.
- [`docs/decisions/`](./docs/decisions): architecture decision records.

## License

MIT © 2026 Ibrahim Moazzam. See [LICENSE](./LICENSE).
