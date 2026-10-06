# Fossil Design: Product Requirements Document

**Status:** Draft for implementation, revised after the Phase 2 and Phase 4 dry run (1 October 2026), at the start of Phase 4 (4 October 2026) and during Phase 5b (6 October 2026)
**Audience:** Claude Code, and any human contributor
**Companion document:** `Learnings.md` contains the competitive research and the rationale behind every decision here. Read it if a decision seems arbitrary; it probably is not.

---

## 1. Introduction

### What Fossil Design is

Fossil Design, or Fossil for short, is an open-source design system built for agentic coding workflows. It is a personal project, built to open-source standards: high code quality, and a stated rationale for every architectural decision.

It starts from a finished product. The portfolio website was designed and built directly in code. Once it was done, its tokens and components were extracted to seed a code-based design system. From then on, design happens in Figma and agents write the code, constrained to what Fossil defines. The portfolio is then rebuilt on Fossil, installed from npm like any other consumer.

**Fossil is a template with a reference brand.** A team adopts it by forking the repository, replacing the token values with its own brand, and running the same pipeline against its own Figma file:

- tokens in git;
- CSS and typed components;
- Figma variables and a generated component library;
- shared lint configs;
- agent docs.

That is the only way a team's Figma edits can reach its own code, because the round trip needs the team to own the token source. The published `@fossil-design/*` packages are the reference brand, harvested from the portfolio.

### The problem it addresses

Coding agents produce off-system UI in two distinct ways, and most design systems only address one of them.

1. **The agent does not know what exists.** It has never seen your system, so it invents. The fix is context: machine-readable token and component metadata.
2. **The agent knows and drifts anyway.** Its training weights pull harder than your documentation, so it writes `bg-gray-100` even with your tokens in context. The fix is constraint: make off-system values inexpressible.

Fossil addresses both. The industry standard today is to lint an open surface. Fossil closes the surface and lints only what remains.

### What success looks like

- The portfolio site is built entirely from Fossil, with a measurable and low escape-hatch count.
- An agent given a UI task in the portfolio repo produces on-system code without hand-holding, and this is demonstrated with a number rather than a claim.
- A designer can change a token value in Figma, and the change arrives as a reviewable pull request when the sync runs.
- A fresh fork with new token values builds, lints, syncs to a new Figma file and generates its component library, following only the adoption guide.
- Another engineer can read the repo and understand why each decision was made.
- The whole loop runs on a Figma Education or Professional plan, with no Organization or Enterprise features.

### Constraint: works on a budget plan

Fossil is built for students and small teams, so every part of the pipeline must run on a Figma Professional or Education plan and on free tiers elsewhere. These Organization and Enterprise features are out of reach and must never be required:

- **Code Connect.** Figma components map to code through exact naming parity instead (Phase 5b).
- **The Variables REST API.** Figma sync goes through the Plugin API.
- **Make's private npm registry.** Fossil publishes to public npm anyway.

The rest is free for a public project: npm, GitHub Actions, and GitHub Pages for the Storybook docs site. Figma's AI features run on the plan's monthly credits, which is 3,000 per person on the Education plan.

### Non-goals for v1

- Supporting arbitrary third-party Figma token structures (explicitly cut; see the learnings doc).
- Multi-framework support. React only.
- Multi-brand or multi-theme beyond light and dark. A fork is how a second brand happens.
- A stable public API before Phase 8. Packages publish as `0.x` during development, which signals that renames are expected rather than breaking.
- Building the portfolio. It already exists in its own repository; Fossil only migrates it onto the published packages (Phase 8).
- Shipping fonts. Font tokens name font stacks, and the consuming app loads the font files.
- A headless behaviour library. Fossil's interactive components are harvested from the portfolio and Fossil owns their accessibility. A fork may swap one in per component, such as Base UI, without touching the rest of the pipeline.
- A Tailwind rendering of the tokens. A generated Tailwind v4 theme is a likely later addition, as one more output of the same token build.
- Claude Design support. It is a planned add-on for a later release: `/design-sync` would consume the same built package and Storybook the Make kit already uses. When it lands, it is a one-way consumer, never a source of truth.

---

## 2. Architecture

### Data flow

```
packages/tokens/src/{primitive,semantic}/*.tokens.json    DTCG source of truth, git, PR-reviewed
      |
      |  --- figma:apply (everything) --->   Figma Variables
      |  <--- figma:diff (values only) ---   (via an agent, through use_figma)
      |
      v
Style Dictionary v5: one run, validated before anything is written
      |
      +---> tokens.css         custom properties, light and dark
      +---> tokens.json        metadata for docs, agents, the Figma sync and the lint configs
      +---> tokens.ts          token key unions, for typed props
      +---> breakpoints.ts     literal values for media queries
      +---> lint lists         primitive and deprecated token names
                |
                v
      Components: CSS Modules using var(--fossil-*), typed variant maps,
      Box classes generated from the tokens
                |
                v
      Vite library build: dist/ (plain JS + one style.css) + Storybook
                |
                +---> npm  --->  portfolio site, and any fork's apps
                +---> bundled agent docs + AGENTS.md block
                +---> Make guidelines in the package  --->  Figma Make prototypes (one way)
                +---> Figma component library (generated from code, bound to Figma Variables)
```

There is no separate contract for the outputs to disagree with. Every output comes from one Style Dictionary run, which checks the token files before it writes anything (Phases 1 and 2). Downstream, three checks catch the rest:
- the Stylelint config rejects a custom property that doesn't exist;
- generated CSS Module types reject a class name that doesn't exist;
- the token key unions reject a prop value that isn't a token.

### Repository layout

Monorepo, pnpm workspaces.

```
fossil-design/
  fossil.config.json     system name, CSS prefix and npm scope: what a fork changes first
  packages/
    tokens/              DTCG source, Style Dictionary build, generated outputs
    react/               components (CSS Modules), stories, bundled agent docs
    eslint-config/       shared ESLint flat config
    stylelint-config/    shared Stylelint config
    figma-sync/          sync core and scripts (private, not published)
  docs/decisions/        ADRs
  .claude/skills/        fossil-figma-sync
  .github/workflows/
```

Storybook lives in `packages/react`, beside the components it documents, and its static build is the docs site.

The portfolio site is **not** in this repo. It is a separate repository that installs Fossil from npm like any other consumer.

### Naming

The system is called **Fossil Design**, or Fossil for short. The full name goes wherever people search: titles, package descriptions, the README and the docs site. The CSS prefix stays `fossil` (`--fossil-*`), as Ant Design keeps `ant-`.

The npm scope is **`@fossil-design`**, and the GitHub repository is `fossil-design` under a personal account. Scope and repository match, so the packages and the code are found by the same words, as Ant Design's are (`@ant-design`, `ant-design/ant-design`). A personal account rather than a GitHub org keeps the work attributed to a person rather than to an org that looks like a company.

