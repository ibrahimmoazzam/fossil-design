# Fossil Design: Research and Competitive Analysis

**Status:** Living document
**Purpose:** Capture the research and reasoning behind Fossil's architecture, for later use as source material in a written case study.
**Last updated:** 1 October 2026 (repository layout survey, section 3.11; before that, the Phase 2 and Phase 4 dry run, section 5)

---

## 1. Why this project exists

Fossil Design, or Fossil for short, is a personal, open-source design system built for agentic coding workflows.

**Origin.** The author designed and built a portfolio website directly in code. Once it was finished, its tokens and components were extracted to start a code-based design system. That system makes the next stage possible: designing in Figma and having agents write the code, with their output constrained to what the system defines. The portfolio is then rebuilt on Fossil, installed from npm. This is also how many design systems begin: harvested from a product that already ships, with code, not a design file, as the source of truth.

It has three motivations:

1. Work at the intersection of design and engineering.
2. Understand the current state of the design-to-code pipeline in the agentic era.
3. Turn the finished portfolio's tokens and components into a source of truth, so future work on it happens in Figma and through agents, with less drift and more time spent on ideas than on implementation.

It is scoped as a personal project. It does not need to match the rigour of a corporate design system, but every decision should have a stated rationale, and the code should be good enough to read.

AI design tools strengthen the third motivation rather than replacing it. Figma Make and Claude Design can both prototype with Fossil's real components (section 3.9), which moves ideation onto a surface that is already on-system. Fossil's constraint layer then guards the implementation step, which the design tool does not touch.

---

## 2. The central distinction: agent-readable vs agent-proof

The two systems that prompted this project turn out to solve different problems, and conflating them is the fastest route to an unfocused v1.

### Agent-readable (context)

The premise is that the model has never seen your design system, so it guesses. Jan Six of GitHub framed it as: the invisible part of your system is larger than the visible part, and what the agent cannot see, it hallucinates.

The fix is retrieval. MCP servers, structured JSON metadata, `llms.txt` files, Code Connect mappings. Uber's uSpec sits here: an agent connects to Figma via MCP, extracts component structure, tokens, variables and styles, and generates spec pages so that downstream consumers work from definitions rather than assumptions.

### Agent-proof (constraint)

The premise is that even a fully informed agent drifts, because its training weights pull harder than your documentation. Polar states this plainly: anything in a doc is a probability, not a guarantee, and across thousands of generations the misses accumulate.

Their fix is not more context but a smaller vocabulary. Orbit's bet is that if a value is not a design decision the team actually made, it should not pass CI. Enforced through token-typed props on a `<Box />` primitive plus an ESLint rule banning raw `<div>`.

### Why they are not interchangeable

Give an agent full MCP access to a token file and ask for a card. It will frequently still emit `bg-gray-100`. It read the tokens; it did not use them, because "card" in its training data is overwhelmingly Tailwind grays. **Readability does not constrain.**

Conversely, a perfectly closed `<Box padding="l">` API is useless if the agent does not know a `<Card>` already exists and rebuilds it from `Box`. **Constraint does not inform.**

### The structural leak in readability

The sharpest finding of the research, from the Into Design Systems survey: MCP is on-demand. It returns only what the prompt asks for. A prompt saying "build me a card" returns card and button information but ignores spacing, typography and color, and the model fills the gap with its own assumptions.

This means retrieval systematically under-serves the foundational layer, which is precisely where drift is visible. The commonly prescribed workaround is always-on rules for foundations plus on-demand MCP for components. That is a mitigation, not a fix. Constraint solves it properly: if spacing can only be `padding="l"`, the agent cannot get it wrong regardless of what it retrieved.

### The three layers

Reading across Uber, Polar, Primer, Indeed, Spotify, Atlassian and Storybook, mature systems converge on three layers, though most only discuss one or two publicly.

| Layer | Purpose | Typical building blocks |
|---|---|---|
| 1. Context | Tell the agent what exists | DTCG JSON, MCP server, `llms.txt`, `AGENTS.md`, Code Connect |
| 2. Constraint | Make off-system output inexpressible | Typed props, closed token sets, banned raw elements, lint rules |
| 3. Verification | Catch what slips through | Interaction and a11y tests, self-healing agent loops, drift detection |

Nobody frames layer 3 as a pillar, but everyone has it. Storybook shipped it as product: its MCP server lets agents write stories, run interaction and accessibility tests, fix issues and re-run. GitHub runs sub-agents such as an accessibility reviewer, and daily QA workflows with safe outputs where an agent can only file an issue.

---

## 3. Pipeline survey of established systems

| System | Token source of truth | Build | Enforcement | Agent layer |
|---|---|---|---|---|
| **Primer** (GitHub) | JSON5 in `primer/primitives`, DTCG-shaped | Style Dictionary via custom `buildTokens.ts` | `eslint-plugin-primer-react` + token schema validation in CI | Public MCP + instruction files |
| **ADS** (Atlassian) | `@atlaskit/tokens` in code | Custom | 2 ESLint plugins + Stylelint plugin + codemods | `llms.txt` family + public remote MCP + agent skill |
| **Spectrum** (Adobe) | `spectrum-design-data`, proprietary JSON schema | Custom | JSON schemas + validation rule catalogue + conformance fixtures | Two MCP servers + agent skills |
| **Carbon** (IBM) | `@carbon/themes` | Custom | `stylelint-plugin-carbon-tokens` | First-party `carbon-mcp` |
| **Polaris** (Shopify; React version archived 2026) | `polaris-tokens` package | Custom | `stylelint-polaris` | None found |
| **Fluent** (Microsoft) | Designer-maintained JSON | "Token pipeline inspired by Style Dictionary" | TypeScript types via Griffel | None official |
| **Material 3** (Google) | Spec plus algorithmic generation | Theme Builder | None | Community only |

### 3.1 Nobody's source of truth is Figma

The most consequential finding, and it reversed one of Fossil's original requirements.

Primer authors tokens as JSON5 files in git. Adobe authors in its own schema in git. Atlassian authors in code. Even Fluent, the most designer-driven of the group, describes designers maintaining a JSON file that holds the single source of truth.

In every case Figma is a **consumer** of tokens, not the producer.

The reason is not ideology. Git provides PR review on a token change, schema validation in CI, semver, deprecation metadata, and diffs. Primer runs a workflow called Design Token Schema Validation on every PR touching tokens. Figma has no equivalent of any of that.

**The same argument applies to AI design tools.** Claude Design keeps its design systems in claude.ai and changes them through chat, with no PR review, diff, semver or deprecation. Claude Code can now read Claude Design projects, but that makes the system readable, not reviewable. Fossil therefore treats every design tool as a consumer of the git source: Figma variables through the sync, Figma Make through a Make kit built from the npm package, and Claude Design, if added later, through `/design-sync` (section 3.9).

### 3.2 DTCG is an interchange format, not necessarily an authoring format

Adobe's `spectrum-design-data` repo contains an RFC for DTCG Format Output, categorised under tangential standards output and marked **Deferred**. The most rigorous token programme in the industry treats DTCG as an optional export rather than its internal format.

Primer splits the difference: `$value`, `$type` and `$extensions` per the W3C spec, but authored in JSON5 so it can carry comments, with custom behaviour layered on. An `alpha` property overrides a referenced color's opacity, and an `@` convention lets `bgColor.accent` and `bgColor.accent.muted` coexist.

Implication for Fossil: DTCG remains correct, because interoperability is part of the point. But `$extensions` is the sanctioned escape for anything the spec does not cover, and using it is normal rather than a hack.

### 3.3 Lint enforcement is universal and predates LLMs

Every mature system ships a linter. `stylelint-polaris` covers custom property usage and mainline coverage. Carbon ships `stylelint-plugin-carbon-tokens`. Atlassian ships two ESLint plugins plus a Stylelint one, where linters warn for deprecated tokens and error for deleted ones, with auto-fixers so an entire app can be migrated via `eslint --fix`.

This reframes Polar's contribution. Linting off-system values is standard practice. What Polar did differently is **close the API rather than lint an open one**. Everyone else permits any CSS and then complains about it afterwards. Polar makes the wrong thing unrepresentable.

> Fossil's one-line thesis: the industry lints an open surface; Fossil closes the surface and lints only what remains.

### 3.4 Linters must match the authoring format, not the output format

Atlassian ships both linter types and splits them explicitly: an ESLint plugin for CSS-in-JS, a Stylelint plugin for vanilla CSS, Less and Sass.

This matters because "we emit CSS custom properties, so we need Stylelint" is a trap. Carbon needs Stylelint because Carbon consumers write Sass. Polaris needs it because Polaris consumers write CSS.

**Correction after the dry run (October 2026).** This section first concluded that ESLint was Fossil's primary linter, because Fossil's styles were written in vanilla-extract `.css.ts` files that Stylelint can't parse. The principle held, but it was applied to the wrong author.

The linter must match the *consumer's* authoring format, because consumer repos are where agents build features. The portfolio writes CSS Modules, and so do most small teams. A vanilla-extract Fossil would therefore have needed two enforcement stacks: custom ESLint rules for its own `.css.ts`, and Stylelint for every consumer.

Fossil now writes its own components in CSS Modules too. One Stylelint config, made of off-the-shelf rules and generated token lists, enforces tokens in Fossil and in every consumer. ESLint keeps the JSX rule Stylelint structurally cannot express: banning raw layout elements, done with core `no-restricted-syntax`. The full reasoning is in section 5, "The dry run".

### 3.5 The third tier is contested and shrinking

Primitive to semantic is settled everywhere. Component-level tokens are where systems disagree, and the trend runs against them. Adobe retreated explicitly: before v12 every possible combination of component options defined a token, producing an unnecessarily large list; v12 moved to a more efficient set. Fluent runs roughly 650 global and 550 alias tokens.

Two tiers for Fossil is the correct call, not a compromise.

### 3.6 Lifecycle tooling is where serious investment goes, and nobody writes about it

Adobe's repo contains a Token Diff Generator, an Optimized Diff Engine, a Release Analyzer and a Token Changeset Generator, with token lifecycle metadata covering deprecation, semver and governance, normative in `spec/token-format.md` and `spec/evolution.md`. Atlassian ships codemods with flags such as `--addEslintComments` to auto-insert suppressions for fallbacks that should be preserved.

This layer is invisible in blog posts and universal in practice, which makes a small version of it disproportionately impressive.

### 3.7 The agent context layer has converged on a shape

Atlassian's is the most complete public example: a root `llms.txt` acting as a table of contents, segmented files (`llms-tokens.txt`, `llms-primitives.txt`, `llms-components.txt`, `llms-styling.txt`, `llms-a11y.txt`, `llms-content.txt`), plus `llms-full.txt`. Paired with a hosted MCP server and a local one via `npx`.

The important detail: their internal agent skill is generated from the same content as the `llms.txt` file. **One source, several renderings.** Nothing hand-written.

Skills stopped being tied to one vendor on 18 December 2025, when Anthropic released Agent Skills as an open standard. A `SKILL.md` written for Claude Code now also works in Codex, Cursor, GitHub Copilot, VS Code and Gemini CLI. Cursor reads `.claude/skills/` for compatibility. Only a skill's name and description load at startup, and the rest loads when it is triggered. That makes skills the right home for occasional procedures, but, like MCP, not for foundation rules, which must be always-on.

