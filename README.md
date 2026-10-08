# Fossil Design

[![CI](https://github.com/ibrahimmoazzam/fossil-design/actions/workflows/ci.yml/badge.svg)](https://github.com/ibrahimmoazzam/fossil-design/actions/workflows/ci.yml) [![npm](https://img.shields.io/npm/v/@fossil-design/react?label=%40fossil-design%2Freact)](https://www.npmjs.com/package/@fossil-design/react) [![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

An open-source agentic design system: a design system built for AI agents to stay on-system from design to code. Tokens live in git and flow into CSS, typed React components, Figma variables and a Figma component library generated from code. Shared lint configs, docs bundled into the packages and guidelines for Figma Make keep what coding agents and Make generate on-system.

It ships with a reference brand, and it's a template: [fork it, rename it and replace the token values](https://fossil.ibrahimmoazzam.com/?path=/docs/adopt-fossil-for-your-brand--docs), and the same pipeline becomes your brand's design system. Its components can also be [rebuilt on a headless library](#bring-your-own-headless-library) such as [Base UI](https://base-ui.com) or [Headless UI](https://headlessui.com), without changing their props.

**Docs: [fossil.ibrahimmoazzam.com](https://fossil.ibrahimmoazzam.com)**, with a [getting started guide](https://fossil.ibrahimmoazzam.com/?path=/docs/getting-started--docs), every component's props, variants and examples, the [foundations](https://fossil.ibrahimmoazzam.com/?path=/docs/foundations-overview--docs), and the [reasoning behind each decision](https://fossil.ibrahimmoazzam.com/?path=/docs/architecture-key-decisions--docs).

> **Status: early, built in public.** The packages are on npm as `0.x`, and stay there until the token taxonomy has survived a real migration. The token build, the Figma sync, the components, both lint configs, the Figma libraries and the agent docs are in place. Documentation and the portfolio migration come next, as set out in the [PRD](./docs/PRD.md).

## Why

Coding agents produce off-system UI in two different ways, and most design systems only address one of them.

1. **The agent doesn't know what exists,** so it invents. The fix is context: token and component metadata the agent can read.
2. **The agent knows and drifts anyway.** Its training pulls harder than your documentation, so it writes `bg-gray-100` with your tokens in plain view. The fix is constraint: make off-system values impossible to express.

Fossil does both. The usual approach is to allow any CSS and lint it afterwards. Fossil closes the surface instead: layout props accept only token keys, styles accept only semantic tokens, and lint covers what remains.

The workflow came from market research and competitive analysis. We surveyed how production design systems, from Primer and Atlassian to Spectrum and Polar, keep agent output on-system in design and in code, and what each one leaves out ([Learnings](https://fossil.ibrahimmoazzam.com/?path=/docs/research-learnings--docs)). None of them publishes how often agents actually stay on-system. A [drift eval](https://fossil.ibrahimmoazzam.com/?path=/docs/research-drift-eval--docs) that measures this for Fossil, with and without each layer, is designed and will run in a later release.

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

The [design-to-code lifecycle](https://fossil.ibrahimmoazzam.com/?path=/docs/architecture-design-to-code-lifecycle--docs) follows one change through every step.

| Layer        | What Fossil does                                                                                                                             |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Context      | An always-on `AGENTS.md` block, component docs bundled in the installed package, guidelines for Figma Make, Figma variables with code syntax |
| Constraint   | `Box` props typed to tokens, a Stylelint config that allows only semantic tokens, an ESLint rule against raw `<div>`s                        |
| Verification | Token build validation, interaction and accessibility tests, a check that the Figma library matches the code                                 |

Accessibility is tested, not assumed. Every Storybook story runs axe and must have zero violations. Real-input browser tests cover keyboard, focus and native behaviour, such as Escape closing [`Modal`](https://fossil.ibrahimmoazzam.com/?path=/docs/overlays-modal--docs)'s `<dialog>`. The token tests fail if a colour misses the WCAG 2.2 AA contrast minimum it declares, in light or dark mode.

Everything runs on a Figma Professional or Education plan and free tiers elsewhere: no Code Connect, no Variables REST API.

## Packages

| Package                                                          | What it is                                                                  | Version                                                                                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [`@fossil-design/tokens`](./packages/tokens)                     | DTCG token source and the build that turns it into CSS, JSON and TypeScript | [![npm](https://img.shields.io/npm/v/@fossil-design/tokens)](https://www.npmjs.com/package/@fossil-design/tokens)                     |
| [`@fossil-design/react`](./packages/react)                       | React components, precompiled to JavaScript and one stylesheet              | [![npm](https://img.shields.io/npm/v/@fossil-design/react)](https://www.npmjs.com/package/@fossil-design/react)                       |
| [`@fossil-design/eslint-config`](./packages/eslint-config)       | Keeps JSX on-system                                                         | [![npm](https://img.shields.io/npm/v/@fossil-design/eslint-config)](https://www.npmjs.com/package/@fossil-design/eslint-config)       |
| [`@fossil-design/stylelint-config`](./packages/stylelint-config) | Keeps CSS on-system                                                         | [![npm](https://img.shields.io/npm/v/@fossil-design/stylelint-config)](https://www.npmjs.com/package/@fossil-design/stylelint-config) |
| [`@fossil-design/figma-sync`](./packages/figma-sync)             | Syncs tokens with Figma; runs from the repo, not published                  | Private                                                                                                                               |

## Make it your own

Fossil is a template with a reference brand. To use it for your own brand, create a copy with GitHub's **Use this template** button, or fork it. Then rename it with `pnpm rename`, which sets your system's name, CSS prefix and npm scope in [`fossil.config.json`](./fossil.config.json) and everywhere else they're spelled out, replace the token values, and run the same pipeline against your own Figma file.

- **Use this template** gives you a fresh history, and the copy can be private.
- **Fork** keeps the link to this repository, so you can pull later fixes and send changes back. A fork of a public repository stays public.

[Adopt Fossil for your brand](https://fossil.ibrahimmoazzam.com/?path=/docs/adopt-fossil-for-your-brand--docs) takes you through it step by step: renaming, your brand's tokens, publishing or keeping apps in the repository, your Figma files, and your first app.

### Bring your own headless library

Fossil's interactive components are built on native elements, such as `<dialog>` for [`Modal`](https://fossil.ibrahimmoazzam.com/?path=/docs/overlays-modal--docs), but their props describe behaviour, never the element underneath. They use the names [Base UI](https://base-ui.com) and [Radix](https://www.radix-ui.com/primitives) use: `open`, `onOpenChange`, `value` and `onValueChange`. So a copy can rebuild one component on either of them, or on [React Aria](https://react-aria.adobe.com) or [Headless UI](https://headlessui.com) by mapping their names inside the component. The component keeps its props and styles, the apps that use it don't change, and the rest of the pipeline is untouched. [Key decision 7](https://fossil.ibrahimmoazzam.com/?path=/docs/architecture-key-decisions--docs#7-harvested-components-over-a-headless-library) explains why Fossil doesn't ship with one.

## Development

You need Node 22.14 or later and pnpm 12.8.1, the version pinned in [`package.json`](./package.json).

```sh
pnpm install --frozen-lockfile
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

[`AGENTS.md`](./AGENTS.md) lists every command and the rules for contributing, for people and coding agents alike.

## Reasoning

Every decision has a written reason:

- [PRD](./docs/PRD.md): the phases, tasks and exit criteria.
- [Learnings](https://fossil.ibrahimmoazzam.com/?path=/docs/research-learnings--docs): the research behind each decision, including a survey of how Primer, Carbon, Atlassian, Spectrum, Polaris, Fluent and Material are built.
- [Key decisions](https://fossil.ibrahimmoazzam.com/?path=/docs/architecture-key-decisions--docs): the decisions that carry the most weight, each with the alternative it rejected and why.
- [Decision records](https://fossil.ibrahimmoazzam.com/?path=/docs/architecture-decision-records--docs): every architectural decision, as an ADR.
- [Drift eval](https://fossil.ibrahimmoazzam.com/?path=/docs/research-drift-eval--docs): the planned eval of how often agents stay on-system, with its method, harness and prior art.

## License

MIT © 2026 Ibrahim Moazzam. See [LICENSE](./LICENSE).
