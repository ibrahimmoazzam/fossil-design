# Key Decisions

These are the decisions that shape Fossil most, each with the alternative it rejected and the reason. The [architecture decision records](./decisions/README.md) say how each one is built, and this page says why. The research behind them is in [`Learnings.md`](./Learnings.md).

Each section gives the decision, what was rejected, why, and what the decision costs.

1. [Git as source of truth, not Figma](#1-git-as-source-of-truth-not-figma)
2. [CSS Modules over vanilla-extract, reversed after the dry run](#2-css-modules-over-vanilla-extract-reversed-after-the-dry-run)
3. [Stylelint for styles and ESLint for JSX, with off-the-shelf rules](#3-stylelint-for-styles-and-eslint-for-jsx-with-off-the-shelf-rules)
4. [The values-only write boundary](#4-the-values-only-write-boundary)
5. [Design tools as consumers](#5-design-tools-as-consumers)
6. [The Figma component library: required, generated from code, checked by script](#6-the-figma-component-library-required-generated-from-code-checked-by-script)
7. [Harvested components over a headless library](#7-harvested-components-over-a-headless-library)
8. [Bundled docs over an MCP server for consumers](#8-bundled-docs-over-an-mcp-server-for-consumers)
9. [The budget-plan constraint](#9-the-budget-plan-constraint)
10. [Two tiers, not three](#10-two-tiers-not-three)
11. [A template rather than a themeable package](#11-a-template-rather-than-a-themeable-package)

## 1. Git as source of truth, not Figma

**Decision.** Tokens are DTCG JSON files in git, reviewed in pull requests. Figma holds them as variables, applied from code by the sync.

**Rejected: Figma as the source of truth.** It was one of Fossil's first requirements: designers would own the tokens in Figma, and code would follow. Tokens Studio, the usual way to keep tokens in Figma and git together, was rejected as well.

**Why.** A survey of seven production systems reversed the requirement. None of them keeps its source of truth in Figma. Primer authors JSON5 in git, Adobe its own schema, Atlassian code. Even Fluent, the most designer-led of them, has designers maintain a JSON file. In every case Figma consumes tokens rather than producing them.

The reason is what git gives a token change and Figma doesn't: a pull request someone reviews, validation in CI, a diff, semver and deprecation metadata. Primer runs a schema validation workflow on every pull request that touches tokens. Fossil's token build checks the tier rules, references, modes and contrast before it writes anything, and a release versions the change. A variable edited in Figma gets none of that.

Tokens Studio works, but it adds a parallel token layer beside Figma's native variables, and it would have handed over the part of the project most worth building. Fossil's sync keeps tokens as native variables, so Dev Mode and the Figma MCP server's output show them as `var(--fossil-…)`.

**What it costs.** A designer's change reaches code only when someone runs the sync, and only as a value ([decision 4](#4-the-values-only-write-boundary)). Figma isn't where the system is defined, so a designer who needs a new token asks for one rather than making it.

**Recorded in** [ADR 0005](./decisions/0005-token-taxonomy.md), [ADR 0007](./decisions/0007-figma-sync.md) and [Learnings 3.1](./Learnings.md#31-nobodys-source-of-truth-is-figma).

## 2. CSS Modules over vanilla-extract, reversed after the dry run

**Decision.** Components are styled with CSS Modules. Strict class-name types from `vite-css-modules` make a class typo, or a variant with no class, a type error. Each component's variants are a typed constant, and its props derive from it.

**Rejected: vanilla-extract,** which was the original choice. On paper it gave typed tokens and typed variants: `createGlobalThemeContract` typed the custom property names without emitting CSS, and its recipes typed the variants.

**Why it was reversed.** Before the PRD was final, Phases 2 and 4 were built for real in a scratch workspace, with two consumer apps installing the packed tarballs. That dry run found 34 problems. Most of vanilla-extract's cost turned out to be plumbing no consumer would ever see:

- a generated contract, and the parity test it needed;
- sprinkles;
- runtime helpers that became runtime dependencies;
- a Vite cache workaround;
- custom ESLint rules for `.css.ts` files.

It also split enforcement in two. Consumers write plain CSS, so they would need Stylelint either way, while Fossil's own `.css.ts` files would need custom ESLint rules. And the portfolio, Fossil's first consumer, couldn't adopt it without vanilla-extract's Turbopack plugin, then at version 0.1.4.

The worry about leaving was accuracy, so the spike was rebuilt on CSS Modules and each kind of mistake checked:

| Mistake in a component                        | What catches it                                                         |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| An unknown token name                         | `stylelint-value-no-unknown-custom-properties`                          |
| A raw value                                   | `stylelint-declaration-strict-value`                                    |
| A primitive or deprecated token               | Core `declaration-property-value-disallowed-list`, with generated lists |
| A class-name typo, or a variant with no class | Strict types from `vite-css-modules`, failing `tsc`                     |

vanilla-extract alone never caught raw values either, so the plan already needed custom lint rules for that. Primer had made the same move: every component on CSS Modules by December 2024, then `sx` removed and `Box` deprecated. And CSS Modules are plain CSS, which forks and agents already know.

**What it costs.** A token name in a stylesheet is a string until Stylelint reads it, so a typo shows up in lint rather than in the editor's type-checker. The class-name types are generated before every type-check and build, aren't committed, and need `moduleResolution: "bundler"`, because `NodeNext` doesn't find them.

**Recorded in** [ADR 0008](./decisions/0008-stylelint-config.md), [ADR 0009](./decisions/0009-component-package.md) and [Learnings, "The dry run"](./Learnings.md#the-dry-run-septemberoctober-2026).

## 3. Stylelint for styles and ESLint for JSX, with off-the-shelf rules

**Decision.** Two shared configs. `@fossil-design/stylelint-config` keeps stylesheets to semantic tokens: no raw values, no primitives, no deprecated tokens, and no margin but `0`. `@fossil-design/eslint-config` bans the raw elements `Box` renders, and requires a reason on every disable comment. Both are made of off-the-shelf rules fed by lists the token build writes. Neither has a custom rule.

**Rejected: a custom ESLint plugin with five rules, and a custom Stylelint plugin,** as the first draft of the PRD specified. Before that, ESLint as Fossil's main linter.

**Why.** A linter has to match the format people author in, not the format the build emits. Atlassian shows the rule: an ESLint plugin for its CSS-in-JS, and a Stylelint plugin for plain CSS, Less and Sass. Fossil first applied it to its own `.css.ts` files and chose ESLint. But agents build features in consumer repos, and consumers write CSS, so the linter has to match them. With Fossil's components in CSS Modules too, one Stylelint config lints Fossil and every app. Fossil's own stylesheets pass through exactly what an app gets.

Stylelint can't see JSX, and a raw `<div>` is how layout escapes `Box`. That one rule lives in ESLint, written with core `no-restricted-syntax`. A workspace test keeps its list equal to the elements `Box` renders, so every banned element has a replacement.

The custom plugins went because off-the-shelf rules with generated lists covered every check they were meant for: `declaration-strict-value` for raw values, `value-no-unknown-custom-properties` for unknown tokens, and core disallowed lists for primitives, deprecated tokens and raw colours. Widely used rules are maintained, documented and already familiar to agents. A custom rule is one more thing for Fossil, and every fork, to maintain.

**What it costs.** Off-the-shelf rules only say what they were built to say. `declaration-strict-value` only checks the properties it is given, so a raw colour in a local custom property would pass it. Fossil closes that by rejecting raw colour syntax in every value, which reports a raw colour in a colour property twice. A raw length in a local custom property, such as `Carousel`'s `--dot-size: 6px`, still passes and is left to review. And flat config replaces a rule's options rather than merging them, so an app that sets its own `no-restricted-syntax` has to merge in Fossil's entries, which the package exports.

**Recorded in** [ADR 0008](./decisions/0008-stylelint-config.md), [ADR 0014](./decisions/0014-enforcement.md) and [Learnings 3.4](./Learnings.md#34-linters-must-match-the-authoring-format-not-the-output-format).

## 4. The values-only write boundary

**Decision.** Between code and Figma's variables, only values travel both ways. A designer changes a colour or a size in Figma, and the sync's diff writes it to the token files for a pull request. Additions, deletions, renames, detached aliases and mode changes made in Figma are refused, each with the code change it needs.

**Rejected: a full two-way sync,** where a variable created, renamed or deleted in Figma becomes a token change.

**Why.** A token is more than a value. It has a description that tells people and agents when to use it, a tier, a place in the taxonomy, contrast checks and a review. A variable created in Figma has none of these, so it is a proposal, not a change. Accepting it would make Figma a second place where the system is defined, which [decision 1](#1-git-as-source-of-truth-not-figma) rules out.

Renames turned out not to need Figma's help. The sync stamps each variable with its token path. A token renamed in code keeps a deprecated alias for consumers, and the next apply finds the old variable by its stamp and renames it in place. Its ID survives, and with it every binding in the component library. Supporting renames from Figma would have added paths to the diff without adding anything.

Composite tokens, such as typography and shadows, are code-only for a different reason: Figma's variables can't hold them. They reach Figma as text and effect styles, generated from code with their parts bound to variables.

**What it costs.** A designer can't add a token in Figma; they ask for one, through a gap or a pull request. Bringing values back needs an agent session, because only an agent can run the Figma MCP server's `use_figma` tool ([decision 9](#9-the-budget-plan-constraint)).

**Recorded in** [ADR 0007](./decisions/0007-figma-sync.md) and the PRD's [design tools and the write boundary](./PRD.md#design-tools-and-the-write-boundary).

## 5. Design tools as consumers

**Decision.** Design tools consume the git source, and none replaces it. Figma's variables round-trip values. Figma Make is one-way: a Make file installs `@fossil-design/react` from npm and reads the guidelines inside it, and Claude Code turns a prototype into code with Fossil's components and lint.

**Rejected: any design tool as a source,** whether Figma Make, Claude Design or a `DESIGN.md` file. Also rejected: taking a Make kit's tokens from the Figma library.

**Why.** The argument from [decision 1](#1-git-as-source-of-truth-not-figma) applies to every design tool. Claude Design keeps its design systems in claude.ai and changes them through chat, with no pull request, diff, semver or deprecation. Claude Code can read a Claude Design project, which makes it readable but not reviewable. Figma Make is the same. So each tool gets the system from the source, and its changes come back through code.

Make was tested. With a one-line pointer in its `Guidelines.md` and a prompt that never mentioned Fossil, Make read the bundled docs and built a page from `Box`, `Stack`, `Text`, `Card` and `Button`, with token keys only, in light and dark. It stays one-way because of what it does with edits. Its properties panel lists every `--fossil-*` property, primitives included, and Make's agent writes an edit made there as a raw value, even with a guidelines rule against it. Those raw values never reach code, because Claude Code rebuilds the prototype rather than copying it.

Two smaller choices follow from the same rule:

- **Make's tokens come from the npm package.** Make flattens a Figma library's variables into raw CSS values, which would compete with `--fossil-*`.
- **`DESIGN.md` isn't authored.** The format is alpha and has no modes, so it can't express light and dark. If a tool ever needs one, it is generated from the token source.

Claude Design is deferred to a later release. It would consume the same built package Make does, so adding it costs a compatibility check.

**What it costs.** A change a designer makes in Make, or to a main component in the Figma library, doesn't flow back by itself: someone turns it into a pull request. The next regeneration of the library overwrites hand edits to main components.

**Recorded in** [ADR 0017](./decisions/0017-agents-md-block-and-make-guidelines.md) and [Learnings 3.9](./Learnings.md#39-ai-design-tools-are-a-new-kind-of-consumer).

## 6. The Figma component library: required, generated from code, checked by script

**Decision.** Fossil's components exist in Figma as a published library, generated from code. A script derives each component's name, variants, properties and variable bindings from its source. An agent builds the frames through `use_figma`, and a second script reads the result back and reports every difference.

**Rejected:** treating the library as optional; a library built by hand; and Figma's own `figma-generate-library` skill on its own, which leaves names and bindings to the agent.

**Why it's required.** Constraint has a design side. In code, a closed `Box` narrows what an agent can write. In Figma, the library narrows what a design hands the agent. Through the Figma MCP server, an instance of a library component arrives as a call with its props, such as `<Button children="View project" icon />`, with every value as `var(--fossil-…)`. A frame drawn from raw shapes arrives as generic boxes, and the agent has to guess what it was meant to be.

**Why it's generated.** The names and bindings have to be exact, because naming parity is what maps a Figma component to code on a plan without Code Connect ([decision 9](#9-the-budget-plan-constraint)). Exact things come from code. The spec reads each component's JSX through the TypeScript compiler and its CSS Module through PostCSS, because CSS alone misses the token props a component passes to `Box` and `Text`. A small reviewed table covers what code can't say. A class with token bindings that the table neither builds nor skips fails the spec, so new styling can't slip past it.

**Why it's checked.** An agent builds the frames, because turning JSX into Figma layout needs judgment, and agents make mistakes. The check compares names, variants, properties, every layer's bindings, and anything left unbound. Its first full run found text styles detached by an uppercase setting, so letter case stays in code.

The library is two files: foundations, with the variables, styles and icons, and components, which imports them by key. A fork with its own brand replaces the foundations and keeps the components; a team with its own components does the opposite.

**What it costs.** Only an agent can build or check the library, so the check runs locally rather than in CI. A main component edited by hand drifts until the next check notices. Some things Figma can't bind yet: it reads a number variable on line height as pixels, so text styles set line height as a percentage instead.

**Recorded in** [ADR 0015](./decisions/0015-figma-component-library.md) and [ADR 0018](./decisions/0018-figma-foundations-and-components.md).

## 7. Harvested components over a headless library

**Decision.** Fossil's interactive components (`Modal`, `Tabs`, `Carousel`, `Popover`, `Tooltip` and `Clip`) are harvested from the portfolio, native elements first, and Fossil owns their accessibility. They animate with CSS. An app adds Motion through extension points.

**Rejected: Base UI or Radix as the behaviour layer.** Both are strong options, and Base UI became shadcn/ui's default in July 2026.

**Why.** Fossil began from a finished product. Its components were harvested from a portfolio that already shipped them, so each one replaces something real, and moving the portfolio onto Fossil is a mechanical swap. The portfolio's versions were already built on the platform: `Modal` is a native `<dialog>` opened with `showModal()`, and `Carousel` is native scroll-snap. Base UI's Dialog is a `div` with `role="dialog"`. Adopting it would have traded a native element for an imitation of one, against Fossil's rule of native elements first.

Owning the accessibility means testing it. Every story runs axe in both themes, and real-input browser tests cover what simulated events can't, such as Escape closing a `<dialog>`, focus returning to its trigger, and Tab never reaching the page behind a modal. Browsers don't act on a play function's simulated events, and a real-input test caught an exit bug that a play function had passed.

The choice isn't locked in. Props describe behaviour, with the names headless libraries share (`open`, `onOpenChange`, `value`, `onValueChange`), never the element underneath. A fork can swap a headless library into one component without touching the rest of the pipeline.

Motion stays out for the same reason. Every component's core behaviour is native, and Motion only polishes it, so it shouldn't be a dependency every fork inherits. Fossil animates with CSS transitions and the motion tokens, turns them off under reduced motion, and hands an app extension points such as `Modal`'s `renderPanel` and `onShowingChange`. Each one works with any animation library.

**What it costs.** Fossil maintains the accessibility of six interactive components itself. Positioning wasn't worth rebuilding: `Popover` and `Tooltip` use Floating UI, the package's one runtime dependency. Floating UI positions them with inline styles that `Box` doesn't accept, so each keeps a raw `<div>` with a reasoned lint disable. Those were Fossil's first counted escapes.

**Recorded in** [ADR 0011](./decisions/0011-interactive-components.md) and [ADR 0014](./decisions/0014-enforcement.md).

## 8. Bundled docs over an MCP server for consumers

**Decision.** An app's agent gets its context from what the app installed. `@fossil-design/react` ships Markdown and JSON docs for every component and token, generated at build time from each component's JSDoc contract and its example stories. The package's `fossil-agents-md` bin writes a block into the app's `AGENTS.md` with the rules, the tokens in brief and the components, within an 8 KB budget. Figma Make reads the same docs through guidelines in the package.

**Rejected: an MCP server for consumers,** built from a manifest in the package. Also `llms.txt` files and a `DESIGN.md` export.

**Why.** Three reasons:

- **Retrieval leaves out the foundations.** An MCP server returns what a prompt asks for. "Build me a card" retrieves the card and the button, not the spacing, type and colour rules, and the agent fills that gap from its training data. Foundations have to be in context all the time, not on request.
- **The evidence points this way.** Vercel measured the same choice for Next.js: an always-on docs index in `AGENTS.md` scored 100%, a skill 53%, and a skill with explicit instructions 79%. Fossil follows Next.js's pattern: docs inside the package, and an always-on block, written between markers, that points at them.
- **There is nothing to run.** A server would have to run alongside every consumer repo. Bundled docs work offline, need no setup, and always match the installed version, because they ship in it. Upgrading the package upgrades the docs.

The docs follow Indeed's benchmark of MCP formats: Markdown for instructions, and JSON for the API. MCP keeps a place in Fossil's own development, where Storybook's MCP server serves the component docs and runs story tests for whoever is working on the components.

`llms.txt` and `DESIGN.md` were cut because nothing in the agent loop Fossil targets reads them.

**What it costs.** The block is about 8 KB in every app agent's context, all the time. The build fails if it grows past that, and detail moves to `foundations.md`. The tarball is about 170 KB bigger. An app that upgrades has to run the bin again, and `fossil-agents-md --check` in the app's CI catches an upgrade that didn't.

**Recorded in** [ADR 0016](./decisions/0016-bundled-agent-docs.md), [ADR 0017](./decisions/0017-agents-md-block-and-make-guidelines.md) and [Learnings, "The structural leak in readability"](./Learnings.md#the-structural-leak-in-readability).

## 9. The budget-plan constraint

**Decision.** Everything runs on a Figma Professional or Education plan, and on free tiers elsewhere. Nothing requires a feature those plans lack.

**Rejected: building on Enterprise features,** which most published design-to-code pipelines assume.

**Why.** Fossil is for students and small teams, who can't buy their way around the gaps, and it is built on an Education plan itself. Three features were out of reach, and each was replaced:

| Feature                                              | What it would have given                                                                                            | What replaced it                                                                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The Variables REST API (Enterprise)                  | CI reading and writing Figma's variables directly, with no one in the loop                                          | The Plugin API, run by an agent through the Figma MCP server's `use_figma`. Fossil generates every script and hashes it, and the agent carries it unchanged                    |
| Code Connect (Organization and Enterprise)           | Figma components mapped to code, so the MCP server returns `<Button variant="primary">` instead of generated markup | Exact naming parity. Without Code Connect, `get_design_context` still returns each instance's component name and its variant properties as props, so matching names are enough |
| Figma's npm registry, which the Education plan lacks | Publishing a Make kit, so every Make file shares one set of components and guidelines                               | The public npm package, with Make guidelines inside it. A Make file's `Guidelines.md` is one line pointing there, and a kit is optional                                        |

The replacements were measured. A `Button` instance reaches the agent as `<Button children="View project" icon />`, with every library variable as `var(--fossil-…)`. The Plugin API also gave the sync something a file-based diff lacks: identity. Each variable carries its token path, so a rename is known for certain, where Adobe's diff script guesses renames from shared values.

**What it costs.** The sync and the library need an agent session. Figma's MCP server accepts only approved clients, so no script or CI job can call it. Every script the agent carries could be retyped wrongly, so each one checks its own hash before it writes. The server is rate-limited, planned at 10 calls a minute, and `use_figma` is free only during its beta. A Figma plugin over the same sync code is the fallback if that changes.

**Recorded in** [ADR 0007](./decisions/0007-figma-sync.md), [ADR 0015](./decisions/0015-figma-component-library.md), [ADR 0017](./decisions/0017-agents-md-block-and-make-guidelines.md), and [Learnings on Code Connect](./Learnings.md#code-connect-is-organization-and-enterprise-only) and [the Variables REST API](./Learnings.md#figma-variables-rest-api-is-enterprise-only).

## 10. Two tiers, not three

**Decision.** Tokens come in two tiers. Primitives hold raw values and are named for what they are, such as `base.color.gray.600`. Semantic tokens alias them and are named for intent, such as `color.text.muted`. Components use semantic tokens only.

**Rejected: a third tier of component tokens,** such as a `button.primary.background`.

**Why.** Primitive and semantic tiers are settled everywhere. The third tier is where systems disagree, and the trend runs against it. Adobe retreated explicitly: before Spectrum's v12, every combination of component options defined a token, which made the list unnecessarily large, and v12 moved to a smaller set. Fluent runs roughly 650 global and 550 alias tokens.

In Fossil, what a component token would do is done in code. A component's variants are a typed constant, and its CSS Module maps each variant to semantic tokens. That is one level of indirection a reviewer can read, without a token for every part of every component. It also keeps the tiers meaningful: changing a primitive restyles everything built on it, which is what lets a fork rebrand by replacing values.

Two tiers only work if they stay apart, so the boundary is enforced:

- The token build rejects a raw value in a semantic token and a reference in a primitive.
- Stylelint rejects a primitive anywhere outside an app's site-tokens file.
- In Figma, primitives have empty scopes, so they appear in no picker.
- Every primitive sits under `base`, so it is marked wherever its name shows, such as in Make's properties panel or hand-written CSS. Primer marks its primitives the same way.

**What it costs.** Restyling one component means editing its CSS Module, not overriding a token. A fork that wants per-component theming adds it in code.

**Recorded in** [ADR 0005](./decisions/0005-token-taxonomy.md), [ADR 0013](./decisions/0013-base-primitives.md) and [Learnings 3.5](./Learnings.md#35-the-third-tier-is-contested-and-shrinking).

## 11. A template rather than a themeable package

**Decision.** A team adopts Fossil by copying the repository, with GitHub's "Use this template" button or a fork, and replacing the token values with its own brand. The published `@fossil-design/*` packages are the reference brand.

**Rejected: a themeable package** that teams install and restyle by overriding tokens. Also rejected: reading in a team's existing Figma tokens.

**Why.** Fossil's loop needs a team to own its token source. A designer's change in Figma becomes a pull request against the token files. The build then regenerates the CSS, the types, the lint lists and the docs, and the Figma library is regenerated from the components. None of that can happen against someone else's package. A team that only installs Fossil can override custom properties, but its Figma edits have nowhere to go, its lint lists and agent docs still name Fossil's tokens, and its Figma library is Fossil's.

Reading in a team's existing Figma tokens was cut for a related reason: an arbitrary token taxonomy doesn't map onto Fossil's semantic layer. Supporting it would be a separate product.

The repository is shaped for copying. It is one monorepo, so the template copies one repository rather than five that would have to be linked up again. `fossil.config.json` holds the system name, CSS prefix and npm scope, and the class names, docs, `AGENTS.md` block and Make guidelines all follow it. Multi-brand theming is a non-goal for the same reason: a fork is how a second brand happens.

**What it costs.** Every team carries its own copy of the code. A fork can pull Fossil's later fixes, at the cost of merging them, while a copy made from the template starts a fresh history and can't. Package names, imports and stylesheets spell out the scope and prefix, so `pnpm rename` rewrites them, rather than the config file alone ([ADR 0019](./decisions/0019-renaming-a-fork.md)). Smaller adjustments don't need a copy: an app can point a semantic font family at its own faces, as the portfolio does to keep its commercial font, and keep tokens of its own in a site-tokens file.

**Recorded in** [ADR 0001](./decisions/0001-monorepo.md) and the PRD's [introduction](./PRD.md#what-fossil-design-is).