### 3.8 Format choice measurably affects cost and accuracy

Indeed's Diana Wolosin benchmarked 8 MCP configurations across 1,056 prompts. JSON reached higher accuracy with 80% fewer tokens and 5x lower annual cost than Markdown.

Her rule of thumb: JSON for MCP, Markdown for LLM. Structured data (component APIs, props, sizes, variants) is a contract and belongs in JSON. Instructions and rules are natural language and belong in Markdown.

### 3.9 AI design tools are a new kind of consumer

Claude Design (Anthropic Labs, launched April 2026) gets a design system in one of two ways, and they are not equivalent.

- **Extraction.** It reads a repo, design files or uploads, and writes a description of the system (colours, type, components, layout patterns) into a design-system project kept in claude.ai. This recovers only what is visible in the source. Which of two near-identical greys was intended, or when a ghost button is appropriate, is not in the code to be found. In Jan Six's framing, extraction reads the visible part of the system and guesses the rest. Early reviews report the expected result: a tidy, well-tokenised system produces usable drafts, and a messy repo has its mess reproduced in every mockup.
- **`/design-sync` from Claude Code** (June 2026). It takes a React package's built `dist/`, or a Storybook, bundles it, and uploads it along with the `.d.ts` files, the CSS, tokens and fonts, a usage doc and preview card per component, and a content hash for incremental re-syncs. Claude Design then renders the real components in its React renderer and writes code against the type declarations. Whether it type-checks against them or only reads them is not documented. Anthropic says it also checks its output against the system and corrects it before showing it, but has published no numbers.

Consequence: a standalone, packaged system is what gets the higher-fidelity path. Fossil is already that shape (precompiled `dist/` plus Storybook), so Claude Design support costs a compatibility check rather than new code. The sync is one-way: `/design-sync` pushes code into Claude Design, and nothing turns an edit made in Claude Design into a change in git.

**Figma Make does the same job inside Figma.** Make kits, rolled out from March 2026, bundle three things:
- an npm package of React components;
- variables and styles from a published Figma library;
- a `guidelines/` folder that Make reads first.

Like Claude Design, Make can either run a real package or infer a system, in its case from a Figma library. Library extraction is limited: kits take a subset of variables, flatten them into a CSS file of raw values, and do not include library components.

A hands-on trial in September 2026 found Make's ingestion of a React package equivalent to Claude Design's. Make wins on placement:
- it sits next to the Figma library;
- the Figma MCP server reads Make files directly, so no export step is needed;
- it is included in Figma's Education and Professional plans.

Fossil therefore prototypes in Figma Make and defers Claude Design to a later release. Because both consume the same built package, adding Claude Design later costs a compatibility check.

A tool-agnostic format has also appeared. Google Labs open-sourced **DESIGN.md** in April 2026 (Apache-2.0, still labelled alpha): YAML front matter holding colours, typography, spacing, radii and component tokens, followed by prose rationale. Its CLI can lint, diff and export to DTCG. It has no concept of modes, so it cannot express light and dark. It is a lossy rendering of a DTCG source, not a replacement for one.

### 3.10 Promotion needs a record, not a count

The familiar "rule of three" predates design systems. It comes from software refactoring ("three strikes and you refactor", attributed to Don Roberts and popularised by Martin Fowler), and from reuse research that said a component should be tried in three applications before entering a library. Its own proponents call the number a rule of thumb.