| Workspace | Package name | Published |
|---|---|---|
| `packages/tokens` | `@fossil-design/tokens` | Yes |
| `packages/react` | `@fossil-design/react` | Yes |
| `packages/eslint-config` | `@fossil-design/eslint-config` | Yes |
| `packages/stylelint-config` | `@fossil-design/stylelint-config` | Yes |
| `packages/figma-sync` | `@fossil-design/figma-sync` | No. It runs from the repo, and a fork runs its own copy |

`-design` disambiguates from Fossil the version control system and Fossil the watch brand, a real discoverability concern for anything named Fossil. The full name, the npm scope and the repository now say the same thing.

Rejected: `@fossil` (unavailable), unscoped `fossil-*` names (available but require claiming each package individually, forever, and the squatted `fossil` package is evidence that people do), `@fossil-ds` (terser but "ds" is insider shorthand, and a portfolio artifact gets read by non-specialists).

Do not reserve `@usefossil`, `@fossilkit` or `@fossil-ds`. Squatting names you will not use is the behaviour that produced the problem above.

### Distribution

Packages publish to the public npm registry. This is not optional: with the portfolio site in its own repo, the pnpm `workspace:` protocol is unavailable, and the alternatives are all worse. GitHub Packages requires an auth token even for public packages, which is a poor front door for an open-source project. Git dependencies handle monorepo subdirectories badly and provide no real semver.

Release sequence:

1. **Create the `@fossil-design` org during Phase 0.** Free for public packages. Confirmed available.
2. **Publish `0.x` from Phase 2 onward.** The `0.` prefix signals an unstable API, which is accurate: the token taxonomy will churn through Phase 4, and every semantic rename would otherwise be a major bump.
3. **Publish `1.0.0` at Phase 8**, once the taxonomy has survived migrating the portfolio onto it.

Publish through trusted publishing via OIDC from GitHub Actions, never a long-lived `NPM_TOKEN`. npm restricted 2FA-bypassing tokens for account and package management on 31 July 2026, and restricts them for direct publishing from January 2027.

**Trusted publishing can't create a package.** `npm trust` requires the package to already exist on the registry, and npm/cli#8544 is still open. So each package's first version is published by hand with 2FA, then `npm trust github <package> --file <workflow>` links it to the release workflow. Every later version goes through OIDC. This needs npm 11.5.1 or later and Node 22.14.0 or later.

**The separate-repo decision has an upside worth stating.** `workspace:` symlinks source and hides an entire class of bug. A published package tests whether the `exports` map is correct, whether type declarations resolve for a consumer, and whether the build output runs outside Fossil's own bundler config. The site pinning an exact version and bumping deliberately also dogfoods the upgrade path, which is the thing design systems usually get wrong and normally discover from other people's bug reports.

**`@fossil-design/react` is precompiled.** Components are written in CSS Modules and built with Vite library mode into plain JS plus a single `dist/style.css` that already contains the token values. A consumer imports that stylesheet once and configures nothing. See Phase 4 for the build requirements.

### The three layers

| Layer | Mechanism in Fossil |
|---|---|
| Context | A generated `AGENTS.md` block with always-on foundation rules and a component index; Markdown docs bundled in the installed package; Make guidelines bundled the same way; Storybook MCP for Fossil's own development. In Figma: the component library, and variables with code syntax, read through the Figma MCP server |
| Constraint | `Box` and component props typed to token keys and variant maps; the shared ESLint config (no raw layout elements) and Stylelint config (tokens only, semantic only, no margins). In Figma: variable scopes, and designing only from the component library |
| Verification | Token build validation; Storybook interaction and a11y tests; real-input browser tests; the consumer smoke test with attw and publint; the Figma library check; gap review; the drift eval harness |

### Levels of composition

| Level | What it is | Lives in | In Figma |
|---|---|---|---|
| Tokens | Two tiers: *primitive* tokens hold raw values; *semantic* tokens are aliases named by intent | Fossil `packages/tokens` | Variables |
| `Box` | The base component: a closed set of elements with token-typed props. Nothing else renders a raw `<div>` | Fossil `packages/react` | Auto-layout frames bound to variables |
| Components | `Text`, `Stack`, `Button` and the rest of the Phase 4 set, with variants from a typed variant map | Fossil `packages/react` | Component sets (Phase 5b), except `Box`, `Stack` and `VisuallyHidden` |
| Patterns | Documented ways to combine components, with no new code | Fossil's generated docs | None |
| Compositions | Product-specific components built from Fossil, such as `NavBar` and `CaseStudyCard` | Portfolio `src/components/` | Built by designers from Fossil instances |
| Screens | Pages made of compositions and components | Portfolio `src/app/` | Canvas frames and Make prototypes |

- **Terms.** "Primitive" means the raw token tier and nothing else. Brad Frost calls compositions "recipes"; Fossil says "compositions" to keep one name per concept.
- **Semantic tokens only.** Components and compositions use semantic tokens only (Phases 2 and 5). That keeps the two tiers meaningful: changing a primitive value restyles everything built on it.
- **Moving between levels.** The gap review (Phase 5) is how a composition becomes a pattern or a component.

### Design tools and the write boundary

Design tools consume the git source; they never replace it.

**Figma Make: one way only.** A Make file installs the published `@fossil-design/react` from npm and reads the guidelines that ship inside it, so prototypes use the real components. A Make kit can bundle the two where the plan lets you publish one, but it is optional: publishing a kit needs Figma's npm registry, which not every paid team has. Leave Figma library variables out of any kit: Make flattens them into raw CSS values that would compete with the `--fossil-*` properties. Claude Code implements a prototype by reading the Make file through the Figma MCP server. A change a prototype surfaces goes through a normal code PR.

**Figma components: code-first.** The Fossil component library in Figma is generated from code (Phase 5b). Designers use and override instances freely. A change to a component itself goes through a code PR, and the next regeneration overwrites hand edits to main components.

**Figma variables: values round-trip. Everything else is code-only.**

- **Values** are the one thing Figma owns. A designer's change becomes a PR.
- **Renames happen in code.** The token keeps a `$deprecated` alias for consumers. The next apply renames the existing Figma variable in place, found by the token path stamped on it, so every binding in the library survives. Deprecated aliases never reach Figma.
- **Additions and deletions are code-only.** A variable created in Figma has no `$description`, no considered tier placement and no review, so it is a proposal rather than a change.

Figma owns scalar values (color, number, string, boolean). Code owns composite tokens (typography, shadow), because native Figma Variables cannot represent them. In Figma they appear as text and effect styles generated in Phase 5b, with their parts bound to variables. Line height is the exception: Figma reads a number variable on it as pixels, so text styles set it as a percentage.

---

## 3. Implementation phases

Phases are ordered by dependency. Each has an explicit exit criterion. Do not start a phase until the previous exit criterion is met.

---

### Phase 0: Repository foundation

**Goal:** an empty monorepo that builds, lints, tests, type-checks and publishes.

