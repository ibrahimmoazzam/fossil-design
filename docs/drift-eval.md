# Drift Eval

**Status: planned, not yet run.** Designed in October 2026 as Phase 7 of the [PRD](./PRD.md), then deferred. A full run is 180 agent sessions, each a complete coding task, plus a grading pass for each, which is more time and compute than the project has today. This page records the design so it can be built later, by this project or by anyone running it against their own fork.

## Where Fossil's design came from

Fossil's workflow came from market research and competitive analysis, not from a measurement. Before building, we surveyed how production design systems keep agent-written output on-system in both design and code, and what they leave out: Primer, Atlassian, Spectrum, Carbon, Polaris, Fluent, Material, Salesforce, Polar's Orbit and Uber's uSpec, along with Figma Make and Claude Design. [`Learnings.md`](./Learnings.md) has the detail, in sections 3 and 3.12. The survey found four things:

- **Context and constraint are different fixes.** An agent that doesn't know what exists needs context: docs and metadata it can read. An agent that knows and drifts anyway needs constraint: an API where off-system values can't be written.
- **Most systems lint an open surface.** Every mature system ships a linter. Only a minority close the API itself: Polar, Atlassian and Spectrum S2.
- **The newest layer is checks the agent runs itself.** Primer, Shopify, Salesforce, Spectrum and Storybook let an agent validate its work before CI does.
- **Nobody combines both layers with Figma in the loop** on a budget plan, as a template a small team can fork. That is the ground Fossil takes.

None of the surveyed systems publishes an on-system rate. The eval below is meant to supply one for Fossil.

## What it measures

Fossil's claim is that context and constraint catch different failures, so the two together beat either alone. The eval tests that claim. It measures how often an agent's UI code stays on-system, and how much the context layer and the lint layer each contribute.

Published evals measure something nearby, but not this:

| Who                          | What it measures                                                            |
| ---------------------------- | --------------------------------------------------------------------------- |
| Storybook MCP                | Build, type, lint, test and axe results, with and without its MCP server    |
| Microsoft `a11y-llm-eval`    | The WCAG pass rate of generated UI, with and without instructions or skills |
| Vercel                       | Correct use of new Next.js APIs, from no docs up to `AGENTS.md`             |
| Indeed                       | How accurately agents read different MCP metadata formats                   |
| Evil Martians' design skills | Component choices and the resulting UI, graded by an independent evaluator  |

None of them scores tokens against literal values, and none separates what context contributes from what constraint contributes.

## Design

### Four cells

The corpus runs in a 2×2 of context and lint:

| Agent context                                       | Lint configs off | Lint configs on |
| --------------------------------------------------- | ---------------- | --------------- |
| **No context**                                      | Baseline         | Lint only       |
| **Context**: the `AGENTS.md` block and bundled docs | Context only     | Both            |

Constraint in Fossil works through two mechanisms: props typed to tokens, and lint. The typed props stay on in every cell, along with `tsc`, because removing them would test a library nobody ships. Instead, the scores are reported per surface, so they show what the types catch.

The four cells answer three questions:

- **Context only against baseline:** what the docs add.
- **Lint only against baseline:** whether lint errors alone can steer an agent that has no docs.
- **Both against each single layer:** whether the layers catch different failures. This is the thesis.

### Corpus and runs

The corpus is 15 realistic UI tasks for a small product site. They fall into three groups, so the results show where Fossil's coverage runs out:

- **Covered by components:** "add a testimonial card", "add a tabbed section of case studies", "add a captioned screenshot", "ask before deleting a project".
- **Layout:** "build a two-column project layout", "add a pricing section with three tiers", "add a site footer with links".
- **Not covered:** Fossil has no form controls yet, so "add a newsletter sign-up form" tests what an agent does where the system stops.

The final list is fixed before the first run and published with the results. Each prompt runs three times in each cell, 180 runs in all, because agent output varies between runs and one run per prompt can't show that two cells differ.

### Harness

The harness follows the shape of Storybook's eval harness: a fresh project for each trial, one config per variant, and automatic grading. Each run takes four steps.

