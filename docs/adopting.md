# Adopt Fossil for Your Brand

This guide turns a copy of this repository into your team's own design system: your name and npm scope, your brand's tokens, your Figma files, and apps that stay on-system. You keep the whole pipeline: tokens in git, CSS and typed components, Figma variables and a generated Figma library, the lint configs and the agent docs.

To use Fossil's own components as they are, with the reference brand, follow [Getting Started](../packages/react/docs-site/getting-started.md) instead. Adopting is for a team that wants its own brand, its own Figma files and designers' edits arriving as pull requests. [Key decisions](./key-decisions.md#11-a-template-rather-than-a-themeable-package) explains why that takes a copy rather than a package.

The examples use a system called Acme Design, with the CSS prefix `acme`, the npm scope `@acme-design` and the repository `acme/acme-design`. Use your own.

## What you need

- A GitHub account or organisation for the repository.
- Node 22.14 or later, and pnpm 12.8.1, the version `package.json` pins.
- Chromium, which the browser tests run in, installed once per machine: `pnpm --filter react exec playwright install chromium`. Without it the first `pnpm test`, in step 1.3, fails on the real-input tests rather than on anything you changed.
- For the Figma steps: a Figma Professional or Education plan, a Full seat, and an agent the Figma MCP server accepts. This guide uses Claude Code.
- To publish packages: an npm account with two-factor authentication, and the organisation for your npm scope already created ([3A.1](#3a-publish-under-your-scope) says how). Create it before you rename, not when you reach step 3: the rename writes your scope through every package name, dependency, import and badge, so a scope that turns out to be taken costs you a second rename.

## 1. Copy and rename

### 1.1 Make your copy

On GitHub, choose **Use this template** or **Fork**.

- A template copy starts a fresh history, and can be private.
- A fork keeps the link to Fossil, so you can pull its later fixes and send changes back. A fork of a public repository stays public.

### 1.2 Turn off the Release and Docs workflows for now

In your repository's **Actions** tab, open each of **Release** and **Docs** and choose **Disable workflow**. Every push to `main` runs both, and neither can do its job yet.

- **Release** publishes, or opens a version pull request, as soon as a changeset exists. On a copy that inherited none it runs and succeeds, doing nothing, so leaving it on looks safe until your first change to a package. Your scope doesn't exist on npm or trust your repository until [step 3A](#3a-publish-under-your-scope), and any changeset your copy did inherit describes someone else's release, which 1.5 deletes.
- **Docs** fails its deploy job until Pages is configured: `Failed to create deployment (status: 404). Ensure GitHub Pages has been enabled`. Nothing in the repository fixes that, and [step 6](#6-publish-the-docs-site) is where you set Pages up, once the site carries your brand rather than Fossil's. Disabling it also stops the build that checks the site on a pull request, so until step 6 check it yourself with `pnpm --filter react build-storybook`.

### 1.3 Rename it

Clone the copy, install, and rename it on a branch:

```sh
pnpm install --frozen-lockfile
git switch -c rename
pnpm rename --name "Acme Design" --prefix acme --scope @acme-design --repo acme/acme-design
```

`brand.config.json` holds the name, prefix and scope, and the token build, the class names and the agent docs read them from there. But package names, imports, stylesheets and repository URLs spell the old values out, so `pnpm rename` rewrites them too:

- `@fossil-design` becomes your scope, in package names, dependencies, imports and pending changesets;
- `--fossil-` becomes your prefix in every custom property, `fossil-agents-md` becomes `acme-agents-md`, and `AGENTS.md`'s `fossil:foundations` markers become `acme:foundations`, which is where the token build writes the foundations block and what it looks for by prefix;
- the repository becomes yours in every `repository`, `homepage` and `bugs` URL, which the gap form's link and npm's trusted publishing both read.

It leaves `docs/` and the changelogs alone, because they record Fossil's history. It refuses to run with uncommitted changes, so the rename is a diff of its own. Then it updates `pnpm-lock.yaml` and formats what it changed. Check the result:

```sh
pnpm build && pnpm lint && pnpm typecheck && pnpm test
```

### 1.4 Rewrite what describes Fossil

`pnpm rename` changed the names things are addressed by. What it leaves is prose: the sentences that say what this system is, in the files your team, your designers and your agents read. Three kinds of name sit in that prose, and each has one rule ([ADR 0020](./decisions/0020-what-a-fork-renames.md)). Almost all of it is the first kind, the system's name, which is yours now.

Work through the checklist below rather than a grep. A grep comes at the end, as a check: the hardest cases describe Fossil without naming it, so nothing finds them by searching for the name.

**What people read before they install anything:**

- `README.md`: the title, the opening, the layer table, the section offering the repository as a template, and the paragraph on rebuilding a component on a headless library.
- Each package's `README.md`, which is its npm page: `tokens`, `react`, `eslint-config` and `stylelint-config`.
- Each `package.json`'s `description`, the workspace root's and `figma-sync`'s included.
- `.github/ISSUE_TEMPLATE/gap.yml`: the form's prose, and the **What Fossil offered** field your own team fills in.

**Your docs site,** which step 6 publishes:

- `packages/react/docs-site/Landing.tsx`, the front page: its heading, its eyebrow and three sentences of body.
- `packages/react/docs-site/meta.ts`: `siteUrl` is your domain, or the `https://<owner>.github.io/<name>` your repository is served from, and `siteTitle`, `siteDescription` and `ogImage.alt` are your positioning. `pnpm rename` leaves all four alone, because a domain isn't a name and the rest is prose. Each export's JSDoc says what it has to do.
- `packages/react/docs-site/AdoptFossil.mdx`, and its title in `packages/react/.storybook/preview.tsx`'s page order: the page that offers your system as a template to fork, which is what yours now is to anyone who copies it.
- `packages/react/docs-site/links.ts`, which autolinks the system's name wherever a page mentions it.
- `packages/react/.storybook/manager.ts`, `packages/react/.storybook/theme.ts` and `packages/react/.storybook/preview-head.html`: `homeTitle`, and comments. The site's name, its tab titles and its Getting Started page already read `brand.config.json`.

**Your agent files,** which your agents read every session:

- `AGENTS.md`: its title and opening paragraph, and then `pnpm escapes`, the layout list, the gap fields and the definition of done. The foundations block between the `acme:foundations` markers is generated, so leave it to the token build.
- `packages/react/AGENTS.md` and `packages/figma-sync/AGENTS.md`.
- `.claude/skills/fossil-figma-sync/SKILL.md`: its description and its prose.
- The component contracts in `packages/react/src/components/`: sixteen JSDoc lines, such as "Classes from the app's own stylesheet, added to Fossil's". These travel furthest of anything here. They reach `packages/react/docs/`, the `AGENTS.md` block of every app that installs your package, and your editor's tooltips.

**Comments and test fixtures,** which only your own contributors read, and which an agent working in the repository reads with them. In `tests/adopting.test.ts` one of them is the name this step is checked against, so rewrite it with the rest: the test greps for it and holds the checklist to naming every file that has it, which is the check you want pointed at your own system rather than at a name your files no longer carry. The files: `scripts/rename.ts`, `tests/`, `.github/workflows/ci.yml`, `packages/react/vite.config.ts`, `packages/react/scripts/docs.test.ts`, `packages/react/scripts/fonts.test.ts`, `packages/tokens/scripts/build.ts` and `packages/figma-sync/src/`.

**Three things a grep can't find,** because they say what Fossil is without naming it:

- `Landing.tsx`'s eyebrow, `Open-source agentic design system`.
- `siteTitle`'s second half, `: Open-Source Agentic Design System`, and `siteDescription`, which names neither the system nor "agentic" on purpose, because the title sits above it.
- The opening line of each package's `README.md`, "an open-source agentic design system".

**Claims the rename makes yours.** Each of these was true of Fossil and reads, once renamed, as though it had been written about your system. Settle each one: reword it, keep it and say whose it is, or drop it. It isn't a find-and-replace, which is why it's listed apart.

- `AGENTS.md`: that the published packages "are the reference brand, harvested from the author's portfolio site".
- `README.md`: the market research and competitive analysis behind the workflow, and the drift eval that "is designed and will run in a later release".
- `docs/`, which `pnpm rename` leaves alone and 1.5 tells you to keep: Fossil's spec, its research, its decision records and its measured numbers. They explain the system you now have, and they are its history rather than yours.

**What keeps Fossil's name.** One thing has to:

- `com.ibrahimmoazzam.fossil`, the key under `$extensions` in every token file, with `VENDOR` and the tests that cover it in `packages/tokens/scripts/`. A reverse-DNS key names the author of the extension format rather than the system using it, and your token files use that format unchanged.

One more keeps it because nothing outside this repository reads it, so renaming it would buy nothing: the `fossil-figma-sync` skill's folder. Neither of the other two local names is one any more. The Figma stamp is your CSS prefix, and a fork with Figma files built before that needs `pnpm figma:restamp` once (step 4); `AGENTS.md`'s foundations markers are your prefix too, and 1.3 has already rewritten them.

**Where a library's own name belongs.** If you rebuild a component on Base UI, Radix or React Aria, name it in that component's JSDoc contract and in the package's dependencies, and nowhere else. The tokens, the Figma library, the lint configs and the sync can't tell what a component is built on, which is what keeps the swap cheap.

Then read the diff, for the two things a replacement gets wrong:

- **Grammar.** An article before the name: "a Fossil token" becomes "a Acme Design token".
- **Reflowed tables.** A longer or shorter name moves a Markdown table's borders, so end with `pnpm format`. Without it `pnpm lint` fails on Prettier before it reaches a rule.

Last, the grep, now that it is a check rather than the method:

```sh
git grep -n Fossil -- . ':!docs' ':!**/CHANGELOG.md'
```

What's left should be the vendor key, the two local names above, and the `.changeset/` files that 1.5 deletes.

### 1.5 Make the rest yours

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

**2.1 Replace the primitive values** in `packages/tokens/src/primitive/`: colours, sizes, radii, timing and font families. Rename a primitive whose name no longer describes it, such as `base.color.blue.600` once your accent is green, and update the semantic tokens that alias it. Read each token's `$description` as you go, in both tiers: it is prose, so no check can catch one that has stopped being true, and it travels further than the value, into `tokens.json`, into the foundations block in `AGENTS.md`, and onto the Figma variable your designers read when they ask which token to use. Until your first release, nothing outside the repository uses these names, so a rename needs no deprecation. After it, deprecate with `replacedBy`, as [ADR 0005](./decisions/0005-token-taxonomy.md) describes.

**2.2 Change the semantic mapping where your brand needs it,** in `packages/tokens/src/semantic/`, such as which primitive `color.accent.default` aliases in light and in dark. Keep the semantic names: the components, the lint lists and the Figma bindings use them.

**2.3 Check as you go** with `pnpm --filter tokens validate`, then `pnpm build`. Text, border and focus colours declare what they must stand out against, and a test fails when a pair falls short of WCAG 2.2 AA in light or in dark, so your palette can't ship an unreadable pair. The foundations block in `AGENTS.md` lists each ratio.

**2.4 Fonts.** Fossil ships no fonts; the font tokens name them. Two places need fonts by name:

- **Figma.** Building the library needs each face, in each weight the text styles use, among Figma's fonts. Google Fonts are; the Figma MCP server can't load custom fonts.
- **The font tokens' own descriptions.** `font.family.heading` and `font.family.mono` describe what the token is for, and a description that names a face names the wrong one once you have changed it (2.1).
- **Figma Make.** Rewrite the font `@import` in `packages/react/docs-src/guidelines/setup.md`. The build fails if it misses a family a font token uses.

**2.5 The docs site's artwork** is in `packages/react/docs-site/public/`: `favicon.ico`, `favicon.svg`, `apple-touch-icon.png`, and `og-image.png`, the card a link to your site shows in a chat or a feed. All four are Fossil's artwork until you replace them, and nothing in the build or the checks notices that you haven't, so a fork that skips this ships another system's logo as its own. The card is 1200 by 630, which `ogImage` in `docs-site/meta.ts` declares along with the URL a scraper fetches it from.

Commit with the foundations block the build writes into `AGENTS.md`. CI fails if the build would change it.

Step 2 also spends a budget you can't see. The same token sources write the block that `acme-agents-md` puts in an app's own `AGENTS.md`, and that block is capped at 8 KB, because it sits in an app agent's context on every request ([ADR 0017](./decisions/0017-agents-md-block-and-make-guidelines.md)). Fossil's own is a couple of hundred bytes under the cap. A new token costs about 100 bytes, a new component a few, and a longer CSS prefix costs a little on every custom property the block names. `pnpm build` fails when it goes over, naming the size and the files to shorten, and the block's own `foundations.md` is where detail belongs once the block can't hold it.

## 3. Choose how apps get the packages

Follow one route: 3A to publish under your own npm scope, or 3B to keep your apps in this repository.

|                                     | 3A. Publish under your scope                          | 3B. Keep apps in `apps/`          |
| ----------------------------------- | ----------------------------------------------------- | --------------------------------- |
| Apps in other repositories          | Yes                                                   | No                                |
| Figma Make with the real components | Yes: Make installs from public npm                    | No                                |
| Upgrades                            | Each app moves to a new version when it chooses       | Every app moves with every change |
| Setup                               | An npm organisation, a first publish by hand, then CI | None                              |

### 3A. Publish under your scope

**3A.1 Create the npm organisation** for your scope at npmjs.com, under **Add Organization**. It's free for public packages. Keep the repository public: npm only adds provenance to a version published from a public repository.

**3A.2 Set up the repository** ([ADR 0004](./decisions/0004-protect-main.md)):

- In **Settings › Actions › General**, allow GitHub Actions to create and approve pull requests. The release workflow opens a version pull request.
- In **Settings › Rules › Rulesets**, add a ruleset for the default branch that blocks force pushes and deletions, requires a pull request, and requires the checks `Check on Node 22.14.0`, `Check on Node 24` and `Smoke-test the packed packages`.

**3A.3 Publish the first versions by hand,** from a `main` that has your rename merged. That is step 1.5's pull request, and it is a precondition of this step rather than an aside: a `main` without it still carries Fossil's package names, at versions the registry already has, so `pnpm -r publish` answers "There are no new packages that should be published" and stops. That reads like success, and it is the lucky outcome: it did nothing only because those versions exist. A version the upstream system hasn't released yet, from a scope your account may write to, would have gone up under the upstream's name from your build.

npm's trusted publishing can't create a package, so each package needs a version on npm first:

```sh
npm login
pnpm build
pnpm -r publish --access public
```

pnpm publishes in dependency order and replaces `workspace:` ranges with real versions. If npm asks for your two-factor code, run it again with `--otp <code>`; it skips what's already published. Each package keeps the version it had in Fossil; to start your own numbering, change `version` in each published `package.json` first.

Then check what went up, because a partial publish is the likely failure and nothing reports it as one. Your scope's permission list names all four packages whether or not they published, so it looks right either way:

```sh
for p in tokens react eslint-config stylelint-config; do
  npm view @acme-design/$p version
done
cd "$(mktemp -d)" && npm install @acme-design/react
```

Four versions, and an install that brings `tokens` in with `react`. The install is the check that matters: it resolves the dependency range the publish wrote. On this system's own fork test ([`fork-test.md`](./fork-test.md)) three of the four published, which left `react` declaring a dependency on a `tokens` that did not exist, and only `npm view` showed it. Publish a missing one on its own with `pnpm --filter <folder> publish --access public`.

**3A.4 Let the release workflow publish from now on,** by trusting it for each published package:

```sh
npm trust github @acme-design/tokens --file release.yml --repository acme/acme-design --allow-publish
npm trust github @acme-design/react --file release.yml --repository acme/acme-design --allow-publish
npm trust github @acme-design/eslint-config --file release.yml --repository acme/acme-design --allow-publish
npm trust github @acme-design/stylelint-config --file release.yml --repository acme/acme-design --allow-publish
```

**3A.5 Turn the Release workflow back on.** From now on, a pull request that changes a package adds a changeset (`pnpm changeset`). The workflow collects them into a "chore: version packages" pull request. Approve its workflow run, let the checks pass, and merge it to publish. [ADR 0003](./decisions/0003-release-pipeline.md) explains the pipeline.

### 3B. Keep apps in `apps/`

**3B.1 Delete `.github/workflows/release.yml`.** Nothing publishes, so nothing needs it.

**3B.2 Add `apps/*` to the workspace,** in `pnpm-workspace.yaml`:

```yaml
packages:
  - packages/*
  - apps/*
```

**3B.3 Create the app** in its own folder, such as `apps/web`, and depend on the packages with `workspace:*` in its `package.json`:

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

**3B.4 Keep the app's build output out of the checks.** The root `pnpm lint` checks every app. Add its build folder, such as `apps/web/dist/` or `apps/web/.next/`, to `.gitignore`, which Prettier reads, and to `.stylelintignore`. Stylelint lints each file with the nearest config, so only `.stylelintignore` skips the output of an app with a Stylelint config of its own.

`pnpm build` then builds the packages first and the app after them, and `pnpm lint`, `pnpm typecheck` and `pnpm test` cover it. CI still packs and smoke-tests the packages, so they stay ready to publish.

## 4. Put it in Figma

The Figma library is two files ([ADR 0018](./decisions/0018-figma-foundations-and-components.md)): foundations, with the variables, text and effect styles and icons, and components, built from them. An agent carries Fossil's generated scripts to Figma through the Figma MCP server, because on these plans nothing else can write to Figma. The `fossil-figma-sync` skill in `.claude/skills/` holds the steps, and asks before each write. Every `pnpm figma:*` command only reads your repository and writes scripts into `packages/figma-sync/.figma/`; nothing reaches Figma until the agent carries a script there.

If you already have Figma files that were built before you renamed the fork, their hidden stamps still carry the old name, and the skill's migration section moves them before 4.3. A fork starting here has nothing to migrate.

**4.1 Connect Claude Code to Figma:** `claude plugin install figma@claude-plugins-official` installs the Figma MCP server and Figma's skills, and `/mcp` signs in.

**4.2 Create two design files in one team,** not in Drafts, because you'll publish both: `Acme Design Foundations` and `Acme Design Components`. Two things about where they go decide whether 4.5 works, and nothing else does:

- **Both in the same team.** On Professional and Education a library publishes to its team. Two files in two different teams get through 4.3 and 4.4, publish at 4.5, and then offer nothing to turn on.
- **A team on Professional or Education.** Publishing a library needs one of those plans, and a plan belongs to the team, not to you: creating a team offers Starter, which is the choice that needs no action and cannot publish. Everything up to 4.5 works on Starter, because variables, styles and components are all local writes. 4.5 is where it stops, and 4.5 is a step only a person can do.

Nothing else about location matters: not the project, not the folder. The sync addresses each file by the key after `/design/` in its URL, and no part of the token build, the scripts or the checks reads the project or the team. The agent needs the two URLs and nothing more.

**4.3 Apply the variables.** From an up-to-date `main`, with `pnpm install --frozen-lockfile && pnpm build` run and your token changes committed. Both are required, not advice: the sync reads `packages/tokens/dist/tokens.json`, which only the build writes, and it refuses an uncommitted token source, because it stamps the commit on Figma as the base for the next comparison. Step 2 ends with a build and a commit, so this bites when you come back to a clean clone.

Then ask Claude Code to apply the tokens to Figma, and give it the foundations file's URL. It creates a `Primitives` and a `Semantic` collection, with light and dark modes, and a variable for every token. Applying a second time should change nothing, and that is the check that the first one worked.

**4.4 Build the library.** Ask Claude Code to build the Figma component library. In the foundations file, it creates the text styles, effect styles and icons.

This is where 2.4's font requirement is tested, five steps after it is explained: the styles script refuses a text style whose face Figma doesn't have, in the weight the style sets. If it refuses, the fix is in Figma's font list rather than in the script.

**4.5 Publish the foundations file** as a library. Then, in the components file, open **Libraries** (the book icon at the top of the **Assets** panel, or **Main menu › Libraries**), find your team under **Teams**, and turn on **Acme Design Foundations**. The Assets panel on its own won't do it: it is where you open Libraries, and the switch is inside. Only a person can publish or turn on a library; the Plugin API can't.

**4.6 Let it build and check the components.** This is the longest step in the guide, and the only one where the agent writes Figma itself rather than carrying a generated script. `pnpm figma:library-spec` writes `packages/figma-sync/.figma/library.md`, the build sheet: every component, its variants and properties, and the variable, text style or effect style each layer binds. Claude Code builds from that sheet in the components file, importing each variable, style and icon from the foundations library, and checks its work with `pnpm figma:library-check`.

Measured on a fork of Fossil's 13 components, that sheet is 425 lines and stands for 72 variants, of which `Text` alone is 48 (twelve text styles by four tones), 96 named layers, 15 nested instances, 28 component properties and 386 bindings for the check to read. It took nine writes to Figma and four check runs. So expect to work through it with the agent rather than to issue it:

- **Nested components first,** because an instance needs its component to exist: `Icon` before `Button`, `Link` and `Clip`; `Figure` before `Clip`; `Button` before `Modal` and `Carousel`.
- **Check in groups,** `pnpm figma:library-check Card Modal Tabs`, rather than everything at once. Each check carries its components' spec to Figma in one script, and `use_figma` takes 50,000 characters; Fossil's full 13-component check is 44,000 of them, so a fork with more components has to group them. A short script also costs less to resend.
- **Fix what the report lists, then check again.** It names the component, the layer and the token it expected.

**4.7 Publish the components file.**

From then on, a designer who changes a value in Figma asks Claude Code to bring back the changes from Figma, and it opens a pull request. Values are all Figma can change: additions, renames and deletions happen in code ([Key decisions](./key-decisions.md#4-the-values-only-write-boundary)).

## 5. Set up an app

[Getting Started](../packages/react/docs-site/getting-started.md) covers the app itself, and on your docs site it shows your names. In short:

**5.1** Install `@acme-design/react` (or depend on it with `workspace:*`), and import `@acme-design/react/style.css` once.

**5.2** Add `@acme-design/eslint-config` and `@acme-design/stylelint-config`.

**5.3** Run `npx acme-agents-md` to put your system's rules and component index in the app's `AGENTS.md`, and `npx acme-agents-md --check` in its CI.

For Figma Make, with published packages: install `@acme-design/react` in the Make file, and make its `guidelines/Guidelines.md` one line:

```md
Read node_modules/@acme-design/react/guidelines/Guidelines.md before writing any code, and follow it.
```

## 6. Publish the docs site

The docs site is Storybook's static build, and `.github/workflows/docs.yml` deploys it from `main`. In **Settings › Pages**, set the source to **GitHub Actions**. A custom domain is optional, and set there too.

Then re-enable the **Docs** workflow, which 1.2 turned off, and run it from the **Actions** tab: it otherwise waits for your next push to `main`. From now on it deploys every push to `main` and builds on every pull request.

## Check your copy

A copy is adopted when all of these pass:

```sh
pnpm build && pnpm lint && pnpm typecheck && pnpm test && pnpm check:packages
pnpm smoke
```

`pnpm smoke` installs your packed packages into a Next.js app and a Vite app on React 18, then type-checks, lints, builds and renders them, runs `acme-agents-md` in both, and checks that lint rejects an off-system component. It needs the network.

In Figma, the components check passes, and both files are published.