**Tasks**
1. Initialise the pnpm workspace with the package layout above.
2. **TypeScript.** A shared base config with `strict: true`, extended by each package.
   - Pin `typescript@~6.0.3`. TypeScript 7 is the native compiler, and its package exposes no JavaScript API. Tools that import `typescript` as a library break on it: `typescript-eslint` (peer `<6.1.0`), `react-docgen-typescript`, and declaration tooling.
   - Revisit when they support it.
3. Vitest configured at the workspace root.
4. ESLint (flat config) and Prettier baseline. The Fossil configs arrive in Phase 5.
5. Changesets for versioning. Each package's `prepack` script runs its build, so a tarball can never contain a stale `dist/`.
6. GitHub Actions workflow: install, lint, typecheck, test and build on every PR.
7. Create the `@fossil-design` npm org and set each workspace's `package.json` name per the table in section 2.
8. **Trusted publishing.** Publish `0.0.1` of each published package by hand with 2FA. Run `npm trust github` for each, then publish `0.0.2` through the release workflow.
9. `fossil.config.json` at the root holds the system name, CSS prefix and npm scope. Every build script reads it, so a fork renames the system in one place.
10. Root `README.md` stating what Fossil is and why it exists.
11. **Agent instructions.** `AGENTS.md` is the cross-tool standard: read by 25+ agents and maintained by the Agentic AI Foundation under the Linux Foundation. It holds the repo rules. `CLAUDE.md` contains only `@AGENTS.md`.
    - Claude Code (v2.1.277 and later) reads `AGENTS.md` by itself only when no `CLAUDE.md` or `CLAUDE.local.md` exists. The import works whatever files a contributor adds.
    - The pre-Phase 0 version already covers the stack, layout, rules, boundaries and definition of done. GitHub's analysis of 2,500+ `AGENTS.md` files found the strongest cover six areas: commands, testing, project structure, code style, git workflow and boundaries.
    - This phase fills in **Commands** at the top, with exact flags. Include the steps an agent would otherwise miss, such as generating CSS Module types before type-checking, and filtering to one package with `pnpm --filter`.
    - Map each definition-of-done item to its command.
    - Foundation token rules are added in Phase 2.
    - Keep the root file short. Package-specific rules go in that package's own `AGENTS.md` (Phases 3 and 4), because agents read the nearest one.

**Exit criterion:** `pnpm build && pnpm lint && pnpm test && pnpm typecheck` passes clean from a fresh clone, CI is green, and `0.0.2` of every published package goes out through the OIDC workflow.

---

### Phase 1: Token source of truth

**Goal:** DTCG tokens seeded from the portfolio and validated by the build, in primitive and semantic tiers.

**Tasks**
1. **Inventory the portfolio.** It is where Fossil's tokens and components come from.
   - List its CSS custom properties (the `--p-*` and `--s-*` sets in `globals.css`), the literal values repeated across its `.module.css` files, and the components in `src/components/ui/`.
   - Give every value one of three recorded outcomes, so the Phase 8 migration is mechanical:
     - **Fossil token.** Generic and reused.
     - **Stays in the component.** A literal with a reason, such as a 44px touch target or a fluid `clamp()` size.
     - **Site token.** It belongs to the portfolio and lives in its site-tokens file (Phase 5).
   - Expect a large site-token share. The dry run found about half of the 54 semantic tokens are site- or component-specific: coffee, heart, sun, cursor, nav, card, tabs. It also found 520 unit values across 59 CSS files.
   - Record which `src/components/ui/` components move into Fossil (Phase 4). App-aware compositions such as `NavBar`, `Footer` and `CaseStudyCard` stay in the portfolio.
   - Breakpoints need extra care. Custom properties can't be used in media conditions, and the portfolio already works around this, so Phase 2 also emits breakpoints as TypeScript constants.
2. **Define the token taxonomy.** Two tiers only, decided by folder: `src/primitive/` and `src/semantic/`. The same path in both tiers is a build error.
   - **Primitive:** raw values with no semantic meaning, under a `base` group so the name says it isn't for direct use (ADR 0013). `base.color.gray.100`, `base.space.200`, `base.radius.md`, `base.font.size.3`.
   - **Semantic:** references to primitive tokens, named by intent. `color.background.surface`, `color.text.muted`, `space.m`. A semantic token holding a literal value fails the build.
   - **Composite tokens** (typography, shadow, border) follow the same rule part by part: a semantic composite's parts are all references, and a primitive contains none.
   - **Type scale.** The portfolio has one type token and about 30 distinct font sizes in its CSS, so define a primitive size scale and a semantic text scale. Its 8 fluid `clamp()` sizes stay in components: DTCG and Figma can't express them.
     - DTCG dimensions accept only `px` and `rem`, so the portfolio's `em` letter-spacing becomes `rem` at each text style's size. The conversion is exact, because a text style has a fixed size.
   - **Values the portfolio writes as expressions.** A raw value in a semantic slot (`48rem`, `rgb(255 255 255 / 0.55)`) becomes a primitive with an explicit value. A translucent colour is a DTCG colour object with its transparency in the `alpha` field; DTCG 2025.10 doesn't accept hex strings, and its `hex` field is a 6-digit fallback. A `calc()` (`--s-nav-height`) or a `color-mix()` tint (11 of them) becomes a primitive with the computed value, or stays in the component or site tokens.
3. Author `*.tokens.json` files in DTCG format (`.tokens.json` is the extension DTCG 2025.10 recommends). Use `$value` and `$type`. Every semantic token requires a `$description`.
4. **Modes.** A semantic token's dark value goes under `$extensions["<vendor>"].modes.dark`, as an alias. Only semantic tokens vary by mode.
   - Style Dictionary 5.5.5 has no concept of modes and does not read DTCG's Resolver module, so the Phase 2 build handles this key.
5. **Validation lives in the token build,** not in a separate schema. Before writing any output, the build fails if:
   - a semantic token isn't an alias (or, for a composite, has a part that isn't one), or lacks a `$description`;
   - a primitive contains a reference;
   - a non-semantic token has a mode value, or a mode value isn't an alias;
   - a file sits outside both tier folders.
6. **Lifecycle metadata.** Use the standard DTCG `$deprecated` property with an explanatory string. Put the machine-readable `replacedBy` and `since` fields under `$extensions`, with a reverse-DNS vendor key chosen in this phase's ADR.
7. Run the token build in CI as a required check.

**Scope guidance:** size each tier from what the portfolio actually uses, not from a target count. The harvest comes to about 80 primitives and 70 semantic tokens, 19 of them composites. A semantic token that serves a single component is the sign of a taxonomy grown too granular: that value belongs in the component or in site tokens.

**Exit criterion:** token files exist, every portfolio value has a recorded outcome, the build passes in CI, and a deliberately broken token (a semantic holding a literal) fails it.

---

### Phase 2: Build pipeline

**Goal:** one validated Style Dictionary run produces every output the rest of Fossil reads.

**Tasks**
1. **Style Dictionary v5 config** in `packages/tokens`. Node 22+ required.
   - Custom property names come from Style Dictionary and nothing else. `font.lineHeight.base` becomes `--fossil-font-line-height-base`, and every other output takes names from the same run.