1. **Starter app.** A small Vite app on React 19, outside the repository, with Fossil installed from its packed tarballs by npm, as `pnpm smoke` does. A commit marks the starting point.
2. **Cell setup.**
   - **Context on:** `fossil-agents-md` writes the block to `AGENTS.md`, `CLAUDE.md` imports it, and the bundled docs stay installed.
   - **Context off:** no block, and the package's `docs/`, `guidelines/` and README are removed.
   - **In every cell:** the type declarations stay, with their JSDoc, because they are part of the typed API.
   - **Lint on:** Fossil's ESLint and Stylelint configs are installed, and `npm run check` runs them after `tsc`.
   - **Lint off:** `npm run check` runs `tsc` only.
3. **Agent.** Claude Code runs headless (`claude -p`) with one fixed model and the following isolation:
   - **An empty config directory.** No user-level `CLAUDE.md`, memory, plugins or MCP servers reach the run.
   - **No web tools.** The agent can't read Fossil's docs online.
   - **A time and budget cap.**

   Every prompt ends with the same instruction: run `npm run check` before finishing. The only difference between cells is which checks that command runs.

4. **Capture.** The diff against the starting commit, the transcript, and the turns, cost and time of the run.

Runs are independent. Each starts from a fresh copy, and nothing carries over between runs.

### Grading

Grading happens after each run, separately from it. It always uses the full checks, whatever the cell gave the agent.

**Pass rate.** Whether the result passes `tsc`, ESLint and Stylelint with Fossil's configs, and axe on the rendered page, without changes.

**On-system rate,** per surface:

| Surface                   | What's counted                               | On-system when                                                               |
| ------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `Box` and component props | Each token or variant prop                   | Its value comes from the typed union, with no cast or `@ts-expect-error`     |
| CSS Modules               | Each declaration on a property tokens govern | It uses a semantic token, or a keyword such as `0` or `inherit`              |
| Inline `style`            | Each property                                | It's one of `Box`'s sanctioned style properties, or it uses a semantic token |
| Raw elements              | Each JSX element `Box` can render            | `Box` or `Stack` renders it, not a raw `<div>` or `<section>`                |

The grader parses TSX with the TypeScript compiler and CSS with PostCSS, as the Figma library spec already does. It doesn't reuse lint's verdicts, so the score doesn't just restate the checks the lint-on cells already ran.

**Escape rate.** The number of disable comments a result adds, counted with the same matcher as `pnpm escapes`. A declaration under a disable comment counts as off-system.

**Component reuse.** Whether the agent used the Fossil components that fit the task, or rebuilt them from `Box` or raw elements. This needs judgment, so a separate evaluator grades it. That evaluator sees only the prompt's criteria, meaning which components fit, and the diff. It never sees which cell produced the diff.

### Reporting

Each rate is reported per cell with a 95% interval. The interval is bootstrapped over prompts, because three runs of the same prompt aren't independent. The results are published whatever they show. Alongside them go:

- the corpus and the harness;
- every diff and transcript;
- the model and the Fossil version.

That way, anyone can rerun the eval or argue with it.

### Optional: Figma Make

A subset of the prompts can also be prototyped in Figma Make twice: once with a kit Make extracts from a Figma library, and once with the Fossil kit built from the npm package. Each result is then handed to Claude Code through the Figma MCP server and scored with the same metrics. This tests whether a design system written down beats one inferred from a design file.

## Prior art

- **Storybook's eval harness** (`storybookjs/mcp`, in `eval/`):
  - a fresh Vite project per trial;
  - variant configs, run against Claude Code, Copilot CLI and Codex;
  - automatic grading of build, types, lint, story tests and axe, with cost, time and turns.

  Fossil's harness takes its shape.

- **Microsoft's `a11y-llm-eval`:** a control against instructions and skills, several samples per prompt and several models. Its design is closest to the 2×2.
- **Evil Martians' design-system skills:** scenarios graded by an independent evaluator, the model for the component reuse grade.
- **Vercel's `AGENTS.md` eval:** evidence that always-on context in `AGENTS.md` beats context an agent has to look up, which is why Fossil's context layer is a block in `AGENTS.md` rather than a skill.
