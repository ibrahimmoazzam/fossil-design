# Adopt Fossil

This guide turns a copy of this repository into your team's own design system: your name and npm scope, your brand's tokens, your Figma files, and apps that stay on-system. You keep the whole pipeline: tokens in git, CSS and typed components, Figma variables and a generated Figma library, the lint configs and the agent docs.

To use Fossil's own components as they are, with the reference brand, follow [Getting Started](../packages/react/docs-site/getting-started.md) instead. Adopting is for a team that wants its own brand, its own Figma files and designers' edits arriving as pull requests. [Key decisions](./key-decisions.md#11-a-template-rather-than-a-themeable-package) explains why that takes a copy rather than a package.

The examples use a system called Acme Design, with the CSS prefix `acme`, the npm scope `@acme-design` and the repository `acme/acme-design`. Use your own.

## What you need

- A GitHub account or organisation for the repository.
- Node 22.14 or later, and pnpm 12.8.1, the version `package.json` pins.
- For the Figma steps: a Figma Professional or Education plan, a Full seat, and an agent the Figma MCP server accepts. This guide uses Claude Code.
- To publish packages: an npm account with two-factor authentication.

## 1. Copy and rename

### Make your copy

On GitHub, choose **Use this template** or **Fork**.

- A template copy starts a fresh history, and can be private.
- A fork keeps the link to Fossil, so you can pull its later fixes and send changes back. A fork of a public repository stays public.

Then turn off releases for now. In your repository's **Actions** tab, open the **Release** workflow and choose **Disable workflow**. Every push to `main` runs it, and until your scope exists on npm and trusts your repository ([step 3](#3-choose-how-apps-get-the-packages)), it would open version pull requests for Fossil's pending changes or try to publish and fail.

### Rename it

Clone the copy, install, and rename it on a branch:

```sh
pnpm install --frozen-lockfile
git switch -c rename
pnpm rename --name "Acme Design" --prefix acme --scope @acme-design --repo acme/acme-design
```

`fossil.config.json` holds the name, prefix and scope, and the token build, the class names and the agent docs read them from there. But package names, imports, stylesheets and repository URLs spell the old values out, so `pnpm rename` rewrites them too:

- `@fossil-design` becomes your scope, in package names, dependencies, imports and pending changesets;
- `--fossil-` becomes your prefix in every custom property, and `fossil-agents-md` becomes `acme-agents-md`;
- the repository becomes yours in every `repository`, `homepage` and `bugs` URL, which the gap form's link and npm's trusted publishing both read.

It leaves `docs/` and the changelogs alone, because they record Fossil's history. It refuses to run with uncommitted changes, so the rename is a diff of its own. Then it updates `pnpm-lock.yaml` and formats what it changed. Check the result:

```sh
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

### Rewrite what describes Fossil

This lists what still says Fossil in prose:

```sh
git grep -n Fossil -- . ':!docs' ':!**/CHANGELOG.md'
```

Rewrite what describes your system: the README, the opening of `AGENTS.md`, each package's README and `description`, the docs site's front page (`packages/react/docs-site/Landing.tsx`) and its title (`homeTitle` in `.storybook/manager.ts`), the gap form, and the few component prop descriptions that say "Fossil's". The docs site's name, tab titles and Getting Started page already read `fossil.config.json`.

Some names stay, on purpose: the `fossil.config.json` file, the `fossil()` factory in both lint configs, the `fossil-figma-sync` skill, the `fossil` namespace the Figma sync stamps on variables, the token build's `fossil:foundations` markers in `AGENTS.md`, and the `com.ibrahimmoazzam.fossil` key in the token files. They name Fossil's tooling and formats, not your brand.

### Make the rest yours

- **Licence.** Fossil is MIT licensed, which requires keeping its copyright notice. Add your own line above it in `LICENSE` and in each package's `LICENSE`, and set `author` in each `package.json`.
- **Pending changesets.** Delete the files in `.changeset/` other than `README.md` and `config.json`. They describe Fossil's next release, not yours.
- **Fossil's docs.** `docs/` holds Fossil's spec, research and decision records, which explain the system you now have. Keep them, and number your own decision records after Fossil's.
- **Gap labels.** The gap form adds a `gap` label, and gaps close with a decision label ([`gaps.md`](./gaps.md)). Create them:

```sh
gh label create gap
gh label create "decision: component"
gh label create "decision: pattern"
gh label create "decision: keep local"
```

Commit, push, open a pull request, and merge it once CI passes.

## 2. Make it your brand

Tokens come in two tiers ([Key decisions](./key-decisions.md#10-two-tiers-not-three)). Primitives hold raw values, and semantic tokens name what each value is for. Components only use semantic tokens, so replacing primitives rebrands everything built on them.

1. **Replace the primitive values** in `packages/tokens/src/primitive/`: colours, sizes, radii, timing and font families. Rename a primitive whose name no longer describes it, such as `base.color.blue.600` once your accent is green, and update the semantic tokens that alias it. Until your first release, nothing outside the repository uses these names, so a rename needs no deprecation. After it, deprecate with `replacedBy`, as [ADR 0005](./decisions/0005-token-taxonomy.md) describes.
2. **Change the semantic mapping where your brand needs it,** in `packages/tokens/src/semantic/`, such as which primitive `color.accent.default` aliases in light and in dark. Keep the semantic names: the components, the lint lists and the Figma bindings use them.
3. **Check as you go** with `pnpm --filter tokens validate`, then `pnpm build`. Text, border and focus colours declare what they must stand out against, and a test fails when a pair falls short of WCAG 2.2 AA in light or in dark, so your palette can't ship an unreadable pair. The foundations block in `AGENTS.md` lists each ratio.
4. **Fonts.** Fossil ships no fonts; the font tokens name them. Two places need fonts by name:
   - **Figma.** Building the library needs each face, in each weight the text styles use, among Figma's fonts. Google Fonts are; the Figma MCP server can't load custom fonts.
   - **Figma Make.** Rewrite the font `@import` in `packages/react/docs-src/guidelines/setup.md`. The build fails if it misses a family a font token uses.
5. **The docs site's icons** are in `packages/react/docs-site/public/`.

Commit with the foundations block the build writes into `AGENTS.md`. CI fails if the build would change it.

## 3. Choose how apps get the packages

|                                     | Publish under your scope                              | Keep apps in `apps/`              |
| ----------------------------------- | ----------------------------------------------------- | --------------------------------- |
| Apps in other repositories          | Yes                                                   | No                                |
| Figma Make with the real components | Yes: Make installs from public npm                    | No                                |
| Upgrades                            | Each app moves to a new version when it chooses       | Every app moves with every change |
| Setup                               | An npm organisation, a first publish by hand, then CI | None                              |

### Publish under your scope

**Create the npm organisation** for your scope at npmjs.com, under **Add Organization**. It's free for public packages. Keep the repository public: npm only adds provenance to a version published from a public repository.

**Set up the repository** ([ADR 0004](./decisions/0004-protect-main.md)):

- In **Settings › Actions › General**, allow GitHub Actions to create and approve pull requests. The release workflow opens a version pull request.
- In **Settings › Rules › Rulesets**, add a ruleset for the default branch that blocks force pushes and deletions, requires a pull request, and requires the checks `Check on Node 22.14.0`, `Check on Node 24` and `Smoke-test the packed packages`.

**Publish the first versions by hand,** from an up-to-date `main`. npm's trusted publishing can't create a package, so each one needs a version on npm first:

```sh
npm login
pnpm build
pnpm -r publish --access public
```

pnpm publishes in dependency order and replaces `workspace:` ranges with real versions. If npm asks for your two-factor code, run it again with `--otp <code>`; it skips what's already published. Each package keeps the version it had in Fossil; to start your own numbering, change `version` in each published `package.json` first.

**Let the release workflow publish from now on,** by trusting it for each published package:

```sh
npm trust github @acme-design/tokens --file release.yml --repository acme/acme-design --allow-publish
npm trust github @acme-design/react --file release.yml --repository acme/acme-design --allow-publish
npm trust github @acme-design/eslint-config --file release.yml --repository acme/acme-design --allow-publish
npm trust github @acme-design/stylelint-config --file release.yml --repository acme/acme-design --allow-publish
```

**Turn the Release workflow back on.** From now on, a pull request that changes a package adds a changeset (`pnpm changeset`). The workflow collects them into a "chore: version packages" pull request. Approve its workflow run, let the checks pass, and merge it to publish. [ADR 0003](./decisions/0003-release-pipeline.md) explains the pipeline.

### Keep apps in `apps/`

**Delete `.github/workflows/release.yml`.** Nothing publishes, so nothing needs it.

**Add `apps/*` to the workspace,** in `pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
  - apps/*
```

**Create the app** in its own folder, such as `apps/web`, and depend on the packages with `workspace:*` in its `package.json`:

```json
"dependencies": {
  "@acme-design/react": "workspace:*",
  "react": "^19.3.0",
  "react-dom": "^19.3.0"
},
"devDependencies": {
  "@acme-design/eslint-config": "workspace:*",
  "@acme-design/stylelint-config": "workspace:*"
}
```

Use the React version the packages develop on, 19. Inside the workspace, the components' types come from the packages' own `@types/react`, so an app on React 18 fails to type-check. Published packages don't have this problem.

**Keep the app's build output out of the checks.** The root `pnpm lint` checks every app. Add its build folder, such as `apps/web/dist/` or `apps/web/.next/`, to `.gitignore`, which Prettier reads, and to `.stylelintignore`. Stylelint lints each file with the nearest config, so only `.stylelintignore` skips the output of an app with a Stylelint config of its own.

`pnpm build` then builds the packages first and the app after them, and `pnpm lint`, `pnpm typecheck` and `pnpm test` cover it. CI still packs and smoke-tests the packages, so they stay ready to publish.

## 4. Put it in Figma

The Figma library is two files ([ADR 0018](./decisions/0018-figma-foundations-and-components.md)): foundations, with the variables, text and effect styles and icons, and components, built from them. An agent carries Fossil's generated scripts to Figma through the Figma MCP server, because on these plans nothing else can write to Figma. The `fossil-figma-sync` skill in `.claude/skills/` holds the steps, and asks before each write.

1. **Connect Claude Code to Figma:** `claude plugin install figma@claude-plugins-official` installs the Figma MCP server and Figma's skills, and `/mcp` signs in.
2. **Create two design files in a team project,** not in Drafts, because you'll publish both: `Acme Design Foundations` and `Acme Design Components`.
3. **Apply the variables.** From an up-to-date `main`, ask Claude Code to apply the tokens to Figma, and give it the foundations file's URL. It creates a `Primitives` and a `Semantic` collection, with light and dark modes. Applying a second time should change nothing.
4. **Build the library.** Ask Claude Code to build the Figma component library. In the foundations file, it creates the text styles, effect styles and icons.
5. **Publish the foundations file** as a library. Then, in the components file, turn it on from the **Assets** panel's libraries. Only a person can; the Plugin API can't.
6. **Let it build and check the components.** Claude Code builds each component in the components file from the library's variables, styles and icons, then checks both files against the code until the check passes.
7. **Publish the components file.**

From then on, a designer who changes a value in Figma asks Claude Code to bring back the changes from Figma, and it opens a pull request. Values are all Figma can change: additions, renames and deletions happen in code ([Key decisions](./key-decisions.md#4-the-values-only-write-boundary)).

## 5. Set up an app

[Getting Started](../packages/react/docs-site/getting-started.md) covers the app itself, and on your docs site it shows your names. In short:

1. Install `@acme-design/react` (or depend on it with `workspace:*`), and import `@acme-design/react/style.css` once.
2. Add `@acme-design/eslint-config` and `@acme-design/stylelint-config`.
3. Run `npx acme-agents-md` to put your system's rules and component index in the app's `AGENTS.md`, and `npx acme-agents-md --check` in its CI.

For Figma Make, with published packages: install `@acme-design/react` in the Make file, and make its `guidelines/Guidelines.md` one line:

```md
Read node_modules/@acme-design/react/guidelines/Guidelines.md before writing any code, and follow it.
```

## 6. Publish the docs site

The docs site is Storybook's static build, and `.github/workflows/docs.yml` deploys it from `main`. In **Settings › Pages**, set the source to **GitHub Actions**. A custom domain is optional, and set there too.

## Check your copy

A copy is adopted when all of these pass:

```sh
pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm check:packages
pnpm smoke
```

`pnpm smoke` installs your packed packages into a Next.js app and a Vite app on React 18, then type-checks, lints, builds and renders them, runs `acme-agents-md` in both, and checks that lint rejects an off-system component. It needs the network.

In Figma, the components check passes, and both files are published.