2. **Output 1: `tokens.css`.**
   - Every token goes under `:root`, prefixed `--fossil-*`. Semantic values are emitted as `var()` of the primitive they alias, so a primitive change at runtime still flows through.
   - Dark mode gets two identical override blocks, each also setting `color-scheme: dark`:
     - `@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { … } }` follows the OS when no theme is chosen;
     - `:root[data-theme="dark"]` covers an explicit choice.
   - Dark values must keep their aliases. Style Dictionary resolves references inside `$extensions`, and in the parts of a split typography token, so read every reference from the validated source and take only names and literal values from Style Dictionary. Write the `var()` references in Fossil's own format: `outputReferences` finds references in a composite by replacing resolved values, which can corrupt the CSS (ADR 0006).
3. **Build assertions.**
   - Fail on a name collision with a message naming both tokens: `color.text.muted` and `color.text-muted` both become `--fossil-color-text-muted`. Also run with `log.warnings: 'error'`. Otherwise Style Dictionary only warns, and by default its message names neither token.
   - Fail on any emitted value containing `[object Object]`, `undefined` or `NaN`.
   - Add a value transform for DTCG duration objects (`{ "value": 150, "unit": "ms" }`), which Style Dictionary 5.5.5 does not convert.
4. **Output 2: `tokens.json`.** For each token:
   - path and tier;
   - type and resolved value;
   - the alias it points at, plus its dark value and that value's alias;
   - description, deprecation and replacement.
   Docs, agent context, the Figma sync and the lint configs all read it.
5. **Output 3: `tokens.ts`.** Key unions per semantic group, such as `'space.gap': ['s', 'm', 'l']`, with deprecated keys left out, so component props accept only token keys.
6. **Output 4: `breakpoints.ts`.** Literal values and media query strings, because custom properties can't be used in media conditions.
7. **Typography.** Typography tokens are composites, which become Figma text styles in Phase 5b. In CSS, each part becomes its own aliased custom property: family, size, weight, line height, letter spacing. Never use the `font` shorthand, which drops letter-spacing and turns aliases into copied values.
8. **Output 5: lint lists.** Primitive token names, and deprecated names with their replacements, for the Stylelint config (Phases 4 and 5).
9. Deprecation report: a script that reads `tokens.json` and prints currently deprecated tokens.
10. **Foundation rules in `AGENTS.md`,** generated from the tokens:
    - the spacing scale;
    - the type scale;
    - the semantic colour list;
    - the rule that spacing comes from padding and `gap`, not margin.

    They must be always-on rather than retrieved, because on-demand retrieval systematically under-serves foundations.

**Exit criterion:** `pnpm --filter tokens build` produces every output. Each broken-token fixture fails with a clear message:
- a semantic holding a literal;
- a name collision;
- a duration object with the transform removed;
- the same path in both tiers.

---

### Phase 3: Figma round trip

**Goal:** tokens apply from git into Figma Variables, and value changes made in Figma come back as pull requests.

This is the most technically interesting phase. It has no dependency on Phase 4, so it can be deferred if momentum matters more than order, but Phase 5b depends on it.

**How it runs.** The sync logic is Fossil's own code in `packages/figma-sync`. It reaches Figma through the remote Figma MCP server's `use_figma` tool, which runs Plugin API code on an agent's behalf. That server only accepts approved agents (Claude Code, Cursor, Codex, VS Code) through OAuth, with no personal access tokens, so no script or CI job can call it directly. The agent therefore carries generated scripts to Figma unchanged, and Fossil's scripts do everything that has to be correct.

**Constraints to respect**
- The Variables REST API is Enterprise-only. Everything goes through the Plugin API, by way of `use_figma`.
- `use_figma` is free during its beta and planned to become usage-based. Keep the sync core independent of how it reaches Figma, so a plugin can replace the transport without changing the logic.
- Each `use_figma` response is capped at 20 KB, so reads must page. Test early whether large apply scripts need splitting too.
- Only scalar types round-trip. Typography and shadow tokens are code-only.
- The sync can't run in CI. A person starts it locally, and CI checks the PR it opens.

**Tasks**
1. **Sync core.** Pure TypeScript, unit-tested with fixtures. It turns the token files into a variable spec, turns a Figma snapshot back into values, and diffs them.
   - **Three-way diff.** The base is the commit stamped on the collection at the last apply. A change on `main` since that commit is a code change, which the next apply sends. A change in Figma relative to the base is a Figma edit, which becomes a PR. Both on one token is a reported conflict. Without the base, every code change since the last sync looks like a Figma edit to revert.
   - **Only value changes round-trip.** Everything else is reported and refused, with the code PR it needs:
     - a variable added in Figma (no stamped path);
     - a variable deleted in Figma;
     - a variable renamed in Figma (stamp and name disagree);
     - a semantic variable detached from its alias to a raw value.
   - **Units and precision.** Compare colours after converting Figma's 0–1 channels to hex, and dimensions in px against a fixed rem base, both within a rounding tolerance. Otherwise every sync reports value changes that didn't happen.
2. **Apply script.** `pnpm figma:apply` generates the Plugin API script from the token files. For each variable, the script:
   - stamps `setSharedPluginData('fossil', 'path', '<canonical.token.path>')`, shared so any plugin or agent can read it;
   - sets `setVariableCodeSyntax('WEB', 'var(--fossil-...)')`;
   - sets `scopes` per token type on semantic variables (colour to fills and strokes, spacing to gap, radius to corner radius), never `ALL_SCOPES`;
   - gives primitives empty scopes, so only semantic variables appear in Figma's pickers. Check that this hides them while aliases still resolve: Figma documents that scopes filter pickers without blocking binding, but not what an empty list does;
   - resolves semantic tokens to Figma variable aliases, so the two-tier structure survives.

   Applying to an existing file is the normal case:
   - Match variables by stamped path, so a rename in code renames the variable in place and its bindings survive.
   - Don't send deprecated tokens.
   - When a token was deleted in code, report the library components still bound to its variable. Remove the variable only after the library is regenerated.
   - Treat two variables carrying the same stamped path as an error.

   The script also stamps the applied commit SHA on the collection as shared plugin data.
3. **Read and diff.**
   - `pnpm figma:read` generates a paged read of every variable: name, id, values by mode, alias targets and stamped path.
   - `pnpm figma:diff` runs the three-way diff on the saved snapshot. It writes value changes to the token files and prints anything refused along with the code PR it needs.
4. **Integrity checks.** The agent retypes generated scripts into `use_figma` and copies results back, so neither step can be trusted blindly.
   - Each script embeds a hash of its own content and refuses to run if it doesn't match.
   - Each read result carries a hash that `figma:diff` verifies before using it.