Brad Frost's split of **components** (generic ingredients, owned by the system), **recipes** (product-specific compositions, owned by product teams) and **snowflakes** (one-offs) still describes where things live. It dates from 2021, though, and doesn't address agents. Fossil calls the middle category **compositions**, to keep one name per concept. (The original reason, that `recipe()` names vanilla-extract's variants API, went with vanilla-extract.)

Two 2026 sources update the practice:

- **Evil Martians (September 2026)** designed a governance framework around agents:
  - Components carry "when to use" and "when not to use" contracts, because an agent can "miss a directory entirely and invent a component that already exists."
  - Agents log every gap in a journal, recording source, need, actual and expected result, and evidence. Every local override carries a mandatory reason.
  - A person closes each entry with a recorded decision. There are three outcomes: add it to the system, keep it local as an authorised exception, or clarify the rules.
  - Patterns can be documented composition rules with no new code.
- **zeroheight's Design Systems Report 2026** found that 69% of teams encourage open contribution, but over 2 in 5 gatekeep it, and 16% of systems are maintained by a single person. That last group is Fossil's situation.

The update, then, is that a count only triggers a review, and the review produces a recorded decision. Two things raise the stakes: agents multiply near-duplicates faster than people notice them, and the cheapest correct outcome is often a documented pattern rather than a new component.

For a system with one consumer, "several teams need it" can't be the test. What remains is repetition inside the product, and whether the thing is generic.

**The framework ships as a skill.** One of the article's authors publishes it as the `design-system` skill in `ymandrikov/ai-design-system` (MIT, created 10 September 2026). It covers:
- Markdown contracts per component, with purpose, when to use and not, props, states, and accessibility split into component guarantees and consumer obligations;
- generated indexes of components, layouts and patterns;
- a `gaps.md` ledger with triage;
- Node scripts that flag contracts whose source files changed since review;
- a `scenarios/` suite graded by an independent evaluator.

It confirms two Fossil choices: "a skill holds the steps; scripts do the deterministic work", and gap logging with recorded decisions.

Fossil doesn't adopt it, for four reasons:
- **Second description.** Its contracts are hand-maintained Markdown beside the code, while Fossil generates its guidance from the component source. Using both gives each component two descriptions, and the hash check only says a contract needs re-reading, not which description is right.
- **One repo.** Contracts must point at source files inside the same project, but Fossil's components live in the Fossil repo and reach the portfolio as compiled code.
- **Context and governance only.** It leaves tokens, typed props and lint rules to each project. Its companion linter, `evilmartians/design-lint`, targets Tailwind v4 and has no license file.
- **Too new.** It was weeks old at the time of writing, with one author and a format likely to change.

Fossil borrows its contract fields and gap format now. At the end of Phase 6 it revisits the skill, to consider generating contracts in its format as one more rendering.

### 3.11 Repository layout follows the number of implementations

Checked in October 2026 against each project's repositories:

| System | Layout |
|---|---|
| **Atlassian** | One company-wide monorepo, mirrored publicly. Its `design-system/` folder holds tokens, ESLint and Stylelint plugins, codemods, an MCP server and every component, beside Jira and Confluence |
| **Fluent UI** | One monorepo: tokens, React and web components, an ESLint plugin and codemods. Griffel, its styling engine, is a separate repo |
| **Carbon** | One monorepo: tokens (themes, colours, type, layout, motion), React and web components, and the upgrade CLI. Its Stylelint plugin is a separate repo |
| **Polaris React** | One monorepo: tokens, components, a Stylelint config, a migrator and the docs site. Archived and marked deprecated by October 2026 |
| **Primer** | Split by layer: `primer/primitives` for tokens, `primer/react` for components and an MCP server, `primer/css`, and separate repos for the ESLint plugin and the Stylelint config |
| **Spectrum** | Split by implementation: `spectrum-design-data` for tokens, then `react-spectrum`, `spectrum-css` and `spectrum-web-components` |
| **Material** | Split: `material-web` for components; Theme Builder had its own repo, now archived |

The split tracks two things. Tokens that feed several component libraries get a repo of their own, because no one implementation owns them: Primer's feed React and CSS, Spectrum's feed React, CSS and web components. Separate teams with separate release cadences also get separate repos. The monorepos keep a token change and the components that use it in one pull request.

Fossil sits on the monorepo side for three reasons, and the last is decisive:
- **React only.** No implementation-neutral token repo is needed.
- **One token build feeds everything.** The CSS, the lint lists, `Box`'s generated CSS and the Figma sync all read it, so a token rename is one reviewed, CI-checked pull request instead of several released in order.
- **Adoption is by template.** GitHub's "Use this template" copies one repository, and `fossil.config.json` renames the system in one place only if there is one place. A split Fossil would hand a team five repositories to copy and re-link.

The portfolio stays out on purpose (section 6, "Site location"). Atlassian's monorepo includes its products; Fossil's one consumer installs from npm like anyone else's.

---

## 4. Where the field falls short

These gaps define Fossil's opportunity.

1. **No published system combines layer 1 and layer 2.** Uber has context without enforcement. Polar has enforcement without a design-tool source of truth. A system where Figma participates, tokens flow into a typed API, and CI proves the output stayed on-system, is genuinely unoccupied ground. AI design tools do not fill this gap. Figma Make and Claude Design add context inside the design surface, and Claude Design adds self-checking, but neither constrains the code an agent writes in a repo.

2. **Nobody has mapped the cost of constraint.** Polar admits their closed token sets are too small for some UI they build, so they add tokens weekly and watch for the point where the constraint costs more than it saves. Where that line sits is unpublished.

3. **The foundational-layer retrieval gap is unsolved** (see section 2). The prescribed workaround is a mitigation.

4. **No published measurement of drift.** Uber lists drift detection as roadmap. Polar reports that reviews feel different. Indeed measured MCP configuration accuracy, not on-system rate of generated output. Claude Design says it checks and corrects its output against an imported system, but publishes no rate either. The bar for a credible eval harness is currently near zero.

---

## 5. Platform constraints discovered during research

These are hard facts that shaped the architecture, verified against primary sources.

### Figma Variables REST API is Enterprise-only

Figma's docs are unambiguous: using the Variables REST API requires a Full seat in an Enterprise org, and the plan requirement is Enterprise for both GET and POST. Professional and Organization plans receive a 403. Re-checked September 2026: unchanged.

**Consequence:** the clean architecture (CI reads and writes Figma Variables directly) is unavailable. Any round trip must run through the Plugin API, either in a plugin or through the MCP server's `use_figma` tool.

### The Plugin API has no such gate

Variables are supported in the Plugin API for creating, reading, and binding to components, explicitly including import and export plugins. Available on all plans.

Five capabilities make the round trip, and a generated component library, viable:

- **Stable identity.** `figma.variables.getVariableByIdAsync` resolves a variable by persistent ID. A rename changes `name`, not `id`.
- **Plugin data on variables.** Plugin API Update 80 added the ability to set and query `pluginData` on Variable and VariableCollection nodes. Data is scoped to the plugin ID, so other plugins cannot read it. It travels with the variable, unlike an external mapping file. Variables also support `setSharedPluginData`, which stores data under a namespace any plugin can read. That now matters: agents write to Figma through the MCP server's `use_figma` tool (see below), which runs as a different plugin. A canonical token path in private plugin data is invisible to it; in shared plugin data it is not.
- **Code syntax.** `setVariableCodeSyntax` makes a variable's code representation appear in Dev Mode's code snippets, so stamping `var(--fossil-*)` fixes Figma's own handoff surface and the Figma MCP output simultaneously.
- **Scopes.** `variable.scopes` limits which properties a variable can be applied to in Figma's UI, such as fills, gaps or corner radii. Setting it per token type is constraint on the design side, the same idea as Fossil's closed props. Figma's own library-generation skill says never to leave a variable on `ALL_SCOPES`.
- **Binding.** `setBoundVariable` binds sizes, radius, spacing and typography fields, on nodes and on text and effect styles. `setBoundVariableForPaint` binds fills and strokes, and `setBoundVariableForEffect` binds shadow fields. This is what lets a component library generated from code point at Fossil's variables rather than raw values.

**Correction to an earlier assumption:** renames *are* detectable with certainty, not heuristics. This is strictly better than Adobe's approach, whose diff script compares new and deleted tokens looking for shared values to guess likely renames and cannot guarantee correctness. Adobe diffs files; Fossil's sync diffs live objects with identity.

**Caveat:** IDs are file-scoped. Duplicating a Figma file produces new IDs, which argues for data stamped on the variable over an external map. Fossil's sync detects a rename by comparing each variable's stamped token path with its current name, so it doesn't depend on IDs.

### Plugin network access

This applies only to the deferred plugin adapter; the `use_figma` route needs no network access from Figma. Plugins declare `networkAccess.allowedDomains` in `manifest.json`, with a `reasoning` field explaining the scope and `devAllowedDomains` for localhost during development. Requests to undeclared domains are blocked by CSP. `https://api.github.com` in `allowedDomains` is all that is required for git sync.

### Figma native DTCG export is incomplete

Native variable export aligned to DTCG was announced in late 2025 and was still rolling out progressively in mid-2026. Most composite tokens (typography, gradients, shadows) are still not supported, despite being in the stable 2025.10 revision of the spec, and the exported JSON drops descriptions.

**Consequence:** a clean architectural boundary rather than a gap. Figma owns scalar values (color, number, string, boolean). Code owns composites.

### Figma's MCP server can now write to the canvas

Since February 2026 the remote Figma MCP server has had write tools. It now covers most of what a design-system pipeline needs from Figma.

- **`use_figma`** runs Plugin API JavaScript on the agent's behalf, so an agent can create variables, components, variants and instances of library components. It needs a Full seat and edit access. Figma describes it as free during the beta and usage-based later. Limits include no image support and no custom fonts.
- **`generate_figma_design`** captures a running web UI (localhost or a live URL) into a Figma file as editable layers. If the target file uses a library with variables, it binds colour, number and string variables to matching properties automatically. It does not produce components or variants.
- **Skills.** Figma publishes agent skills for these tools. `figma-generate-library` builds variables with modes, code syntax and scopes, then component sets with variants bound to those variables. It has a reconciliation mode that diffs code against Figma and updates only what changed. `figma-generate-design` assembles screens from a library's components instead of drawing primitives.
- **Rate limits.** Read tools (`get_design_context`, `get_variable_defs`, `get_screenshot`, `search_design_system`) are limited by plan and seat; tools that write to files are exempt.
  - Figma's rate-limit page (re-checked 1 October 2026) contradicts itself. Its table lists 200 a day and 15 a minute for a Dev or Full seat on Professional. Its text says Education plans "use the same rate limits as Dev and Full seats on the Professional plan: up to 200 tool calls per day, 10 per minute."
  - Plan for 10 a minute. View and Collab seats get 6 a month.

- **Allowlist.** The remote server is allowlist-only. Only clients in Figma's MCP catalog (Claude Code, Cursor, Codex, VS Code and others) can complete its OAuth flow. Custom clients are rejected, and personal access tokens aren't accepted. No script or CI job can call it; only an agent session can.

**Consequence for Fossil's sync:** a custom plugin is no longer needed to reach Figma. `use_figma` runs the same Plugin API code, so the plugin's UI, GitHub authentication and network allowlist all disappear.

What doesn't disappear is the logic. None of Figma's tools cover the push direction, rename detection by stable identity, or write-boundary enforcement, and all three must be deterministic. So Fossil's sync is its own tested code. The agent's only job is to carry the generated scripts to `use_figma` unchanged, because the allowlist means only the agent can make that call. A plugin becomes an optional later adapter over the same core, worth building if `use_figma` pricing, rate limits or a designer without an agent make it necessary.

Checked again in October 2026, while building Phase 3 (ADR 0007):
- **`use_figma` runs plain JavaScript** with top-level `await`, and returns the script's return value as JSON. No state persists between calls, so every script finds Fossil's variables again by their stamps. Figma's `figma-use` skill must be named in the call's `skillNames`.
- **Responses are cut off at about 20 KB with no error,** according to a third-party report (CruGlobal's cornerstone-design-system, issue 23). Reads page, and every page carries a hash.
- **Failed scripts aren't atomic any more.** `figma-use` replaced its atomicity guarantee with a per-error `safeToRetryWithoutCanvasRead` flag. Fossil's apply scripts check everything before writing, and are safe to run again.
- **Collections and scopes:** a Professional or Education file allows four modes per collection, and an empty `scopes` list hides a variable from every picker.
- **Motion variables:** `TIMING` (seconds) and `EASING` arrived in Plugin API Update 133 (August 2026). An easing value is `{ type, easingFunctionCubicBezier?: { x1, y1, x2, y2 } }`, with `CUSTOM_CUBIC_BEZIER` for a custom curve. Figma refuses scopes on both types, as a third-party project measured live (figwright, pull request 261).
- **Setup in Claude Code:** `claude plugin install figma@claude-plugins-official` installs the server and Figma's skills together; `/mcp` signs in.

Measured live on a scratch file in October 2026, during Phase 3's checks:
- **The scripts' self-check works.** `Function.prototype.toString` in Figma's sandbox returns each function's source as sent, so a generated script's hash of itself passes. `use_figma` accepted a 23 KB script. (Unless the script contains an `svg` tag, found in Phase 5b; see below.)
- **Numbers are 32-bit floats.** Every number Figma stores comes back rounded to single precision: `1.2` as `1.2000000476837158`, `0.15` seconds as `0.15000000596046448`, and colour channels and curve points the same way. Comparing with `===` sees a change on every run.
- **Descriptions come back HTML-escaped.** Figma stores `&`, `<`, `>`, `"` and `'` in a variable's description as `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#39;`. Nothing else changes, and an entity already in the text is escaped again.
- **Timing and easing.** Both types accept aliases, and an easing variable holds a custom cubic Bézier. Setting scopes on either throws `Cannot set scopes on this variable type`, as figwright reported.
- **Scopes.** With empty scopes, primitives stay out of every picker, while semantic aliases to them still resolve. The `GAP` scope offers a variable in both gap and padding fields.
- **Order.** No Plugin API call reorders variables (styles have reorder methods, variables don't), so a collection lists its variables in the order they were created.

The same split applies to generating the component library (PRD Phase 5b). A script derives each component's name, variants and variable bindings from code, and a second script reads the result back and checks it. The agent does the part that needs judgment, turning JSX and styles into Figma frames. `figma-generate-library` alone would leave names and bindings to the agent.

### Code Connect is Organization and Enterprise only

Code Connect maps Figma components to code components, so Dev Mode and the MCP server's `get_design_context` return `<Button variant="primary">` instead of generated markup. It requires an Organization or Enterprise plan and a Full or Dev seat.

**Consequence:** on Professional, component mapping falls back to convention. Figma component and variant-property names must match the React component and prop names exactly, so the agent can resolve them through the component docs.

### DTCG and Style Dictionary state

The DTCG Format Module 2025.10 was published as a Final Community Group Report on 28 October 2025 and is marked stable. Two details affect Fossil directly:
- Token files should use the `.tokens` or `.tokens.json` extension.
- `$deprecated` is a standard property (`true`, an explanatory string, or `false`), so lifecycle metadata does not have to live entirely in `$extensions`. Vendor data that does belong there should use a reverse-DNS key, as the spec recommends.

Style Dictionary v4 shipped first-class DTCG support. v5 (5.5.5 as of September 2026) adopted 2025.10 as its base, requires Node 22+, and tightened reference rules, though its own docs note full 2025.10 support remains a work in progress.

Checked again in October 2026, while authoring the Phase 1 tokens:
- **Colours are objects.** A 2025.10 colour `$value` is `{ colorSpace, components, alpha?, hex? }`, and `hex` is a 6-digit fallback. A hex string isn't valid, so transparency goes in `alpha`, not in 8-digit hex.
- **Dimensions take `px` or `rem` only.** `em` letter-spacing has to become `rem`, which is exact inside a typography token because its size is fixed.
- **Composites.** Typography needs all five parts: `fontFamily`, `fontSize`, `fontWeight`, `letterSpacing` and `lineHeight`. `border` is `{ color, width, style }`, with `style` a `strokeStyle`. `shadow` is an object or an array of them. Every part may be a reference.
- **Modes aren't in the format module.** Theming belongs to DTCG's Resolver module, which Style Dictionary 5.5.5 doesn't read.
- **Style Dictionary 5.5.5's source** converts DTCG colour objects through colorjs in its colour transforms, and ships `border/css/shorthand` and `strokeStyle/css/shorthand`.
- **Spacing in other systems.** Carbon applies one spacing scale to margin, padding and gap between elements. Atlassian uses one `space.*` set everywhere, named as a percentage of an 8px base (`space.025` is 2px, `space.100` is 8px).

Checked again in October 2026, while building Phase 2 (ADR 0006):
- **`outputReferences` corrupts composites.** For an object value, Style Dictionary 5.5.5 replaces each referenced token's resolved value inside the transformed string. A shadow with a `5rem` blur and a `0.25rem` offset became `0.2var(--fossil-space-1000) 5rem`, with no warning. Fossil's CSS format writes references itself.
- **`expand` drops aliases.** It resolves references to object values (font families, dimensions) before splitting typography, so those parts become literals. Fossil keeps `expand` for the names and takes the references from the source.
- **Font weight names aren't converted.** DTCG 2025.10 maps names to numbers (`semi-bold` is 600, `extra-black` 950), and no Style Dictionary transform does it. `time/seconds` only matches the legacy `time` type, which is why durations print as `[object Object]`.
- **`formatPlatform` renders without writing,** and runs the same name-collision check as a build, so every output can be checked before any file changes.

### Storybook already ships a component MCP server

Storybook 10.6 is current, and `storybook init` (10.4+) adds `@storybook/addon-mcp` automatically when AI features are enabled. Once running, the server is available at `localhost:6006/mcp`. It exposes three toolsets:
- **Docs:** `docs-list`, `docs-show`, `docs-show-story`.
- **Development:** writing and previewing stories.
- **Testing:** `test-run`, including accessibility checks.

The agent can write stories, run tests, fix issues and re-run. The earlier React-only limitation is gone. The docs toolset needs a components manifest, which React frameworks, `@storybook/angular-vite` and `@storybook/vue3-vite` can generate.

Three details matter for Fossil:
- **Manifests are off by default.** `componentsManifest: true` has to be set in `.storybook/main.ts`.
- **Only the docs toolset leaves the machine.** Publishing exposes docs tools only; development and testing stay local. You can publish automatically through Chromatic or self-host with the `@storybook/mcp` library. That library accepts a custom `manifestProvider`, so manifests can be read from anywhere, including a file inside an installed npm package. Storybook composition also merges composed Storybooks' manifests into one server.
- **The manifest is what the agent sees.** One practitioner reports two gaps. Docs-tab prose (`parameters.docs.description.component`), where "when to use this" guidance usually lives, does not reach the manifest. And the default `react-docgen` extractor misses complex types that `react-docgen-typescript` resolves.

**Consequence:** do not build a custom component MCP server. Layer 1 for components and most of layer 3 arrive for near-zero effort while developing Fossil. Consumers get their component context differently, from docs bundled in the package (see "The dry run" below), because a server would have to run inside every consumer repo.

### vanilla-extract mechanics

> **Historical.** Fossil moved from vanilla-extract to CSS Modules after the dry run (see "The dry run" below). This section and the next record the original reasoning.

`createGlobalThemeContract` creates a contract of globally scoped variable names **without generating any CSS**, and accepts a map function with access to the value and the object path.

This is the exact join Fossil needs: Style Dictionary emits the `:root` declarations, vanilla-extract emits the typed names, and neither duplicates the other.

**Risk it introduces:** because the contract emits nothing, nothing verifies that a name in the contract has a matching custom property in the CSS. A parity test is mandatory, not prudent.

Library health: growing, not flat. `@vanilla-extract/css` went from about 456K weekly downloads in September 2023 to over 2M in September 2026 (npm, comparable weeks), and `@vanilla-extract/recipes` grew faster still. An earlier draft of this document called it flat at 450K, which was the 2023 figure.

### vanilla-extract in a published package is a known rough edge

Shipping vanilla-extract source to consumers requires them to install and configure a vanilla-extract bundler plugin. The maintainers actively prefer this: their stated position is that compiling in the consuming application is the better approach, and Braid (SEEK's design system) ships `.css.js` files for the consuming app to process. Community discussions repeatedly surface the same friction, including consumers hitting "styles were unable to be assigned to a file" errors when precompiled output is consumed incorrectly.

The alternative is precompiling with Vite library mode, emitting plain JS with resolved class names plus a single bundled `dist/style.css`. Trade-off: no CSS code splitting, which matters at Braid's scale and not at Fossil's.

**Decision for Fossil: precompile.** The deciding argument is not bundle size, it is that requiring consumers to know what vanilla-extract is contradicts the point of publishing an open-source design system. Known implementation gotcha: ignore `lib/**/*.css.ts` in the Vite config so the plugin does not reprocess its own output.

**A second argument arrived later.** `/design-sync` bundles the package's built `dist/` and runs it inside Claude Design's React renderer. A package that shipped raw `.css.ts` would need a vanilla-extract bundler plugin there too, which it presumably does not have. The decision made for human consumers turns out to be the one AI design tools need as well.

The precompile decision survives the move to CSS Modules unchanged: consumers still get plain JS and one `style.css`. The `lib/**/*.css.ts` gotcha above no longer applies.

### The dry run (September–October 2026)

Phases 2 and 4 were built for real in a scratch workspace, on a slice of the portfolio's tokens:
- Style Dictionary 5.5.5;
- a precompiled React package;
- Storybook 10.6 with the a11y and Vitest addons;
- two consumer apps installing the packed tarballs (Next 16.3.7 on Turbopack, and Vite on React 18).

It found 34 problems. Then it was rebuilt on CSS Modules to check the replacement before the PRD changed.

**Why vanilla-extract went.** Most of its cost was internal plumbing that consumers never saw:
- a generated contract and a parity test;
- sprinkles;
- runtime helpers that became runtime dependencies;
- a Vite cache workaround;
- custom ESLint rules for `.css.ts`.

Meanwhile the portfolio couldn't adopt it without `@vanilla-extract/turbopack-plugin`, at version 0.1.4. The industry signal points the same way:
- Primer moved every component to CSS Modules by December 2024 (55% less server-render time), then removed `sx` and deprecated `Box` in v38.
- CSS Modules leads its category in State of CSS 2025.
- Weekly npm downloads in September 2026 were 12.8M for Stylelint and 3.2M for `@vanilla-extract/css`.

**What CSS Modules keeps.** The worry was accuracy. vanilla-extract alone never caught raw values either; the PRD already needed custom rules for that. The CSS Modules setup was checked in the rebuilt spike:

| Mistake in a component | How it fails |
|---|---|
| Unknown token name | `stylelint-value-no-unknown-custom-properties` |
| Raw value | `stylelint-declaration-strict-value` |
| Primitive or deprecated token | Core `declaration-property-value-disallowed-list`, with generated lists |
| Class-name typo, or a variant with no CSS class | Strict types from `vite-css-modules`, failing `tsc` |

The class-name check needs `moduleResolution: "bundler"`: under `NodeNext`, TypeScript doesn't find `.module.css.d.ts` files.

**Platform facts the dry run established.**
- **TypeScript 7 (7.0.2, July 2026)** is the native compiler. Its package's main entry exports only `version`, with no compiler API, so `typescript-eslint` (peer `<6.1.0`), `react-docgen-typescript` and declaration tools break on it. Pin `~6.0.3`. `@typescript/typescript6` exists, but tools import `typescript` by name.
- **TypeScript 6** turns on `noUncheckedSideEffectImports` by default, so `import 'x.css'` needs a declaration.
- **Vite 8** builds with Rolldown.
  - Library mode names the stylesheet after `lib.fileName` unless `build.lib.cssFileName` is set.
  - A single-file bundle drops `'use client'` without a warning; a Server Component rendering that component then fails with `useRef is not a function`. `preserveModules` keeps the directive on the right file.
  - Its Lightning CSS minifier adds `--lightningcss-*` variables where `color-scheme` appears.
- **Style Dictionary 5.5.5:**
  - only warns on name collisions, so set `log.warnings: 'error'`;
  - leaves DTCG duration objects as `[object Object]`;
  - resolves references inside `$extensions`, so mode values lose their aliases unless read from `token.original`;
  - turns typography into a `font` shorthand that drops letter-spacing.
- **Storybook 10.6:**
  - `@storybook/addon-mcp` requires `@storybook/addon-vitest`.
  - The default `react-docgen` dropped every variant and `Box` prop from the MCP docs; `react-docgen-typescript` fixed it.
  - On a cold cache, Vite discovered dependencies mid-run and reloaded, failing every test, until they were listed in `optimizeDeps.include`.
- **Play functions send simulated events,** and browsers don't act on them. Escape didn't close a native `<dialog>` until the test used Vitest's real input. That same real-input test later caught a genuine exit bug that a play function had passed.
- **Packaging:**
  - Declarations with extensionless relative imports failed attw under Node16 resolution.
  - A tarball packed without rebuilding shipped stale code; `prepack` builds prevent it.
- **npm trusted publishing** (`npm trust`, npm 12) requires the package to already exist, so each package's first publish is manual. npm/cli#8544 asks for this to change and is still open.
- **Claude Code** reads `AGENTS.md` by itself only when no `CLAUDE.md` or `CLAUDE.local.md` exists (v2.1.277 and later). A one-line `CLAUDE.md` containing `@AGENTS.md` works in every case.
- **Next.js 16.2** ships its docs as Markdown inside the `next` package, and `create-next-app` adds an `AGENTS.md` block pointing at them.
  - Vercel's evals: no docs 53%, a skill 53%, a skill with explicit instructions 79%, an `AGENTS.md` docs index 100%.
  - The index was compressed from 40 KB to 8 KB with no loss.
- **Base UI** (1.8.0, September 2026, about 18M downloads a week) became shadcn/ui's default in July 2026.
  - Its Dialog is a `div` with `role="dialog"`, not a native `<dialog>`.
  - It documents Motion integration through `render`, `keepMounted` and `actionsRef`.
  - Radix documents the same idea as `forceMount` plus `asChild`.
- **Figma scopes:** `Variable.scopes` filters pickers without blocking binding. What an empty array does isn't documented, so Phase 3 verifies it.

**What else was pruned, and why.** Each cut had a standard alternative or too little return for a small team:

| Cut | Why |
|---|---|
| Custom ESLint plugin (5 rules) and Stylelint plugin | Core and widely used rules with generated lists cover every case |
| Consumer-side MCP server built from a manifest in the package | Bundled docs plus an `AGENTS.md` block, the Next.js pattern, need no running server and beat retrieval in Vercel's evals |
| `llms.txt` family, `DESIGN.md` export | No consumer for them in the agent loop that matters |
| Separate docs site | Storybook's static build is the docs site |
| Token diff bot, JSON Schema validator | Reviewers read the JSON diff; validation runs inside the build |
| React 18 test matrix | React 18 passed with no code changes; a smoke build covers it |
| CI library check | The REST endpoints on this plan return variable IDs, not names |
| Figma-originated renames | Renames in code rename the Figma variable in place by its stamped path, so the round trip only needs values |

### Claude Design constraints

- `/design-sync` needs a React package with a built `dist/`, or a Storybook. Vue, Angular and Svelte are not supported, because Claude Design's renderer runs React.
- It has a known `[CSS_IMPORT_MISSING]` failure when token CSS resolves outside `node_modules`, which is what a pnpm workspace symlink does. A documented workaround (`extraEntries`) inlines the CSS.
- Claude Design exports to PDF, PPTX, standalone HTML and Canva, and hands off to Claude Code. There is no native Figma export. Getting a design into Figma means a capture or a rebuild through the Figma MCP server (see above).
- Claude Code gained a `/design` command in August 2026 that produces Claude Design artboards from the CLI.
- It is in beta and has changed substantially since April 2026. Depending on it is a risk; being compatible with it is cheap.

### Figma Make and plan constraints

- **Make kits** are available to Full seats on paid plans. Creating one was confirmed on the higher-education Education plan.
- **Publishing a kit needs Figma's npm registry.** Publishing uploads the kit as a package to Figma's private registry; a forum thread on publishing from CI shows republishing failing with "this package version already exists". On the Education team, publishing fails with "Your plan does not have npm registry access" (5 October 2026). Figma's npm help says it provides private registries for a Pro team or an organization, and staff say registry access is reaching Full seats in stages. A kit can't be published from Drafts either. Unpublished, a kit is usable only in its own file.
- **Kit packages** must build with Vite. Kit docs require React 18, though new Make files have run React 19 since 12 August 2026.
- **Public vs private packages:** any Make user can use a package from the public npm registry. Private packages need Figma's organization-scoped registry.
- **Copying a Make preview into Figma Design** binds matching variables, but the layers are linked to neither the design system nor the Make file.
- **The higher-education Education plan** mirrors Professional and includes Make, the Figma agent, and 3,000 AI credits per person per month. It is non-commercial, and students re-verify yearly.
- **Figma MCP limits:** 200 calls a day and 10 a minute on Education, per Figma's text. Its own table gives Professional 15 a minute, so the two disagree (see above); plan for 10. Write access through `use_figma` is free during its beta and planned to become usage-based.
- **Without Code Connect,** `get_design_context` still returns each instance's component name (`data-name`), its variant properties as TypeScript prop unions, and bound variables as `var(--name, fallback)` using the variable's code syntax. Exact naming parity between Figma and code is therefore enough for an agent to map instances onto real components.

### Distribution mechanics

With the portfolio site in a separate repository, the pnpm `workspace:` protocol is unavailable and some registry is required. GitHub Packages requires an auth token even for public packages, making it a poor front door for open source. Git dependencies handle monorepo subdirectories badly and provide no real semver. Public npm is the answer by elimination.

npm is restricting tokens that bypass 2FA. Re-checked September 2026:
- Since 31 July 2026, 2FA-bypass tokens can no longer manage accounts, orgs or packages.
- From January 2027, granular access tokens lose the ability to publish directly. The remaining options are trusted publishing via OIDC, or staged publishing with 2FA approval.

Trusted publishing from GitHub Actions is the correct setup, and is cheap to configure at project start.

### The Phase 4 build (October 2026)

Building the component package's foundation settled these, each checked against the installed version:

- **pnpm 12.8** blocks dependency build scripts by default, and fails the install until each is approved or denied. esbuild's only checks its platform binary, so it is denied (`allowBuilds: { esbuild: false }`); esbuild runs from its optional platform package without it.
- **Vite 8.3:**
  - `build.rolldownOptions` replaces `rollupOptions`, which remains as a deprecated alias.
  - `build.cssMinify` follows `build.minify`, so turning minification off also skips Lightning CSS.
- **`vite-css-modules` 1.16** has a CLI that reads `patchCssModules()` from the Vite config. In default-export mode its `.module.css.d.ts` keeps dashed class names as exact keys, so indexing a missing class fails type-checking.
- **Storybook 10.6:**
  - `addon-vitest` injects the project-annotations setup file itself; its Vitest 4+ template has no `setupFiles`.
  - `addon-a11y` runs axe 4.13. With `test: 'error'`, a contrast failure fails the story's test.
  - `@storybook/react-vite` already bundles `@joshwooding/vite-plugin-react-docgen-typescript`, which Phase 6 needs.
- **Vitest 5** lets a project config declare its own projects. From the root, a nested project's name is prefixed with its parent's, as in `react (unit)`.
- **`stylelint-declaration-strict-value` 1.12** checks shorthands longhand by longhand with `expandShorthand`, and accepts any function unless `ignoreFunctions` is off. **`stylelint-value-no-unknown-custom-properties` 6.1** accepts a `var()` with a fallback (ADR 0008).
- **TypeScript 6** checks side-effect imports everywhere, including a Storybook preview's `import './preview.css'`.
- **Chrome** keeps its Tab starting point on an element after `blur()`, so the next real Tab moves past it and can leave the page. Real-input tests focus a sentinel at the start of the page first.
- **Testing Library**'s accessible-name calculation doesn't name a `<figure>` from its `<figcaption>`, though Chrome does.
- **`vitest/browser`** in Vitest 5 drives `tab`, `keyboard`, `click` and `hover` through Playwright, so `:hover` and `:focus-visible` behave as they do for a person. Storybook 10.6's composed stories render through `Story.run()`.
- **CSS transitions appear in `element.getAnimations()`.** Their `finished` promises settle correctly when a transition is reversed or cut short, where `transitionend` doesn't: a reversed transition runs for less than its full duration, and the one it replaced fires `transitioncancel`.
- **Floating UI 0.27** ignores presses on elements added to the page after a floating element opens, treating them as injected by a browser extension.
- **Real input in Vitest's browser mode** goes to whichever frame has focus, so test files running in parallel frames take each other's keystrokes. Real-input projects set `fileParallelism: false`.
- **The React Compiler's lint** treats an object holding a ref as a ref: reading its other fields during render is reported. Destructure such a hook's result.
- **Chromium headless** records video from a canvas with `MediaRecorder`, so a story can load a real clip without a video file in the repository.
- **A declaration inferred from `createElement`** copies the full props of the `@types/react` it was built with, including types other versions lack, such as 19.3's `SubmitEventHandler`. A consumer's type-check then fails inside Fossil. Explicit return types avoid it.
- **React 18's server renderer warns about `useLayoutEffect`;** React 19's doesn't. Libraries that support both use a layout effect in the browser and a plain effect on the server.
- **Vite 8's bundler** prints a `MODULE_LEVEL_DIRECTIVE` notice for each `'use client'` module it bundles. `@vitejs/plugin-react` 6.1 silences it for `use client` and `use server`.
- **Next 16.3 with Turbopack** builds and prerenders a Server Component page from Fossil's tarballs. In its production build, Motion 14's `AnimatePresence` ran `Modal`'s panel through `renderPanel` with no console errors.
- **`eslint-plugin-jsx-a11y` 6.10.2** declares ESLint 9 as its highest peer, so it doesn't run on ESLint 10. Storybook's axe checks cover the rendered output instead.
- **A Figma Make kit built from `@fossil-design/react` 0.2.0** renders `Box`, `Stack`, `Text`, `Button` and `Card` with Fossil's tokens, responsive and in both themes, with no CSS setup beyond the guidelines.
- **Make's properties panel doesn't respect Fossil's tokens.** Its dropdowns list every `--fossil-*` custom property, primitives included, with no filtering by type: space tokens appear under font size. Figma doesn't document where the list comes from; Fossil's Figma variables are scoped and hide primitives, so it is most likely read from `tokens.css`, whose custom properties have no type. An edit made in the panel is applied by Make's agent, which writes the raw value, and a rule in `Guidelines.md` telling it to write semantic tokens didn't change that. Make stays one-way: Claude Code rebuilds a prototype with Fossil's components and lint, so raw values in a Make file don't reach code.

### The Phase 5 build (October 2026)

Building the ESLint config, the escape count and the off-system check settled these, each checked against the installed version:

- **`@eslint-community/eslint-plugin-eslint-comments` 4.8.1** accepts ESLint `^10`. Its `require-description` rule takes an `ignore` list of directive kinds; Fossil ignores `eslint-enable`, `eslint-env`, `exported`, `global` and `globals`, which disable nothing.
- **typescript-eslint 8.71** enables `@typescript-eslint/no-deprecated` in `strictTypeChecked` only, so a consumer on `recommendedTypeChecked` needs Fossil's `deprecations` option to get it.
- **ESLint 10's flat config** replaces a rule's options when a later config sets the same rule, so a consumer's own `no-restricted-syntax` would silently drop Fossil's. The package exports its entries for merging.
- **ESLint and typescript-eslint lint text with no file on disk.** With `projectService.allowDefaultProject`, a type-aware rule such as `no-deprecated` runs on `lintText` input.
- **A JSX comment can't sit before an element** directly inside `cond && ( … )`; a `//` comment there works, and ESLint reads it as a directive.
- **Stylelint 17's CLI writes its report to stderr**, the JSON formatter included. `--output-file` writes it to a file, as ESLint's does.
- **pnpm 12.8's `minimumReleaseAge`** refuses a version published within the cutoff. `pnpm add` of such a version writes `minimumReleaseAgeExclude` entries into `pnpm-workspace.yaml` by itself; Fossil drops them and waits for the version to age instead.
- **`git grep -z` on a tree** prints `rev:path`, the line number and the text separated by NUL bytes, so the escape count reads a base commit without checking it out.

### The Phase 5b build (October 2026)

Building the Figma component library on the scratch file settled these, each measured live through `use_figma` unless a source is given:

- **`use_figma` rewrites a script that contains an `svg` tag.** With `<svg` anywhere in its text, even inside a string, the script is re-printed before it runs, every function re-indented, so `Function.prototype.toString` no longer returns the source sent and each Fossil script's hash fails. Probes isolated it: an escaped quote, quoted object keys, a URL or a template literal change nothing, while a string holding `<svg></svg>` does. Fossil builds SVG markup at run time, and its generator refuses a script with an `svg` or `path` tag.
- **`figma.skipInvisibleInstanceChildren` starts on** in `use_figma`, so the inside of a hidden instance, such as a `Button`'s hidden icon, can't be found until a script turns it off.
- **Binding `strokeWeight`** stores the binding on `strokeTopWeight`, `strokeRightWeight`, `strokeBottomWeight` and `strokeLeftWeight`; `boundVariables.strokeWeight` stays empty.
- **A component's description comes back HTML-escaped,** as a variable's does.
- **A number variable bound to line height is read as pixels** (Figma forum, "Allow percentages for line height"), so a unitless 1.6 can't bind. Text styles set line height as a percentage instead. Line height and letter spacing come back as 32-bit floats.
- **Figma's Space Grotesk has Light, Regular, Medium and Bold only,** no SemiBold, though Google Fonts' current version has it. Figtree and Space Mono have every weight Fossil uses. A variable font's `fontName` gains `variationSettings`.
- **Setting `textCase` on a text layer detaches its text style,** since case is part of a Figma text style.
- **A text underline keeps its text style and a variable-bound colour, but not paint opacity.** `textDecorationStyle: 'DOTTED'` with a `textDecorationColor` bound through `setBoundVariableForPaint` holds both; the paint's `opacity` comes back as 1. Figma also sets the dots' spacing itself. So `Link`'s dim track stays a line layer: a round-capped stroke with a dash pattern, at 35% layer opacity, stretched to the label's width.
- **Slots** reached general availability in the Plugin API on 10 June 2026 (`createSlot`, a `SLOT` property, `slotSettings`). A slot and its `SLOT` property share one name: renaming the property renames the slot, and `editComponentProperty` refuses a rename to the name it already has. A slot can be moved into a frame inside the component. Replacing slot content in an instance through `use_figma` was still unreliable in July 2026 (Figma forum).
- **After a main component changes,** its instances elsewhere don't show the change until the next `use_figma` call.
- **A renamed instance keeps its name when swapped;** one left alone takes the name of the component it's swapped to.
- **Twice, a script that failed partway left nothing behind,** though `figma-use` no longer promises that. Fossil's scripts still check before they write.
- **`get_design_context` without Code Connect:**
  - an instance whose overrides are only text and boolean properties arrives as a call, such as `<Button children="Save changes" icon />`, with a generated props type: variant properties as string unions (`"true"` and `"false"` become `boolean`), text properties as `string` and booleans as `boolean`, all under the Figma names;
  - an instance with a swapped nested instance, or with an instance-swap property set, is inlined as markup with `data-name="Button"`, its values as `var(--fossil-…, fallback)`;
  - a glyph instance named after its component arrives as `<CloseIcon />`;
  - component descriptions and the text styles used are listed after the code.
- **Figma's MCP rate-limit page** still gives Education 200 calls a day and 10 a minute, and doesn't mention `use_figma`.


### The Phase 6 build (October 2026)

Building the bundled docs settled these, each checked against the installed version or the source given:

- **Storybook 10.6** ([manifests](https://storybook.js.org/docs/ai/manifests.md), [best practices](https://storybook.js.org/docs/ai/best-practices.md)):
  - `features.componentsManifest` is still off by default. The manifest, at `/manifests/components.json` in a build, carries each component's JSDoc, its props and a snippet per story, and a story leaves it with `tags: ['!manifest']`. Storybook recommends `react-docgen-typescript`, and JSDoc on components, props and stories.
  - Its snippets print what a story does: `onClick={fn()}` spies, story-only helpers, and wrong JSX for some children, such as `<Card>(<>…</>)</Card>`, a fragment printed with its parentheses as text. `features.experimentalCodeExamples` doesn't change the manifest's snippets.
  - `typescript.reactDocgenTypescriptOptions` replaces Storybook's defaults rather than merging with them.
  - `@storybook/addon-mcp` 10.6.1 serves `docs-list`, `docs-show` and `docs-show-story`, `test-run`, and the development tools at `localhost:6006/mcp`. `docs-show` returns a component's JSDoc as written, so the contract's Markdown sections reach it.
- **react-docgen-typescript 2.4** (June 2025, still the latest) runs on TypeScript 6.0 and parses all 16 components in about a second. It skips an undocumented `children` unless `skipChildrenPropWithoutDoc` is off. When another export in a file has a JSDoc comment, it misreads a component exported through a type assertion (`Box`, `Stack`, `Text`): it takes that comment as the component's and finds no props. On a `forwardRef` component, it reports the commented export as a second component instead.
- **Next.js 16.3** ([AI agents guide](https://nextjs.org/docs/app/guides/ai-agents)) writes its `AGENTS.md` block itself when `next dev` detects an agent, between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->`, keeps what's outside the markers, and adds `@AGENTS.md` to `CLAUDE.md`. The block has become one instruction to read `node_modules/next/dist/docs/`; the 16.2 codemod's compressed index is now the legacy path. `agentRules: false` opts out.
- **Claude Code** reads project MCP servers from `.mcp.json`, with `"type": "http"` for a streamable HTTP server, and asks each person to approve them in an interactive session ([docs](https://code.claude.com/docs/en/mcp)).
- **Figma Make**, tried on 6 October 2026 in a kit file on the Education team, with `@fossil-design/react` 0.4.0 installed:
  - Make's agent reads files under `node_modules`. Asked about Fossil's docs, it quoted `README.md`, `docs/index.md` and `docs/components/Button.md` correctly, so the Make guidelines can point into the package with no copy step.
  - Figma's guidelines article says `guidelines/Guidelines.md` is what Make "always looks at first", and doesn't mention `AGENTS.md` ([guidelines](https://help.figma.com/hc/articles/43602393097239)). Asked to add a pointer to Fossil's docs, Make's agent put it in the project's `AGENTS.md`; it belongs in `Guidelines.md`.
  - With the pointer in `Guidelines.md`, a prompt for a projects page that never mentioned Fossil made Make read `Guidelines.md`, then `foundations.md`, `index.md` and each component's doc. It built with `Box`, `Stack`, `Text`, `Card` and `Button`, token keys only, light and dark. The one off-system line was `className="grid-cols-1 md:grid-cols-3"`: the scaffold's own `AGENTS.md` describes a Tailwind v4 project and says to "use Tailwind utility classes directly in JSX", and `Box`'s `style` can't change per breakpoint.
  - The scaffold's `AGENTS.md` puts global font wiring in `src/index.css`, `@import` statements first. With no font step in the guidelines, the page fell back to system fonts. In an earlier kit whose guidelines Make generated itself, the fonts loaded. Tailwind's docs require a font service's `@import url(…)` above `@import "tailwindcss"`, since browsers ignore an `@import` after any other rule ([font-family](https://tailwindcss.com/docs/font-family)).
  - A new kit's generated `guidelines/` files are placeholders: `components.md` and `tokens.md` refer to steps `setup.md` doesn't have, `setup.md` lists no packages, and `tokens.md` tells Make to list every custom property in the stylesheet, primitives included.
- **Figma Make without a kit**, tried on 6 October 2026 with `@fossil-design/react` 0.5.0, the first version with `guidelines/`:
  - A new Make file has a `guidelines/` folder but no `Guidelines.md` in it, so the person creates the file and writes the one-line pointer before the first prompt.
  - The same projects-page prompt, which never mentioned Fossil, built on-system. `src/index.css` matched `setup.md` line for line: the Google Fonts `@import`, then `style.css`, then Tailwind, then the body's ground. Space Grotesk and Figtree loaded. The page used `Box`, `Stack`, `Text`, `Card` and `Button` with props that all exist in 0.5.0, a per-breakpoint `direction` on `Stack` for the cards, no Tailwind classes, and a stylesheet of its own that used only semantic tokens. Light, dark and a phone width all held.
  - The guidelines' override of the scaffold's `AGENTS.md` was enough: Make kept its Tailwind setup and used none of its classes. Deleting the scaffold's files isn't needed, and a package that deletes an app's files would also delete a team's own guidelines.
- **The `AGENTS.md` block in a consumer**, tried on 7 October 2026 in a scratch app with `@fossil-design/react` 0.5.0 from npm:
  - With the network denied by macOS `sandbox-exec`, `fossil-agents-md` appended the block after the app's own `AGENTS.md` content and added `@AGENTS.md` to `CLAUDE.md`. A second run changed neither file. `--check` exited 1 on a hand-edited block, and a rerun restored it and kept notes written after the block.
  - A headless Claude Code session with only `Read`, `Glob` and `Grep`, no MCP servers and project settings only, asked for the components and token rules, went from the block straight to `docs/index.md`, `foundations.md` and `tokens.md`. It listed all 16 components, the spacing scale, the 12 text styles, the 23 colour tokens, the layout rules, the three escape hatches and the four gap fields, each matching the installed docs.
- **Figma's library split**, tried on 7 October 2026 on new scratch files in the Education team: a foundations file with main's variables (136), text and effect styles and icons, and a components file with `Icon` and `Button` ([ADR 0018](decisions/0018-figma-foundations-and-components.md)):
  - A "can edit" member published the foundations file from the team's project, so publishing works on Education.
  - The Plugin API can't turn a library on in a file ([`teamLibrary`](https://developers.figma.com/docs/plugins/api/figma-teamlibrary/)); the person does, from the Assets panel. Then `getAvailableLibraryVariableCollectionsAsync` and `getVariablesInLibraryCollectionAsync` list its variables with their keys. Nothing lists its styles or components, so their keys come from the foundations file.
  - A variable imported with `importVariableByKeyAsync` keeps its shared plugin data: `color/text/muted` came back stamped `color.text.muted`, with `var(--fossil-color-text-muted)` as its code syntax and `TEXT_FILL` as its scope. Its collection kept the stamped commit. A text style and an icon imported by key kept their stamps too.
  - `Icon` and `Button` built from imported variables, the library's `text/control` style and its `CloseIcon`: all 188 bindings resolved to stamped library variables, and the components file had no variables or styles of its own.
  - After the components file was published, `base/color/blue/600` changed in the foundations file, published, and the update was accepted, the primary `Button`'s fill stayed bound to `color/accent/default` and showed the new colour.
  - `get_design_context` on a `Button` instance gave `<Button children="View project" icon />` and `var(--fossil-…)` for every library variable; on a standalone `Icon`, it gave the library glyph as `<CloseIcon />`, as in Phase 5b.
  - A third file with only the foundations library on, and no variables of its own, bound a rectangle's fill to `color/background/surface`, stamped, with its code syntax.
  - `Button`'s small text variants are 34px tall in Figma, not code's 32px, in Phase 5b's file and the new one alike: the height of the hidden 18px icon plus padding, though Figma usually leaves hidden layers out of auto layout. The check reads no sizes, so it passes; not yet investigated.

---

## 6. Decisions and rationale

| Decision | Choice | Rationale |
|---|---|---|
| Primary problem | Both layers, context and constraint | The unoccupied ground; either alone is a solved and published problem |
| Source of truth | Git repo, DTCG JSON | Universal industry practice; git provides review, validation, semver, diffs that Figma cannot |
| Token spec | DTCG, with `$extensions` where needed | Interoperability is part of the thesis; `$extensions` is the sanctioned escape |
| Tiers | Primitive and semantic only | Component tokens are in retreat industry-wide (Adobe v12, Fluent ratios) |
| Transform | Style Dictionary v5 | De facto standard; first-class DTCG; Node 22+ acceptable |
| Styling | React + CSS Modules, with strict generated class-name types and a typed variant map per component | Reversed from vanilla-extract after the dry run: the same accuracy from off-the-shelf tools, one Stylelint config shared by Fossil and every consumer, and plain CSS that forks and agents already know. Primer made the same move |
| Repo | Monorepo, pnpm workspaces | Solo maintainer; one token build feeds the CSS, lint lists, `Box`'s CSS and the Figma sync, so a token change is one PR; template adoption copies one repo. Carbon, Fluent UI and Atlassian keep tokens and components in one monorepo; Primer and Spectrum split because their tokens feed several implementations (section 3.11) |
| Style linter | Stylelint, via `@fossil-design/stylelint-config` | Consumers author CSS, so the linter matches their format. `declaration-strict-value`, `value-no-unknown-custom-properties` and core rules with generated token lists; no custom rules |
| JSX linter | ESLint, via `@fossil-design/eslint-config` | The raw-element ban is a JSX rule Stylelint can't express; core `no-restricted-syntax` does it without a custom plugin |
| Figma sync | Fossil's own sync core and scripts, carried to Figma by an agent through `use_figma` | The REST API is Enterprise-gated and the MCP server only accepts approved agents; the logic must be deterministic, so only the transport is delegated; keeps tokens as native Variables so Dev Mode and the Figma MCP output keep working |
| Seed | Tokens and components extracted from the finished portfolio, with a recorded old-to-new mapping | The origin story; every Fossil component replaces something real, and the Phase 8 migration becomes mechanical |
| Promotion | Gaps logged as issues and reviewed at each release; three for the same need trigger a review; outcomes are component, pattern or keep local | Fixed counts are rules of thumb; 2026 practice logs gaps and records decisions; a documented pattern often beats a new component |
| Not adopted | Evil Martians' `design-system` skill | Its contracts would be a second, hand-maintained description of each component; it assumes system and product share a repo; it covers no constraint layer and is weeks old. Fossil borrows its contract fields and gap format |
| Sync procedure for agents | A `fossil-figma-sync` skill, built right after the scripts | Only an agent can call `use_figma`; the skill pins the steps and forbids hand-written Plugin API code; it loads on demand, which keeps `AGENTS.md` for foundations, and works across agents |
| Agent instruction file | `AGENTS.md`, with a one-line `CLAUDE.md` importing it; one `AGENTS.md` per package where rules differ | The cross-tool standard: 25+ agents, maintained by the Agentic AI Foundation under the Linux Foundation, used by 60,000+ projects. A fork's contributors and Fossil's consumers may use any agent. Claude Code reads `AGENTS.md` alone only when no `CLAUDE.md` exists, so the import covers every case. Sections follow GitHub's analysis of 2,500+ files: commands, testing, project structure, code style, git workflow and boundaries |
| Deferred | Figma plugin adapter | Same core behind a push button; build it if `use_figma` pricing, rate limits or a designer without an agent require it |
| Write boundary | Only values round-trip; renames, additions and deletions are code-only | A new variable created in Figma has no description, no considered tier placement and no review, so it is a proposal, not a change. A rename made in code renames the Figma variable in place through its stamped path, so supporting Figma-side renames would add diff paths for no new capability |
| Design tools | Consumers of the git source, never sources | Figma, Figma Make and Claude Design all lack review, diffs and semver; Figma's value and rename round trip is the only write path back |
| Prototyping tool | Figma Make, with a kit built from the npm package | Ingests a real React package just as Claude Design does, but sits next to the Figma library, is readable by the Figma MCP server, and is included in Education and Professional plans |
| Claude Design | Deferred to a later release | Does the same job as Figma Make; `/design-sync` would consume the same built package, so adding it later costs a compatibility check |
| Plan tier | Everything must work on Figma Professional or Education | Fossil is for students and small teams; Code Connect and the Variables REST API are out of reach |
| Component mapping | Exact naming parity between Figma and code | Replaces Code Connect, which needs Organization or Enterprise; `get_design_context` returns names and variant props without it |
| Figma component library | Required, generated from code | Narrows design-side output the way the closed `Box` API narrows code: instances reach Claude Code as named components with variant props, while frames drawn from raw shapes arrive as generic boxes |
| `Box` and `Stack` in Figma | Left out of the library | Auto layout already does their job; frames bound to Fossil variables reach Claude Code as `var(--fossil-*)` values that map onto their props |
| Stylelint config timing | Built first in Phase 4, not Phase 5 | Phase 4's exit criterion lints every component stylesheet with it, and a stylesheet linted from its first line needs no clean-up (ADR 0008) |
| Raw colours | Rejected in every value, not only in colour properties | The strict-value rule only sees the properties it is given, so a raw colour in a local custom property or a shadow would otherwise pass |
| Icon set | Only the Material Symbols Fossil's own components use, listed in one file; `Icon` also takes any SVG component | A curated set keeps icons inside the closed surface. The rounded set alone is 3,927 icons, and every one would reach the agent docs. Adding an icon is a one-line change |
| Popover focus | Floating UI's focus manager; no `focus-trap-react` | The portfolio's `Popover` already uses it. `focus-trap-react` belongs to the portfolio's `NavBar`, which stays there |
| `Box` responsive props | One generated class per prop, value and breakpoint; `padding` resolved to block and inline longhands in JavaScript | Media queries need classes. With longhands only, the wider breakpoint wins, and at one breakpoint the longhand wins (ADR 0009) |
| `Box` surfaces | Only fill and text pairs the token build checks for contrast | The generator fails on any other pair, so `surface` can't produce an unchecked combination |
| Icon pipeline | Components generated at build time from `@material-symbols/svg-400`, named in `icons.json`, with the Apache-2.0 license copied into `dist` | Consumers need no SVGR, the icons stay version-matched, and the license travels with them (ADR 0010) |
| `asChild` | React's `cloneElement`, with no slot library | One small merge of `className` and children; the child keeps its own element, props and ref |
| `Figure` width | No `displayWidth`; apps size a figure through `className` | None of the portfolio's 8 figures or 5 clips sets one |
| Motion in Fossil | CSS transitions with `@starting-style` and `data-state`; `usePresence` keeps an element mounted until `getAnimations()` settles | The durations stay in the motion tokens, reduced motion needs no special case, and no animation library reaches forks (ADR 0011) |
| Extension points | `Modal`'s `renderPanel` and `onShowingChange`, `Tabs`' `renderIndicator`, `Carousel`'s data attributes, `Link`'s `asChild` | Only where a library must own an element's lifecycle, and each library-neutral |
| Translucent backgrounds in the contrast check | Laid over white and over black, keeping the lower ratio | A veil over a photo has unknown footage beneath it; the worst case is the honest check |
| Token access | Components and compositions use semantic tokens only. Typed props accept only semantic token keys, and the Stylelint config rejects primitives outside a consumer's site-tokens file | Keeps the two tiers meaningful: changing a primitive value restyles everything built on it, which is also what makes Fossil adaptable |
| Primitive names | Every primitive sits under a `base` group: `--fossil-base-color-gray-600` | Enforcement keeps primitives out of components, but Make's properties panel and hand-written CSS see every name. Primer marks its primitives `base-` the same way (ADR 0013) |
| Terms | "Primitive" means the raw token tier only; product-specific components are "compositions" | Both words were overloaded, which confuses people and agents alike; one name per concept |
| Library generation | A script writes each component's spec (names, variants, bindings) from code and checks the built result; the agent builds the frames | Names and bindings must be exact, so they come from code and get verified; only the frame layout needs judgment |
| Library spec sources | Each component's JSX through the TypeScript compiler, its CSS Module through PostCSS, and a small reviewed table for what code can't say | CSS alone misses the token props components pass to `Box` and `Text` in JSX; a render needs a DOM and real input for portals and measured states (ADR 0015) |
| Library styles and icons | A generated script, stamped and checked before it writes, like the variables' apply | Every name and binding comes from the token build, so none is the agent's choice |
| Library layout | One Components page, a section per component; layers named after the CSS class or state selector they stand for | The check reads the whole library with one page switch, and code names every layer it looks for |
| Figma properties | Named after the props: text, boolean, instance swap for `Icon`'s glyph, slots for an app's content; no state variants | `get_design_context` returns them under those names; a `state` property would name a prop that doesn't exist |
| `VisuallyHidden` in Figma | Left out of the library, with `Box` and `Stack` | It renders nothing visible, so an instance would be an invisible layer |
| Heading weight | 700, Space Grotesk Bold | Figma's Space Grotesk has no SemiBold, so at 600 code and Figma's text styles couldn't match |
| Figma library files | Two published libraries: foundations (variables, styles, icons) and components, which imports them by key | A fork swaps its brand or its components without the other; an imported variable keeps Fossil's stamp, so the spec and the check still name tokens by path (ADR 0018) |
| Make guidelines | Shipped in `@fossil-design/react` as `Guidelines.md` and `setup.md`, routing into the bundled docs by full path; a Make file's own `Guidelines.md` is one line pointing there, with the kit optional | One copy that versions with the components, and it works on any paid plan: publishing a kit needs Figma's npm registry, which the Education team lacks. Make reads `node_modules`, so the docs aren't copied (ADR 0017) |
| `AGENTS.md` block | The rules, the tokens in brief and the components by group, under an 8 KB budget the build enforces; the `fossil-agents-md` bin writes it between markers and adds `@AGENTS.md` to `CLAUDE.md`, and `--check` fails an app's CI when it's stale | Foundations stay always-on, as Vercel's evals favour, at the size Vercel's index came down to; the markers and the import follow Next.js (ADR 0017) |
| Utility classes | Ruled out in the rules every rendering shares, with a pattern for grid columns that change per breakpoint | Make's scaffold pushes Tailwind, and its classes skip the tokens and both lint configs. The need was generic and already possible, so the gap closed as a pattern |
| Fonts in Make | A complete `@import url(…)` snippet, first in `src/index.css`, in the package's `setup.md`; the build checks it names every font family the tokens use | Make's scaffold wires fonts there; a `fonts.css` in the package would make every fork fetch the reference brand's fonts |
| Make kit tokens | From the npm package, not the Figma library | Make flattens library variables into raw CSS values that would compete with `--fossil-*` |
| Margins | No margin prop on `Box`; a margin in CSS fails lint unless it's `0` or carries a disable comment with a reason | Harvested from the portfolio's rule: spacing comes from padding and `gap`, and a margin needs permission and a reason. A lint error that only a written reason can pass keeps the original "ask first" exception, and every use shows up in the escape count |
| JSX lint | `@fossil-design/eslint-config` bans exactly the elements `Box` renders, and requires a reason on every disable | Every banned element has a replacement; a workspace test keeps the list equal to `boxElements` (ADR 0014) |
| Escape count | Disables of Fossil's rules outside tests, reported in a CI job summary with the ones a pull request adds; it never fails | Routine TypeScript disables would bury the signal; a job summary needs no write permission, which pull requests from forks lack |
| Gap log | Issues from a `gap` form, closed with a decision label and a written reason | A consumer's agent can open an issue but can't write to a ledger in Fossil's repository (`docs/gaps.md`) |
| Figma mapping key | Shared plugin data under a `fossil` namespace | Agents writing through `use_figma` run as a different plugin and cannot read private plugin data |
| Lifecycle metadata | DTCG `$deprecated`, plus `$extensions` for `replacedBy` and `since` | `$deprecated` is standard in 2025.10; the extra fields stay in the sanctioned escape |
| Vendor key | `com.ibrahimmoazzam.fossil`, kept by forks | DTCG recommends reverse domain names; built on a domain the author owns; it names Fossil's extension format, not a brand (ADR 0005) |
| Modes | Dark values as aliases under the vendor key on each semantic token | DTCG's format has no modes and Style Dictionary 5.5.5 doesn't read the Resolver module; one token keeps both values in one diff |
| Spacing | One semantic scale for padding and gap; primitives named as a percentage of 8px | The portfolio uses every step for both; Carbon and Atlassian do the same; the 8px percentage has room for 2px |
| Colour values | DTCG colour objects, transparency in `alpha` | 2025.10 doesn't accept hex strings; Style Dictionary 5.5.5 reads the objects natively |
| Inventory record | In the portfolio repository, not in Fossil | The Phase 8 migration runs there, the record only serves that site, and the repository is private |
| Component contract | Markdown sections in each component's JSDoc: a summary, When to use, When not to use, States, and Accessibility split into Built in and Up to you | One description that reaches the type declarations, the editor, Storybook's manifest and the bundled docs; Markdown in the description shows as written everywhere, while each tool decides how to show a custom tag (ADR 0016) |
| Docs examples | Stories tagged `example`, read from their source and checked to use only what an app has | They render and pass axe like every story; Storybook's manifest snippets print spies, story helpers and some wrong JSX (ADR 0016) |
| Component context | Markdown docs bundled in `@fossil-design/react`, indexed by a generated `AGENTS.md` block; Storybook `addon-mcp` for Fossil's own development | The Next.js pattern: version-matched, offline, no server to run. Vercel's evals found an always-on index beat skill-based retrieval (100% vs 53–79%) |
| Token context | `tokens.json`, a `tokens.md` in the bundled docs, and foundation rules in the `AGENTS.md` block | Foundations must be always-on; one token build feeds every rendering |
| Distribution | Public npm, `0.x` during development, `1.0.0` at Phase 8. Each package's first version is published by hand, then OIDC | Separate site repo removes `workspace:`; `0.x` keeps renames cheap while the taxonomy churns; `npm trust` needs the package to exist first |
| React package build | Precompiled via Vite library mode with `preserveModules`, tokens bundled into one `style.css` | Consumers configure nothing; `preserveModules` keeps `'use client'` on the components that need it |
| Adoption model | A template to fork, with the published packages as the reference brand | The Figma round trip needs a team to own its token source, which only a fork gives it |
| Behaviour layer | Harvested from the portfolio, native elements first; Fossil owns the accessibility | The portfolio's versions exist and use native `<dialog>` and scroll-snap. A fork can swap a headless library in per component without touching the pipeline |
| Animation | CSS transitions in Fossil; Motion added by the consumer through extension points | Every portfolio component's core behaviour is native and Motion only polishes it, so it shouldn't be a dependency every fork inherits |
| Fonts | None shipped; font tokens name stacks, and the reference brand uses open fonts: Space Grotesk, Space Mono and Figtree | Roobert is commercial, `use_figma` can't load custom fonts, and forks shouldn't inherit a licence question. The portfolio keeps Roobert by pointing `font.family.heading` and `font.family.mono` at it |
| Figma Make | Kept in v1 | Prototyping with the real package from day one; its guidelines are generated from the same bundled docs |
| TypeScript | Pinned to `~6.0.3` | TypeScript 7 has no JavaScript API yet, which `typescript-eslint` and docgen need |
| Site location | Separate repository | Forces the packages to be genuinely consumable and dogfoods the upgrade path |
| Name | Fossil Design, or Fossil for short | A bare "Fossil" competes in search with Fossil the version control system and Fossil the watch brand. The full name matches the npm scope and the repository, as Ant Design's does; Carbon Design System and Carbon follow the same full-and-short pattern. The CSS prefix stays `fossil`, as Ant Design's stays `ant` |
| npm scope | `@fossil-design` | `@fossil` unavailable; `-design` follows `@ant-design` precedent, stays legible to non-specialists, and disambiguates from Fossil the version control system |
| Repository | `fossil-design` under a personal account | Matches the npm scope, so the packages and the code are found by the same words, as with `@ant-design` and `ant-design/ant-design`. The first name, `fossil`, read like Fossil the version control system in a developer context. A personal account keeps the work attributed to a person |
| Package naming | Scoped, system-name-as-scope | One org reserves the whole namespace permanently; the lint configs take the conventional `@scope/eslint-config` and `@scope/stylelint-config` names |
| Rejected | Unscoped `fossil-*` names | Available, but every future package is a fresh gamble; the squatted `fossil` package shows the risk is real |
| Rejected | `@fossil-ds` | Terser, but "ds" is insider shorthand and a portfolio artifact is read by generalists too |
| Rejected | Bring-your-own-Figma-tokens | Arbitrary token taxonomies do not map onto Fossil's semantic layer; a separate product, not a feature |
| Rejected | GitHub Packages | Requires an auth token even for public packages; poor first-run experience for an open-source project |
| Rejected | Portfolio site inside the monorepo | `workspace:` symlinks hide exports-map, type-resolution and build-output bugs until someone else finds them |
| Rejected | Tokens Studio | Works and is the standard answer, but delegates the most interesting engineering in the project and adds a parallel token layer beside native Variables |
| Reversed | vanilla-extract, originally chosen over CSS Modules | The dry run showed its cost was internal plumbing consumers never see, plus a second enforcement stack. Variant maps and generated CSS Module types keep typed variants and class names |
| Rejected | Base UI or Radix as the v1 behaviour layer | Strong options (Base UI is shadcn/ui's default since July 2026), but the portfolio's native versions exist, and Base UI's Dialog isn't a native `<dialog>`. Kept as a per-component swap for forks |
| Rejected | Custom ESLint and Stylelint plugins | Off-the-shelf rules plus generated lists covered every check the five custom rules were meant for |
| Rejected | Serving component docs to consumers from an MCP server | Needs a running server per consumer; bundled docs are version-matched and always present |
| Rejected | `llms.txt` family and `DESIGN.md` export | No consumer in the agent loop Fossil targets; the bundled docs and `AGENTS.md` block serve it |
| Rejected | Claude Design as source of truth | Beta, changed through chat with no review, and no path back to git; be compatible with it, don't depend on it |
| Rejected | Authoring tokens in DESIGN.md | Alpha, and cannot express modes; generate it from DTCG if a tool needs it, never author it |

---

## 7. Case study angles worth developing later

- **The correction narrative.** An initial assumption that Figma should be the source of truth, overturned by surveying seven production systems and finding that none of them do it that way. Good material because it shows research changing a decision rather than confirming it.
- **The rename correction.** A second reversal, this time in Fossil's favour: what looked like an unsolvable diffing problem turned out to be solved by identity in the Plugin API (stable IDs, and a token path stamped on each variable), and better than the approach a major vendor ships.
- **The authoring-format argument.** Why "we emit CSS so we need Stylelint" is wrong, with Atlassian as the counter-example that proves the rule.
- **Constraint versus context as distinct failure modes**, with the on-demand MCP leak as the mechanical explanation for why context alone does not suffice.
- **Measuring drift.** If the eval harness produces a number, that number is the most publishable artifact in the project, because the field currently has none.
- **The cost of constraint.** Track how often escape hatches are used and what triggered them. Polar noticed the problem; a measured answer would be new.
- **Harvest, then dogfood.** The portfolio came first, was built in code, and seeded Fossil. Then it was rebuilt on Fossil from npm. The loop shows the system is grounded in a real product rather than guessed, and the migration shows it is consumable.
- **The agent as courier.** Figma's MCP allowlist means only an agent can reach Figma, while the sync must be exactly right every time. The resulting split has the agent make the one call it's authorised to make, while tested scripts do everything that has to be correct. The component library uses the same split, with the agent also doing the one part that needs judgment. It generalises to most agent tooling built on gated APIs.
- **Convenience versus honesty in distribution.** Keeping the site in the monorepo would have been easier and would have concealed whether the packages were genuinely consumable. Choosing the harder path deliberately, and then documenting what the first real upgrade broke, is more interesting than a system that only ever worked on its author's machine.
- **Extraction versus specification.** Figma Make can prototype from a system it extracts from a Figma library, or from Fossil's real package. Comparing the code each produces directly tests whether writing a system down beats inferring it.
- **A budget-tier pipeline.** Most published design-to-code pipelines assume Enterprise features: the Variables REST API, Code Connect, private registries. Building the whole loop on an Education plan, and documenting what replaced each missing feature, makes the work usable by the students and small teams who can't buy their way around the gaps.
- **One decision, two justifications.** Precompiling was chosen so consumers need no build setup. It turned out to be what an AI design tool's renderer needs too.
- **The dry-run reversal.** A third correction, this time from building rather than reading. vanilla-extract was chosen on paper for typed tokens and variants. A two-day prototype showed where its cost actually landed: plumbing consumers never see, and a second enforcement stack. CSS Modules with off-the-shelf lint rules matched its accuracy. A good illustration of spiking before committing.
- **Pruning toward standards.** The first draft specified five custom ESLint rules, a custom Stylelint plugin, a consumer-side MCP server and an `llms.txt` family. Each turned out to have a standard equivalent or no consumer. "What does the industry already ship for this?" is a useful question to ask of every custom piece.
- **Bundled docs beat retrieval.** Vercel's evals (an always-on docs index at 100% against skills at 53–79%) independently confirm the finding that pushed Fossil's foundations into always-on rules. The same result, from a framework rather than a design system.
- **Basic in the system, delight in the product.** Fossil's interactive components are native and Motion-free. The portfolio adds Motion through extension points. The design system carries behaviour and accessibility; the product carries its personality.

---

## 8. Source index

**Contribution and promotion**
- Evil Martians, AI makes design system guardrails mandatory (September 2026)
- zeroheight, Design Systems Report 2026
- Brad Frost, Design system components, recipes, and snowflakes (2021); The art of design system recipes
- Jeff Atwood, The Rule of Three; Rule of three (computer programming)
- `ymandrikov/ai-design-system` (the `design-system` skill, README, contract formats, scenarios); `evilmartians/design-lint`; `evilmartians/agent-skills`

**Token tier naming**
- Material 3 design tokens (`md.ref`, `md.sys`, `md.comp`); Primer, Token names; Salesforce Lightning Design System 2, Color and global styling hooks; Fluent 2, Design tokens; Adobe Spectrum, Design tokens; Carbon, Color; Polaris v12 tokens

**Primary case studies**
- Uber, automating design specs with uSpec and the Figma Console MCP
- Polar, Orbit: an LLM-safe design system

**Survey**
- Into Design Systems, agentic design systems compilation (GitHub Primer, Indeed, Spotify Encore, NY State)

**Repos and docs consulted**
- `primer/primitives`, Primer interface guidelines
- `atlassian.design/llms.txt`, `@atlaskit/tokens`, ADS MCP
- `adobe/spectrum-design-data`, RFC index and token format spec
- `carbon-design-system/carbon`, `@carbon/themes`, `carbon-mcp`
- `Shopify/polaris`, `polaris-tokens`, `stylelint-polaris`
- Fluent UI React v9 theming and Griffel
- Figma REST API variables reference, Plugin API variables guide, plugin manifest reference
- Style Dictionary v4 and v5 documentation
- Storybook `addon-mcp` documentation
- vanilla-extract global API documentation
- DTCG Format Module 2025.10
- Repository layouts, through the GitHub REST API and the Bitbucket API (October 2026): `carbon-design-system/carbon` and its Stylelint plugin, `microsoft/fluentui`, `Shopify/polaris` (archived), `primer/react`, `primer/primitives` and Primer's lint repos, `adobe/react-spectrum`, `adobe/spectrum-design-data`, `material-components/material-web`, `atlassian/atlassian-frontend-mirror`
- GitHub docs: About forks; Creating a repository from a template

**AI design tools**
- Figma Help Center: Get started with Make kits; Bring your design system package to a Make kit; Use your design system package in Make kits; Working with npm; Write design system guidelines for Make kits; Copy a Figma Make preview as design layers
- Figma Forum: npm registry not available despite a Full seat; Publishing a Figma Make kit from GitHub CI
- Figma Help Center: Figma for Education; AI credits on the Education plan
- Figma Forum, React 19 in Figma Make
- Analysis of `get_design_context` output (zenn.dev, yokkomystery)
- Anthropic, Introducing Claude Design by Anthropic Labs; Claude Design now stays on brand for daily work
- Claude Help Center, Set up your design system in Claude Design
- `/design-sync` technical walkthrough (wmedia.es); reviews in VentureBeat and Art of Styleframe
- Google Labs, `google-labs-code/design.md` and its spec

**Figma and Storybook agent tooling**
- Figma MCP server developer docs: tools and prompts, code to canvas, write to canvas, rate limits and access
- `figma/mcp-server-guide` skills (`figma-generate-library`, `figma-generate-design`)
- Figma Code Connect help article; Plugin API `Variable` reference
- Storybook MCP docs (overview, sharing), Chromatic MCP publishing, `@storybook/mcp` README
- Rachel Cantor, Storybook MCP reads your manifest, not your docs tab
- npm download statistics API, GitHub changelog on npm 2FA-bypass tokens
- Figma Forum threads on the remote MCP server's client allowlist and OAuth requirements
- Agent Skills specification (`agentskills/agentskills`, agentskills.io); Cursor skills documentation

**Figma component library (October 2026)**
- Figma Plugin API updates, 10 June 2026 (slots: `SlotNode`, `createSlot`, `SLOT` properties); `SlotNode` and `ComponentNode` references
- Figma Forum: Allow percentages for line height; Figma MCP: Claude unable to replace slot contents
- Figma MCP server developer docs, rate limits and access (re-checked 5 October 2026)
- `figma/mcp-server-guide` skills `figma-use`, `figma-generate-library` and `figma-design-to-code`, with the Plugin API typings they ship

**Dry run and pruning (September–October 2026)**
- agents.md (format, supported tools, stewardship); GitHub Blog, How to write a great agents.md: lessons from over 2,500 repositories; Primer React `.github/copilot-instructions.md`
- GitHub Blog, Improving site performance by shipping more CSS (Primer's move to CSS Modules); Primer React v38 release discussion
- State of CSS 2025, other tools
- Next.js blog, Next.js 16.2: AI improvements; Vercel blog, AGENTS.md outperforms skills in our agent evals
- Claude Code docs, How Claude remembers your project (AGENTS.md loading rules)
- npm docs, Trusted publishing for npm packages; `npm help trust` (npm 12.0.2); npm/cli#8544
- READMEs: `vite-css-modules`, `stylelint-declaration-strict-value`, `stylelint-value-no-unknown-custom-properties`; typescript-eslint `no-deprecated`; `@eslint-community/eslint-plugin-eslint-comments` `require-description`
- Base UI docs: animation handbook, Dialog, Tabs; shadcn/ui changelog, July 2026: Base UI as the default; Radix Primitives animation guide
- Figma Plugin API, `Variable.scopes`; Figma MCP server, rate limits and access
- Package metadata and weekly downloads from the npm registry and npm download statistics API