5. **Fossil skill, built right after the scripts.** A `fossil-figma-sync` skill in the Agent Skills format, in `.claude/skills/` (Cursor reads that folder too), pins the procedure:
   - load Figma's `figma-use` skill;
   - run the script and send its output to `use_figma` unchanged;
   - page through reads and run the diff;
   - open the PR from a `tokens/figma-<timestamp>` branch with `gh pr create`.

   It forbids hand-written Plugin API code for variables. The skill loads only when a sync is requested, which keeps `AGENTS.md` for foundation rules, and the same file works across agents that support the standard.
6. Test alias fidelity early, in both directions. If aliases break, the two-tier architecture flattens at the Figma boundary and the design loses its point.
7. **`packages/figma-sync/AGENTS.md`** holds the rules for working on the sync code itself. (The skill covers running a sync.)
   - The core stays independent of `use_figma`.
   - Every diff class has a fixture.
   - Scripts embed their hash.
   - Nothing writes to the real Figma file without asking.

**Deferred: a Figma plugin adapter.** A plugin with a push button would reuse the same core. Build it if `use_figma` pricing becomes a problem, if a designer who doesn't use an agent joins, or if the MCP rate limits get in the way.

**Exit criterion:**
- Running the skill against a fresh Figma file creates Fossil's variables with aliases, code syntax, scopes and stamped paths, and running it again changes nothing.
- A token renamed in code renames its Figma variable in place, with bindings intact.
- A value changed in Figma comes back as a PR with a correct DTCG diff.
- An addition, a deletion, a Figma-side rename and a detached alias are each refused with a clear message.

---

### Phase 4: Component library

**Goal:** `Box` plus the v1 component set, styled only with tokens, precompiled so any React app can use it.

Build against the Phase 1 inventory of the finished portfolio, not a guessed page list. Every component here should replace something the portfolio already has.

**Tasks**
1. **Styling: CSS Modules.** Components reference semantic custom properties and nothing else; the shared Stylelint config enforces this inside Fossil too.
   - **Build the Stylelint config first.** It is Phase 5's first task, moved here because this phase's exit criterion needs it, and because a stylesheet linted from its first line needs no clean-up later (ADR 0008). The rest of Phase 5 stays there.
   - `vite-css-modules` generates strict class-name types in default-export mode. A class typo, or a variant with no matching CSS class, is then a type error.
   - Generate those types with its CLI before type-checking, and keep them out of git.
   - The source `tsconfig` uses `moduleResolution: "bundler"`, because `NodeNext` doesn't find `.module.css.d.ts` files. Relative imports carry explicit `.js` extensions, so the emitted declarations still resolve under Node16.
2. **Variant maps.** Each component exports its variants as a constant, such as `buttonVariants = { tone: ['primary', 'secondary'], size: ['s', 'm'] } as const`. Its prop types derive from that constant, and so do the Storybook controls and the Phase 5b library spec.
3. **`Box`, the base component.**
   - Polymorphic `as` prop over a **closed** set of allowed elements.
   - **Layout props typed from `tokens.ts`.** `padding`, `paddingBlock`, `paddingInline` and `gap` take token keys. `display`, `flexDirection`, `alignItems` and `justifyContent` take keyword unions. All of them can vary per breakpoint, with mobile as the default.
   - **`surface` sets a fill and its matching text colour together,** so a pairing can't fail contrast by accident. `radius` takes radius tokens.
   - **Implemented with a CSS Module generated from `tokens.json` by a script,** one class per prop, value and breakpoint.
   - **Named public prop types** (`Responsive<T>`, `GapToken`, `Surface`), so the generated docs read clearly.
   - **No margin prop.** Margins are a logged escape in the consumer's CSS (Phase 5).
   - **A narrow `style` prop** accepting only properties tokens cannot express (`gridTemplateAreas`, `gridTemplateColumns`, `aspectRatio`, `transform`).
4. **Component set for v1,** harvested from the portfolio, with native elements first:
   - **Layout and content:** `Text`, `Stack`, `Button`, `Card`.
   - **From `src/components/ui/`:**
     - `Link` renders an `<a>`, with `asChild` so `next/link` or another router's link can supply navigation.
     - `Icon` ships the Material Symbols that Fossil's own components use as prebuilt React components, so consumers need no SVGR for them. The names live in one list file, and adding one is a one-line change. `Icon` also takes any SVG component an app supplies.
     - `VisuallyHidden` uses the `clip-path` pattern, with no negative margin.
     - `SkipLink`.
     - `Figure`, as a container: Fossil owns the `<figure>`, the caption and the hairline frame, and the app passes in its own image, such as `next/image` or a plain `<img>`.
   - **Interactive:**
     - `Modal`, on native `<dialog>`;
     - `Tabs`;
     - `Carousel`, on native scrolling with scroll-snap;
     - `Popover` and `Tooltip`, which bring Floating UI as a dependency. `Popover` keeps focus with Floating UI's own focus manager, as the portfolio's does; the portfolio's `focus-trap-react` belongs to its `NavBar`, which stays there. They share one internal stylesheet for the floating surface, harvested from the portfolio's `Floating`.
     - `Clip`, as a container: Fossil owns the play and pause control, the reduced-motion behaviour (through `matchMedia`, not Motion) and the caption, and the app passes in its own video source.
   - **Stays in the portfolio:** `Reveal`, which is purely animation; `ComparisonSlider`, which is built on `next/image`; and the app-specific rest of `src/components/ui/`, as recorded in the inventory.
5. **Motion-free, with extension points.**
   - Fossil's components animate with CSS transitions (`@starting-style`, `data-state`) and honour `prefers-reduced-motion`. Fossil has no animation-library dependency.
   - The portfolio adds Motion on top through extension points defined in this phase's ADR. The dry run validated the pattern on `Modal`, in Next 16 and on React 18:
     - Fossil owns the dialog's lifecycle and exposes `renderPanel({ open, panelProps, onExitComplete })`, so Motion's `AnimatePresence` can replace the CSS fade;
     - `onShowingChange` lets the portfolio stop and start Lenis;
     - elsewhere, `asChild` covers element substitution.
6. **Fonts: none shipped.** Font-family tokens name font stacks, and the consuming app loads the font files.
   - The reference brand uses open fonts from Google Fonts. Those are available in Figma, so `use_figma` can build text styles with them. Figma's copy of Space Grotesk has no SemiBold, so the headings are set at Bold (700).
   - The portfolio keeps Roobert, loaded through `next/font`.
7. **Stories and tests.**
   - Every component gets a Storybook story with a play function exercising its interactive states.
   - `@storybook/addon-a11y` runs on all stories with `a11y: { test: 'error' }`, and zero violations are required.
   - **Real-input tests.** Play functions send simulated events, and browsers don't treat those as user input. So anything that relies on native handling goes in Vitest browser tests: Escape on a `<dialog>`, light dismiss, `:focus-visible`. Those tests use real input (`vitest/browser`'s `userEvent`) on `composeStories` output. The dry run's first `Modal` exit bug was caught only this way.
   - **CI setup.** List the test dependencies in `optimizeDeps.include`; otherwise CI's cold cache makes Vite reload mid-run and every test fails. Give each Vitest browser project its own instance name.
8. **Precompiled build.**
   - **Vite library mode with `preserveModules`,** so `'use client'` stays on the component that needs it. A single-file bundle drops the directive without a warning, and a Server Component rendering that component then fails with `useRef is not a function`.
   - **`build.lib.cssFileName: 'style'`.** Vite 8 otherwise names the stylesheet after `lib.fileName`.
   - **Bundle `tokens.css` into `style.css`.** Don't externalise the tokens package: a bare CSS import left in JS breaks Node, Vitest and Jest consumers. TypeScript 6 also needs a declaration for that side-effect import, because `noUncheckedSideEffectImports` is now on by default.
   - **Prefix class names** (`fossil-[local]-[hash]`), so they're recognisable in a consumer's devtools.
   - **Set the `exports` map explicitly,** including `./style.css`.
   - **Run attw (`--profile esm-only`) and publint on every packed tarball in CI.** That makes "type declarations resolve for a consumer" a check rather than a hope.
   - **React peers.** Declare `react` and `react-dom` as `^18.3 || ^19`. Run the test suite on 19, and cover 18 with the smoke test and the Make kit. Make kit docs still say React 18, though new Make files have run React 19 since August 2026.
9. **Consumption smoke test.** Two scratch apps outside the monorepo install the packed tarballs, import the stylesheet, build, and lint with the shared configs. This catches the `exports`, declaration and directive bugs that a workspace symlink would hide.
   - A Next 16 app: a Server Component page, plus a client component that adds Motion to `Modal`.
   - A Vite app on React 18.
10. **Figma Make compatibility.** Build a Make kit from the published package and a first draft of the guidelines (generated properly in Phase 6). A new Make file using the kit must render `Box`, `Button` and `Card` with Fossil's tokens applied. This also answers whether Make handles the precompiled CSS cleanly.
11. **Agent instructions for components.**
    - The root `AGENTS.md` gains one short on-system example: a component's CSS Module and its variant map. GitHub's analysis found one real snippet beats paragraphs of description.
    - `packages/react/AGENTS.md` holds the component rules and a **Known issues** list from the dry run, the traps an agent would otherwise rediscover:
      - `moduleResolution: "bundler"` is needed for CSS Module types;
      - generate those types before type-checking;
      - relative imports need `.js` extensions;
      - `preserveModules` keeps `'use client'`;
      - `prepack` must build;
      - play functions can't test native behaviour;
      - test dependencies go in `optimizeDeps.include`.

**Design rule:** if a component needs a value the tokens do not have, that is a signal to add a token, not to add a one-off style.

**Exit criterion:**
- Every component renders in Storybook.
- All interaction, real-input and a11y tests pass.
- No component stylesheet fails the shared Stylelint config.
- Both smoke-test apps build and render from the packed tarballs with no CSS tooling of their own.
- attw and publint are clean.
- A Make file using the Fossil kit renders the components with tokens applied.

---

### Phase 5: Enforcement

**Goal:** off-system output fails CI, in Fossil and in every consumer, from the same two configs.

Both configs combine core and widely used rules with lists generated from the tokens. Fossil writes no lint rules of its own. Fossil lints its own source with them too, so the consumer path is dogfooded on every commit.

**Tasks**
1. **`@fossil-design/stylelint-config`.** Built at the start of Phase 4, which needs it for its exit criterion (ADR 0008).
   - **`stylelint-declaration-strict-value`:** colour, background, fill, stroke, padding, gap, radius, font and duration properties must use a custom property. Plain keywords such as `inherit`, `transparent` and `0` are allowed.
   - **`stylelint-value-no-unknown-custom-properties`:** every `var()` must name a custom property that exists. It imports Fossil's `tokens.css` plus the consumer's site tokens.
   - **Core `declaration-property-value-disallowed-list`:** rejects primitive and deprecated names, using the generated lists, and raw colour syntax (hex and colour functions) in any value. The strict-value rule only sees colour properties, so without this a raw colour could sit in a local custom property or a shadow.
   - **Core `declaration-property-value-allowed-list`:** margins may only be `0`.
   - **Disables:** `reportDescriptionlessDisables` and `reportNeedlessDisables` are on.
   - **The `siteTokens` option** names the consumer's own tokens file. Those files may alias Fossil primitives and hold raw values; everywhere else is semantic-only. This is the sanctioned way to add site-specific tokens, such as the portfolio's coffee and heart colours.
2. **`@fossil-design/eslint-config`.**
   - **Core `no-restricted-syntax`** bans raw layout elements (`<div>`, `<section>`, `<nav>` and similar) in favour of `<Box as="…">`. Severity is `error` in Fossil and `warn` in the portfolio. Member expressions such as `motion.div` aren't plain elements, so the portfolio's Motion layer passes.
   - **`@eslint-community/eslint-plugin-eslint-comments` `require-description`:** every disable needs a reason. `reportUnusedDisableDirectives` is on.
   - **Optional `@typescript-eslint/no-deprecated`** flags deprecated component exports and props. It is type-aware, so it's opt-in.
3. Escape hatch policy, documented and implemented:
   - Level 1, sanctioned: the narrow `style` prop on `Box`. No suppression needed.
   - Level 2, logged: a lint-disable comment with a written reason. Every margin goes through this level, after asking first.
   - Level 3, signal: three occurrences of the same escape open a gap for review (task 5), which usually ends in a new token.
4. CI **reports** the escape count on each PR. It does not fail on it. A system that makes deviation impossible is one you will eventually fight and lose to; a system that makes deviation visible is one you stay in voluntarily.
5. **Gap log and promotion.** Log a gap whenever an agent in the portfolio can't build something from Fossil, rebuilds something Fossil might need, or adds a Level 2 escape. A gap is an issue on the Fossil repo, from a `gap` issue template, recording four things: where it came up, what the task needed, what Fossil offered, and the evidence.
   - Review open gaps at each release, and close each one with a recorded decision:
     - **Component:** add it to Fossil with variants, a story, tests, and "when to use" and "when not to use" docs. The Figma library and the Make guidelines pick it up on release.
     - **Pattern:** document how to compose it from existing components in Fossil's generated docs, without new code.
     - **Keep local:** it stays a composition in the portfolio, and the reason is recorded.
   - Three gaps for the same need trigger a review. They don't promote anything automatically.
   - With one consumer, "several teams need it" can't be the test. Use repetition inside the portfolio, and whether the thing is generic, meaning it carries no portfolio-specific content.

**Exit criterion:**
- A deliberately off-system commit fails CI in Fossil and in the smoke-test app. It includes a raw `<div>`, a hex colour, a primitive token and a margin without a reason.
- The escape count appears in the PR summary.
- A test gap goes through review to a recorded decision.

---

### Phase 5b: Figma component library

**Goal:** Fossil's components exist in Figma, generated from code, with names that map straight to code.

This library is required. It narrows output on the design side the way the closed `Box` API narrows it in code. When Claude Code reads a canvas design through the Figma MCP server, an instance of a Fossil component arrives as `Button` with a `tone` prop. A frame drawn from raw shapes arrives as generic boxes the agent has to guess about. All Figma design work, whether by hand or with the Figma agent, starts from this library.

**How it runs.** The same split as the token sync. Scripts decide everything that must be exact: names, variants, properties and which variable each property uses. They also create the styles and icons, and check the result. The agent does the part that needs judgment, turning each component's JSX and styles into Figma frames (ADR 0015).

**`Box`, `Stack` and `VisuallyHidden` stay out of the library.** Figma's auto layout already does the job of `Box` and `Stack`. A frame whose spacing and fills are bound to Fossil variables reaches Claude Code as `var(--fossil-*)` values, which map straight onto their props. `VisuallyHidden` renders nothing visible, so its instance would be an invisible layer. The spec and the check skip all three.

**Tasks**
1. **Library spec.** `pnpm figma:library-spec` generates a spec for each component from code:
   - its name, and its variant properties and values, from its variant map, with code's defaults;
   - which token each styled property uses in each variant, from its CSS Module (parsed with PostCSS) and its JSX (read with the TypeScript compiler). The JSX says which variant classes share an element, which `Box` and `Text` props an element takes, and which library components it nests;
   - its component properties, named after its props: text, boolean, instance swap or slot.

   Layers are named after the CSS class, or the state selector, they stand for, such as `tab[aria-selected='true']`. A small reviewed table in `figma-sync` records what code can't say: each component's root layer, the layers Figma must have, derived axes such as `Button`'s `iconOnly`, and the kind of each property. Every name in it is checked against code. Typography and shadow tokens map to text and effect styles. The spec also writes a build sheet in Figma's names.
2. **Styles, then components.** A generated styles script creates the text and effect styles, with their parts bound to variables, and one component per icon, named after its React export. Line height is set as a percentage, since Figma reads a number variable on it as pixels. The reference brand's open fonts are what make the text styles possible, because `use_figma` can't load custom fonts. Then Claude Code builds each component through `use_figma`, with Figma's `figma-use` and `figma-generate-library` skills, on one Components page with a section per component. It reuses the Phase 3 variables and never creates new ones.
   - For each variant, it lays out auto-layout frames from the component's JSX and stories and the build sheet.
   - It binds every property to the variable the spec names: `setBoundVariable` for sizes, padding, gap and radius, and `setBoundVariableForPaint` for fills and strokes.

   Build one component at a time. On the Education plan, Figma's MCP calls are capped at 200 a day and 10 a minute. Figma's own rate-limit page lists 15 a minute for Professional but says Education uses Professional's limits at 10, so plan for 10.
3. **Naming parity replaces Code Connect.** Figma component names, variant property names and variant values match the React component names, prop names and variant map exactly. The spec supplies them, so the agent never chooses a name. Without Code Connect, `get_design_context` returns an instance with only text and boolean overrides as a call such as `<Button children="Save changes" icon />`, and anything else as markup with `data-name` and variables as `var(--fossil-*, fallback)`. Matching names are what let Claude Code map either onto `@fossil-design/react`.
4. **Library check.** `pnpm figma:library-check` writes a hashed script that compares the library in Figma with the spec, and verifies the result it returns. It checks component names, descriptions, variant properties and values, defaults, component properties, nested library instances and every binding. An unbound fill, stroke, spacing or radius, or a binding to the wrong variable, fails.
   - It runs locally, not in CI. The REST endpoints on this plan return variable IDs but not names, so a CI check would need a committed snapshot to map them.
5. **Skill.** Add a library workflow to the `fossil-figma-sync` skill: generate the spec, run the styles script, build one component, run the check, and repeat.
6. After a release that changes a component's API, regenerate the spec, run the check, and update only what it reports, in place, as `figma-generate-library`'s reconciliation mode does.

**Exit criterion:** every component in the manifest except `Box`, `Stack` and `VisuallyHidden` has a Figma component set with matching names and variants, every property bound to the variable the spec names, and the library check passes.

---

### Phase 6: Agent context layer

**Goal:** an agent in a consumer repo has everything it needs without being asked, from what's installed.

The approach follows Next.js 16.2, which bundles its docs as Markdown inside the `next` package and adds a short `AGENTS.md` block pointing at them.
- In Vercel's evals, a docs index in `AGENTS.md` scored 100%.
- Skills scored 53%, and 79% with explicit instructions to use them.

Always-on context beat retrieval, which is the same finding behind Fossil's always-on foundation rules.

**Tasks**
1. **Document each component in its JSDoc,** not only in Docs-tab prose:
   - when to use it, and when not to, with a pointer to the right alternative;
   - its states;
   - accessibility, split into what the component guarantees and what the code using it must still do.

   Use `react-docgen-typescript`. Storybook's default `react-docgen` dropped `Button`'s variants and every `Box` layout prop in the dry run.
2. **Bundle docs in the package.** Generate Markdown into `@fossil-design/react/docs/` at build time, so the docs always match the installed version:
   - one file per component, with props, variants, the JSDoc contract and an example taken from its stories;
   - `tokens.md`, from `tokens.json`;
   - `foundations.md`.
3. **Generate the `AGENTS.md` block.**
   - It sits between managed markers, so updates replace only the block.
   - It contains a compressed index of components and their doc paths, plus the foundation rules: spacing scale, type scale, semantic colours, the padding-and-`gap` rule, the escape-hatch policy and the gap-logging rule.
   - Keep it small. Vercel compressed theirs from 40 KB to 8 KB with no loss.
   - A small bin script in `@fossil-design/react` writes or updates the block in the consumer's `AGENTS.md`, and adds `@AGENTS.md` to `CLAUDE.md` when one exists.
4. **Storybook MCP for Fossil's own development.**
   - Install `@storybook/addon-mcp`, which requires `@storybook/addon-vitest`, and set `componentsManifest: true` in `.storybook/main.ts`. Manifests are off by default.
   - Agents working on Fossil use it to write stories and run tests. Do not build a custom component MCP server.
5. **Make guidelines, shipped in the package.** Generate `@fossil-design/react/guidelines/` at build time from the same docs: `Guidelines.md`, `setup.md` (stylesheet import and theme), `tokens.md`, and one file per component. They version with the package, so a prototype gets the guidelines that match the components it installed.
   - Only `Guidelines.md` is required. Make always reads it first and reads the other files only when `Guidelines.md` points to them, so it must route to each one explicitly.
   - Figma recommends several short files over a few long ones.
   - **Without a kit:** a Make file installs the package from npm, and its own `Guidelines.md` is one line pointing at `node_modules/@fossil-design/react/guidelines/Guidelines.md`. Publishing a kit needs Figma's npm registry, which the Education team doesn't have (Learnings, section 5).
   - **Check first** that Make's agent reads files under `node_modules`. If it doesn't, the package also serves the folder as plain files a designer can copy in, and the one-line pointer becomes a documented copy step.
   - **With a kit,** where publishing works, the kit's guidelines are the same pointer, and a release reaches every Make file by updating the package version in the kit.
6. **Format split,** following the Indeed benchmark: JSON for anything machine-consumed (component APIs, props, variants, token values), and Markdown for instructions and rules.
7. **Finalise Fossil's own `AGENTS.md`:**
   - foundation rules always-on;
   - component details delegated to the bundled docs and Storybook MCP;
   - the escape-hatch policy and gap-logging rule stated explicitly.
8. **Completeness check in CI.** The docs generator fails if a component lacks its JSDoc contract.

**Exit criterion:**
- Docs and Make guidelines regenerate from source, and CI fails on an undocumented component.
- A new Make file with only the package installed and a one-line `Guidelines.md` renders `Box`, `Button` and `Card` on-system, with no kit.
- In a scratch consumer repo, the bin adds the `AGENTS.md` block, and an agent can list Fossil's components and token rules from installed files alone, offline.

---

### Phase 7: Drift measurement

**Goal:** a number, where the field currently has none.

This is the most publishable artifact in the project and the strongest case-study material. Do not skip it.

**Tasks**
1. Build a prompt corpus of 20 to 30 realistic UI tasks ("add a testimonial card", "build a two-column project layout").
2. Harness: run each prompt against an agent in a clean checkout, capture the diff. Keep runs independent, and have a separate evaluator, which sees only the criteria and the result, grade anything that needs judgment. Evil Martians' `ai-design-system` scenarios are prior art for this setup. They grade component choices and the resulting UI, not the on-system rate below, so Fossil's number would still be new.
3. Score each result on:
   - **On-system rate:** proportion of style declarations using tokens versus literals.
   - **Escape rate:** lint-disable comments introduced.
   - **Component reuse:** existing components used versus components rebuilt from `Box` or raw elements.
   - **Pass rate:** does it survive lint, typecheck and a11y tests unmodified.
4. Run the corpus in three configurations to isolate what each layer contributes:
   - **No context:** no `AGENTS.md` block, lint configs off.
   - **Context only:** the `AGENTS.md` block and bundled docs, lint configs off.
   - **Context plus constraint:** everything.

   This is the experiment that turns the project's thesis into evidence.
5. Optional: prototype a subset of the same prompts in Figma Make twice, once with a kit Make extracts from a Figma library and once with the Fossil kit built from the npm package. Hand each to Claude Code through the Figma MCP server and score it with the same metrics. This tests whether a written-down system beats an inferred one.
6. Publish results in the docs site with methodology.

**Exit criterion:** the three configurations produce distinguishable numbers and the methodology is written up clearly enough for someone to reproduce it.

---

### Phase 8: Documentation and dogfooding

**Goal:** the portfolio site is built entirely from Fossil, a fork can adopt it from the docs alone, and the docs explain the reasoning.

**Tasks**
1. **Docs site:** the Storybook static build, hosted on GitHub Pages. It covers:
   - getting started;
   - a token reference generated from source;
   - the component docs;
   - MDX architecture pages with an index of the ADRs.
2. **"Adopt Fossil" guide** for a team using the repo as a template:
   1. Set the name, prefix and scope in `fossil.config.json`.
   2. Replace the primitive values, and the semantic mapping where the brand needs it.
   3. Choose how the app consumes the packages. Either publish under the team's own scope, with the same trusted-publishing bootstrap, or keep the app in the fork's own `apps/` folder and skip publishing.
   4. Create a Figma file, apply the variables, and generate the library.
   5. Add the lint configs and the `AGENTS.md` block to the app.
3. Write up the decisions that carry the most weight, each with the alternative that was rejected and why:
   - Git as source of truth, not Figma
   - CSS Modules over vanilla-extract, reversed after the dry run
   - Stylelint for styles and ESLint for JSX, with off-the-shelf rules rather than custom plugins
   - The values-only write boundary
   - Design tools as consumers: Figma round-trips values, Figma Make is one way
   - The Figma component library: required, generated from code, checked by script
   - Harvested components over a headless library
   - Bundled docs over an MCP server for consumers
   - The budget-plan constraint: what Code Connect and the Variables REST API would have provided, and what replaced them
   - Two tiers, not three
   - A template rather than a themeable package
4. **Migrate the portfolio onto Fossil** in its own repository.
   - Install `@fossil-design/react`, `@fossil-design/tokens` and both lint configs from npm at a pinned `0.x` version.
   - Replace its local tokens and `src/components/ui/` components using the Phase 1 mapping. Site tokens move into its site-tokens file.
   - Add Motion on top of Fossil's interactive components through their extension points, and connect Lenis through `onShowingChange`.
   - Its compositions stay local, rebuilt on Fossil.
   - Retire the portfolio's Claude Design sync (`.design-sync/`, 34 components) and its `conventions.md`, which names tokens that will no longer exist.
5. The site repo's ESLint and Stylelint configs extend Fossil's. This is deliberate: it tests the enforcement story from outside the monorepo, which is where it actually has to work.
6. Track the escape-hatch count on the site as the honest measure of whether the constraint holds.
7. Publish `1.0.0`. The taxonomy has now survived contact with a real consumer.
8. Upgrade the site to `1.0.0` and record what broke. This is the upgrade-path dogfooding that the separate-repo decision exists to enable.

**Exit criterion:**
- The site is live, built from published Fossil packages rather than local source.
- At least one upgrade has been performed and documented.
- A fresh fork, following only the adoption guide, reaches a building, linting app and a Figma file with variables and the generated library.
- The docs answer "why" and not only "how" for each decision above.

---

## 4. Sequencing notes

Phases 0 through 2 are strictly sequential and are the spine of the project. Nothing else works without them.

Phase 3 (Figma) is independent of Phases 4 and 5 and can be reordered freely, but it must land before Phase 5b, which binds components to its variables. It is the most interesting and the most likely to stall, so tackle it when momentum is high rather than when the order says to.

Phase 5's Stylelint config is built at the start of Phase 4, because Phase 4's exit criterion lints every component stylesheet with it. The rest of Phase 5 follows Phase 4.

Phase 5b needs Phases 3 and 4. Build it straight after Phase 4, before any real design work starts in Figma.

Phase 7 depends on 4, 5 and 6 all being in place, since it measures their combined effect.

If the project has to stop early, the minimum coherent artifact is Phases 0 through 5b: a token pipeline with a typed, enforced component library that exists in both code and Figma. That is a complete and defensible thing. Phases 6 and 7 are what make it distinctive.

## 5. Standing conventions

- Every architectural decision gets a short ADR in `docs/decisions/`: context, options considered, decision, consequences. A dependency that shapes the architecture gets one; any other dependency is justified in its PR.
- Generated outputs are not committed: token build outputs, CSS Module types, `Box`'s CSS and the bundled docs. The build regenerates them, and `prepack` guarantees a tarball never ships a stale `dist/`. Never hand-edit a generated file.
- Commit messages follow conventional commits. Changesets accompany any change to a package's public surface.
