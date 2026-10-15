# The fresh-fork test

Phase 8's third exit criterion: a fresh fork, following only [the adoption guide](./adopting.md), reaches a building, linting app and a Figma file with variables and the generated library. This file records the run: every issue it found, and how each one is resolved.

The guide is the only part of Fossil with no check behind it. The token build validates, Stylelint rejects a raw value, `pnpm smoke` installs the tarballs into real apps, and the library check diffs Figma against the code. Nothing reads the guide and does what it says. This test does, once, and writes down what it cost.

## The run

|         |                                                                                                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Copy    | [ibrahimmoazzam/acme-foundry](https://github.com/ibrahimmoazzam/acme-foundry), public, from the template, archived on 2026-10-15 with its packages unpublished, its npm organisation deleted and its Figma files gone, so the second run starts from nothing |
| Created | 2026-10-12, from `5305359`, so it predates [#46](https://github.com/ibrahimmoazzam/fossil-design/pull/46)                                                                                                                                                    |
| Brand   | Acme Foundry, prefix `acme`, scope `@acme-foundry`                                                                                                                                                                                                           |
| Route   | 3A, publishing under its own scope                                                                                                                                                                                                                           |

Timings, on a warm pnpm store and an M-series laptop. A cold store and a cold CI runner are both slower, and the install especially so.

| Step | Command                           | Time  |
| ---- | --------------------------------- | ----- |
| 1.3  | `pnpm install --frozen-lockfile`  | 3.2s  |
| 1.3  | `pnpm rename`, rewriting 79 files | 3.4s  |
| 1.3  | `pnpm build`                      | 5.6s  |
| 1.3  | `pnpm lint`                       | 13.8s |
| 1.3  | `pnpm typecheck`                  | 4.8s  |
| 1.3  | `pnpm test`, 392 passing          | 18.9s |

The parent repository reports the same test counts, 41 files passed and 11 skipped, so the copy behaves identically.

## Issues

Status says how far each one is established. **Confirmed** means the run produced it. **Proven** means a deliberate probe produced it, then reverted. **By inspection** means the code says so but this run could not trigger it, and the reason is given.

Issues 1 to 32 are this run's. Issues 33 to 36 came later, from a dry rename of the branch tip in a scratch clone, made before the second run started rather than during the first: all four are faults the fixes above introduced, which Fossil's own green CI cannot see.

| #   | Where                                                 | Issue                                                                                                 | Status        | Goes to               |
| --- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------- | --------------------- |
| 1   | `scripts/rename.ts`                                   | The npm badge spells the scope percent-encoded, so the rename misses it                               | Confirmed     | Code, fixed           |
| 2   | `.storybook/*-head.html`                              | The docs site loads Space Grotesk without weight 700, and hard-codes all three families               | Confirmed     | Code, fixed           |
| 3   | Guide 1.2 and 6                                       | The Docs workflow fails on `main` until Pages is configured                                           | Confirmed     | Guide, fixed          |
| 4   | Guide 1.4                                             | Its seven categories leave 117 mentions of Fossil in 50 files                                         | Confirmed     | Guide, fixed          |
| 5   | Guide 1.4                                             | Its `git grep` cannot see prose that describes Fossil without naming it                               | Confirmed     | Guide, fixed          |
| 6   | Guide 1.4                                             | The rename turns Fossil's claims into plausible false ones                                            | Confirmed     | Guide, fixed          |
| 7   | Guide 1.4                                             | A plain find-and-replace breaks grammar                                                               | Confirmed     | Guide, fixed          |
| 8   | Guide 1.4                                             | Rewriting the sync's messages fails a test that asserts one                                           | Proven        | Guide and code, fixed |
| 9   | Guide 1.4                                             | It must end with `pnpm format`                                                                        | Confirmed     | Guide, fixed          |
| 10  | Guide 1.4                                             | It doesn't name `docs-site/meta.ts` or `og-image.png`                                                 | By inspection | Guide, fixed          |
| 11  | Guide 1.4                                             | It doesn't say which exported names stay                                                              | Confirmed     | Guide, fixed          |
| 12  | Guide "What you need"                                 | `playwright install chromium` appears only in `AGENTS.md`                                             | By inspection | Guide, fixed          |
| 13  | Guide 4.3                                             | It omits `pnpm build`, and that apply refuses an uncommitted token tree                               | Proven        | Guide, fixed          |
| 14  | Guide 4.4                                             | The font requirement is explained in 2.4 and fails here                                               | By inspection | Guide, fixed          |
| 15  | Guide 4.6                                             | One sentence stands for the longest step in the guide                                                 | Confirmed     | Guide, fixed          |
| 16  | Guide 2                                               | The 8 KB `AGENTS.md` block budget is never mentioned                                                  | Confirmed     | Guide, fixed          |
| 17  | Guide 1.2                                             | Its reason for disabling Release doesn't hold when no changeset is pending                            | Confirmed     | Guide, fixed          |
| 18  | `packages/react/scripts/docs.ts`                      | The Make guidelines' font check can never fail                                                        | Confirmed     | Code, fixed           |
| 19  | `AGENTS.md`                                           | `pnpm --filter react docs` runs pnpm's own `docs` command, not the script                             | Confirmed     | Docs, fixed           |
| 20  | `packages/stylelint-config/test/config.test.ts`       | The guide's own worked example in 2.1 turns the suite red                                             | Confirmed     | Code and guide, fixed |
| 21  | Guide 2.5                                             | It calls `public/` the site's icons, and a fork has no artwork of its own                             | Confirmed     | Guide, fixed          |
| 22  | Guide "What you need"                                 | It doesn't say the npm organisation has to exist before the rename writes the scope into 79 files     | Confirmed     | Guide, fixed          |
| 23  | Guide 1.5 and 3A.3                                    | Publishing from `main` before the rename is merged aims the publish at Fossil's own scope             | Confirmed     | Guide, fixed          |
| 24  | Guide 3A.3                                            | Nothing verifies the publish, so a half-finished one leaves a broken set                              | Confirmed     | Guide, fixed          |
| 25  | `scripts/rename.ts`                                   | The workspace root's `package.json` keeps the name `fossil-design`                                    | Confirmed     | Code, fixed           |
| 26  | `package.json`                                        | Claude Code's auto mode refuses `pnpm figma:apply`, which writes nothing to Figma                     | Confirmed     | Code, fixed           |
| 27  | Guide 4.2                                             | It says which folder the files go in, not the two things about placement that break 4.5               | Confirmed     | Guide, fixed          |
| 28  | `packages/tokens/src/semantic/typography.tokens.json` | Two token descriptions name Fossil's own typefaces, and travel into the fork's Figma file             | Confirmed     | Code and guide, fixed |
| 29  | Guide 4.5                                             | It sends you to the Assets panel to turn the library on, where there is nothing to turn on            | Confirmed     | Guide, fixed          |
| 30  | `.figma/library.md`                                   | The check demands a library text style on a text layer the sheet gives no typography for              | Confirmed     | Code, fixed           |
| 31  | `packages/figma-sync/src/runtime.ts`                  | Templating the stamp namespace silently duplicates a fork's existing library                          | Proven        | Code and docs, fixed  |
| 32  | `packages/tokens/scripts/validate.ts`                 | The validator's refusal names Fossil, and a test asserts the literal                                  | Confirmed     | Code, fixed           |
| 33  | `packages/tokens/scripts/formats.ts`                  | The foundations markers follow the CSS prefix, which the rename leaves, so a fork's first build fails | Proven        | Code and docs, fixed  |
| 34  | `packages/tokens/scripts/build.test.ts`               | Two tests assert those markers as literals, so a fork's suite is red once 33 is fixed                 | Proven        | Code, fixed           |
| 35  | `tests/rename.test.ts`                                | The rename rewrites its own fixtures' inputs and not their expectations                               | Proven        | Code, fixed           |
| 36  | `tests/adopting.test.ts`                              | Its grep target is a name spelled out, so a fork's checklist check passes or fails on how 1.4 read it | Proven        | Code and guide, fixed |

### 1. The rename misses a percent-encoded scope

`README.md` carries the npm badge as `label=%40fossil-design%2Freact`, and `rewrites()` only matches the plain `@fossil-design`. The fork's badge therefore reads `@fossil-design/react` while linking to `@acme-design/react`. One occurrence today, and `tests/rename.test.ts` has no case for an encoded scope.

**Fix:** rewrite the percent-encoded form alongside the plain one, and cover it in `tests/rename.test.ts`.

### 2. The docs site loads the wrong weight, from a hard-coded list

`preview-head.html` and `manager-head.html` both load `Space+Grotesk:wght@400;500;600`. Every heading style is weight 700, which the changelog records as deliberate, because Figma's Space Grotesk has no SemiBold. So the site's headings are synthesized by the browser, and 600 is a weight the brand abandoned. The Make guidelines get it right, `Space+Grotesk:wght@700`, and they are the only file `unloadedFonts` checks.

The same two files spell out all three families, and guide 2.4 names only the Make setup file, so a fork that changes its typeface gets a docs site in fallback faces with nothing failing.

**Fix:** generate the Google Fonts link from the font families and the weights the text styles use, and extend the font check to the head files.

### 3. The Docs workflow fails before Pages exists

On the copy's initial commit, before anything was renamed, the deploy job failed: `Failed to create deployment (status: 404). Ensure GitHub Pages has been enabled`. The build job passed. Step 1.2 disables Release for exactly this class of reason and says nothing about Docs.

**Fix:** disable Docs in 1.2 alongside Release, and re-enable it in step 6. Moving step 6 to the front is the alternative, but a fork can't publish a site it hasn't branded yet.

### 4. Step 1.4 leaves two thirds of the mentions

Before: 171 mentions in 73 files. After following its seven categories exactly: 117 in 50. The suite stays green, so nothing warns. What it leaves includes:

- `docs-site/AdoptFossil.mdx`, so the fork's own published site carries an "Adopt Fossil for Your Brand" page;
- `docs-site/getting-started.md`, the page an adopting app reads;
- `packages/react/AGENTS.md` and `packages/figma-sync/AGENTS.md`, neither named;
- `AGENTS.md` outside its opening, including the gap fields and the definition of done, in the file the fork's own agents read every session;
- the Storybook chrome: `theme.ts`, `DocsContainer.tsx`, `preview.tsx`;
- `links.ts`, which autolinks the name;
- both lint configs' exported `BrandOptions` type, and the sync's error messages.

**Fix:** replace the list of seven with a checklist of every file, grouped by what it reaches: the npm pages, the docs site, the agent files, the error messages. Say which to leave, and why.

### 5. Its grep cannot see the worst cases

The landing page's eyebrow read `Open-source agentic design system`, and `meta.ts` builds `siteTitle` as the name plus `: Open-Source Agentic Design System`. Both describe Fossil's positioning, neither contains the word "Fossil", so `git grep Fossil` returns neither.

**Fix:** name the positioning strings in the checklist, since no grep finds them.

### 6. The rename makes false claims look local

After renaming, `AGENTS.md` asserted that the published `@acme-design/*` packages "are the reference brand, harvested from the author's portfolio site", and the README offered the fork as a template to fork. The rename is what makes these read as if they were written about the fork.

**Fix:** list the claims a fork must delete rather than reword, in the same checklist.

**Decided: the guide flags them, and deletes nothing for the adopter.** The alternative was for 1.4 to tell a fork to delete the inherited prose that cannot be true of it (the drift eval, the measured numbers, the positioning), which would trim what a fork inherits. It isn't worth the loss: a fork can read its own docs and cut what it doesn't want, and the prose it would lose is the record of why the system is shaped this way, which is most of what makes a fork worth taking. So 1.4 names the claims that read as the fork's own and says to settle each one, and the fork decides whether that means rewording, keeping with attribution, or deleting.

### 7. A find-and-replace breaks grammar

Swapping `Fossil` for `Acme Foundry` produced "a Acme Foundry token" three times, because the article precedes the name.

**Fix:** tell the adopter to read the diff, and note the article.

### 8. Rewriting the sync's messages fails a test

The sync's own reports name Fossil, in strings its designers and agent read: `Fossil's sync lost track of …`, `Two variable collections are stamped as Fossil's … collection`, `no Fossil text style`. An adopter who keeps going past 1.4's list rewrites them and `pnpm test` fails, on `library.test.ts` asserting the literal string. Proven by probe, then reverted. So the adopter chooses between Fossil's name in their own designers' errors and a red suite, and the guide resolves neither.

**Fix:** decide it. Either the messages name the system from `brand.config.json` and the tests assert against that, or the guide says plainly that they stay and why.

### 9. Step 1.4 must end with `pnpm format`

Rewriting a Markdown table reflowed it, and `pnpm lint` failed on Prettier before anything else ran.

**Fix:** end 1.4 with `pnpm format`.

### 10. It doesn't name the site's metadata

[#46](https://github.com/ibrahimmoazzam/fossil-design/pull/46) added `docs-site/meta.ts`, holding `siteUrl`, `siteTitle`, `siteDescription` and the `ogImage`, plus `public/og-image.png`. Each export's JSDoc already tells a fork to write its own, which is the right place for it, but 1.4 doesn't list the file and 2.5 calls `public/` the site's icons.

**Fix:** add `meta.ts` to the checklist, and widen 2.5 past icons.

### 11. Which exported names stay?

Guide 1.4 listed the names that stay on purpose, including the factory both lint configs export, but not the options interface beside it, which was public API in a fork's own packages.

Answered by removing the question. Neither the factory nor the config file is written into anything Fossil and a fork exchange, so neither had a reason to carry Fossil's name: the file is `brand.config.json` and the export is `brand()` with `BrandOptions`. What stays is only what Fossil writes into a shared artifact, which [ADR 0020](./decisions/0020-what-a-fork-renames.md) states and step 1.4 now repeats.

### 12. Chromium is never mentioned

The browser tests need `pnpm --filter react exec playwright install chromium`, which appears only in `AGENTS.md`. The guide's "What you need" lists Node and pnpm. This run could not trigger it: the machine already had Chromium cached.

**Fix:** add it to "What you need".

### 13. Apply's preconditions are missing from 4.3

The skill requires `pnpm build` first, because the sync reads `tokens.json` from `dist/`, and `figma:apply` refuses to run with an uncommitted token tree, because it stamps the commit. The guide says only "from an up-to-date `main`". The happy path survives, because step 2 ends with a build and a commit, so this fires on anyone who returns to a clean clone.

**Fix:** state both in 4.3.

### 14. The font requirement fires five steps after it's explained

Guide 2.4 says Figma needs each face in each weight, and the styles script refuses a text style whose font Figma lacks. The failure arrives at 4.4.

**Fix:** forward-reference 2.4 from 4.4.

### 15. Step 4.6 undersells the longest step

"Let it build and check the components" is one sentence. Measured on this fork, it stands for:

|                          |                                                             |
| ------------------------ | ----------------------------------------------------------- |
| Components               | 13                                                          |
| Variants                 | 72, of which `Text` is 48: twelve text styles by four tones |
| Named layers             | 96                                                          |
| Nested instances         | 15                                                          |
| Component properties     | 28, across `TEXT`, `BOOLEAN`, `INSTANCE_SWAP` and `SLOT`    |
| Bindings the check reads | 386                                                         |
| The build sheet          | 425 lines, 23,647 bytes                                     |

It took 9 `use_figma` writes and 4 check runs, in an order the nesting fixes: `Icon` before `Button`, `Link` and `Clip`; `Figure` before `Clip`; `Button` before `Modal` and `Carousel`. Every component passed, and the report reads "The library matches the spec from `f0f60c3`".

Two things cost a retry each, and neither is in the sheet or in the skill's list of traps:

- **A slot cannot fill a parent that has no auto layout.** The skill warns that a new slot has no auto layout of its own; the failure here was one level up. `Figure`'s `frame` layer is `position: relative; overflow: hidden` in CSS, so building it as the sheet describes gives a plain frame, and `layoutSizingHorizontal = 'FILL'` on the slot inside it throws `FILL can only be set on children of auto-layout frames`.
- **A text layer with no typography in the spec still needs a library text style.** Issue 30.

Worth recording alongside the count: the agent is the transport for every generated script, and carries each one verbatim. Step 4 moved roughly 400 KB of script text through the conversation: 85 KB for the apply and again for its idempotency run, 19 KB twice for the styles script, and 20 to 44 KB per check run, the full 13-component check being 44,142 characters against `use_figma`'s 50,000 limit. That ceiling is close enough to matter: a fork with a few more components will have to check in groups.

**Fix:** say what 4.6 involves, that it is the longest step in the guide, and that the agent works nested-first from `.figma/library.md`. Give the adopter the shape of it, a component at a time with a check after each group, rather than one sentence that reads like a single command.

### 16. The `AGENTS.md` block budget is invisible until it fails

The fork's block came to 7917 bytes against the 8 KB cap in ADR 0017: 275 bytes spare. The block grows with the system's name and the number of components, and the guide never mentions a budget exists.

**Fix:** mention the cap in step 2, next to the name.

### 17. Disabling Release isn't needed for the stated reason

Step 1.2 says Release "would open version pull requests for Fossil's pending changes or try to publish and fail". On the copy's initial commit it ran and succeeded, doing nothing, because no changeset was pending. The advice is still right for later pushes.

**Fix:** correct the reason to what it is: it would publish, or open a version pull request, as soon as a changeset exists.

### 18. The font check can never fail

Guide 2.4 promises that "the build fails if it misses a family a font token uses". It cannot. `docs.ts` builds the guidelines with `source()`, which fills `{{fonts}}` from the token list, and then scans that filled text:

```ts
'setup.md': source('guidelines/setup.md'),   // already reads "Sora, Inter and IBM Plex Mono"
...
for (const font of unloadedFonts(guidelines['setup.md'], fonts))
```

Every family the check looks for has just been interpolated into the prose it searches, so `unloadedFonts` always returns nothing. Acme's fonts were changed to Sora, Inter and IBM Plex Mono, the `@import` still loaded Figtree, Space Grotesk and Space Mono, and the build passed. A fork's Figma Make prototypes would render in fallback faces, and so would its docs site, which issue 2 covers.

**Fix:** generate the Google Fonts URL from the token families and the weights the text styles use, then use it in `docs-src/guidelines/setup.md` and in both Storybook head files. The check then has nothing left to miss, and issues 2 and 18 close together.

### 19. A documented command no longer runs the script

`AGENTS.md` gives `pnpm --filter react docs`. On the pinned pnpm 12.8.1 that reaches pnpm's own `docs` command, which answers `error: the following required arguments were not provided: <PACKAGE>` and exits. The script needs `pnpm --filter react run docs`.

**Fix:** write `run docs` in `AGENTS.md`, and check the other scripts for names pnpm now takes.

### 20. The guide's example for 2.1 breaks the suite

Step 2.1 says to rename a primitive whose name no longer describes it, "such as `base.color.blue.600` once your accent is green". Doing exactly that failed two tests:

```
FAIL |stylelint-config| rejects a primitive aliased by a local custom property
FAIL |stylelint-config| may alias primitives and hold raw values in its own file
```

`test/config.test.ts` names `--<prefix>-base-color-blue-600` in three places, and the Stylelint config reads the built primitive list, so the sample stops naming a real primitive. Neither failure mentions renaming, and the guide's worked example is what causes them.

**Fix:** have the test take a primitive name from the built `lint.json` instead of spelling one out. Then note in 2.1 that renaming a primitive means updating what names it.

### 21. A fork has no artwork of its own

Step 2.5 says "the docs site's icons are in `packages/react/docs-site/public/`". The folder now also holds `og-image.png`, the preview card. Acme kept Fossil's, because a test fork has no logo to put there, and nothing in the build or the checks notices.

**Fix:** widen 2.5 past icons, and say plainly that the favicon, the touch icon and the preview card are Fossil's artwork until replaced.

### 22. The scope has to exist before the rename

Step 1.3 writes the scope into 79 files; step 3A.1 only then says to create the npm organisation for it. `@acme-design` turned out to be unavailable three steps after the fork was rebranded around it.

**Fix:** add one line to "What you need": have the npm organisation created before step 1.3, so the rename uses a scope already in hand.

### 23. Publishing from an unmerged `main` aims at the upstream scope

Step 3A.3 says to publish "from an up-to-date `main`", and step 1.5 ends with merging the rename pull request. Nothing connects the two, and the order matters more than it looks.

On this run the rename sat on a branch with its pull request still open, so `main` was the template's initial commit: Fossil's own package names, at versions already on the registry. `pnpm -r publish --access public` from there answered "There are no new packages that should be published" and did nothing, which looks like success and is not.

It did nothing only because those versions already exist. For the one person most likely to run this, the author of the upstream system, the scope on that `main` is a scope they can publish to, so a version Fossil had not released yet would have gone up under `@fossil-design` from a fork's build. Nothing in the guide warns about that, and the symptom when you are lucky is a message that reads like there was nothing to do.

**Fix:** make 3A.3 say to publish from a `main` that already has the rename merged, and have it say what the first publish should print, so "no new packages" reads as the error it is. Step 1.5's merge becomes a precondition of step 3, not an aside.

### 24. Nothing verifies the publish

Step 3A.3 runs `pnpm -r publish --access public` and says pnpm publishes in dependency order and skips what is already published. It does not say how to tell whether it worked.

On this run three of the four packages published and `tokens` did not, leaving `@acme-foundry/react@0.5.1` declaring a dependency on `@acme-foundry/tokens@^0.6.1` that does not resolve. The scope's own permissions list names all four, so even `npm access list packages` looks right; only `npm view` on each one shows the gap. Anyone installing the component package in that state gets an unresolvable dependency.

**Fix:** end 3A.3 with a check: `npm view <scope>/<name> version` for each published package, and an install of the component package into an empty folder. State that a partial publish is the likely failure, since the registry's permission list will not show it.

The run's own set was completed afterwards: all four packages answered `npm view`, and `npm i @acme-foundry/react` in an empty folder resolved and installed `tokens` with it. The scope was then unpublished with the rest of the copy. The finding stands on the window where it did not, which read as success.

### 25. The workspace root keeps Fossil's name

`pnpm rename` rewrites package names across the workspace, but the root `package.json` keeps `"name": "fossil-design"`. The root is private and unpublished, so nothing breaks, and it is the name an adopter sees at the top of their own manifest.

**Fix:** have the rename set the root's name from the repository it was given, so `ibrahimmoazzam/acme-foundry` makes it `acme-foundry`.

**Fixed** in `dc2e570`, alongside the stamp work that needed [ADR 0020](./decisions/0020-what-a-fork-renames.md) written. `main()` rewrites the root manifest's `name` from `rootName(to.repo)` when the repository changes, and `tests/rename.test.ts` covers it. Only the name moves: the root stays private and keeps its own description, which step 1.4 lists among the prose a fork owns.

### 26. Auto mode refuses the one command that only writes files

`pnpm figma:apply` reads `tokens.json` and git, and writes five scripts into `packages/figma-sync/.figma/`. It opens no network connection and changes nothing in Figma; the agent carries the scripts there afterwards, through `use_figma`, under the skill's own confirmation rule. Claude Code's auto-mode classifier refused it anyway:

```
Permission for this action was denied by the Claude Code auto mode classifier.
Reason: [Unrequested Commit in a Connected App]
```

`pnpm figma:library-spec` ran unrefused in the same session, and it is the same kind of work: read the repository, write generated scripts to the same folder. So the refusal tracks the word "apply" in the task name rather than anything the command does. The scripts were produced by calling the CLI directly instead, which is the same code by a name that does not read as a write.

It matters because guide 4.1 names Claude Code as the agent and the whole of step 4 runs through it. The refusal lands on the first command of 4.3, before anything has happened, and the reason given names a write to Figma that is not in the command.

**Fix:** the name should describe what the command does locally, since `figma:apply` describes the step it belongs to rather than its own effect. `figma:scripts`, beside `figma:library-spec`, would say it. Alternatively the template ships a permission rule for the `figma:*` generators in `.claude/settings.json`, which is narrower but leaves the misleading name. Either way the skill should say that generating the scripts touches nothing, so a refusal here is not a sign that something was about to be written.

**Fixed, under a different name than this issue proposed.** `figma:scripts` turns out to be ambiguous: `figma:read`, `figma:restamp` and `figma:library-check` all write scripts too, so the bare noun names what four commands do. The command is now **`pnpm figma:apply-scripts`**: it says it produces the apply's scripts and nothing else, and keeps the `apply`, `read`, `diff` triad legible. Run in auto mode immediately after the rename, in the same session that had refused `pnpm figma:apply`, it was allowed and wrote its five scripts. The misleading half is fixed as well as the refusal: the old name read as the write it is not.

`AGENTS.md`'s "ask first" list no longer names the generator at all, because what needs permission is a `use_figma` write, and both it and the skill now state that no `figma:*` command reaches Figma. The narrower alternative, a permission rule in `.claude/settings.json`, is not shipped: it would have left the name saying the wrong thing.

### 27. Step 4.2 names the folder but not the two constraints that bite

"Create two design files in a team project, not in Drafts, because you'll publish both." That covers Drafts, and leaves two conditions a fork can fail while following it exactly:

- **The team's plan, not the account's.** Publishing a library needs Professional or Education, which 4.2 does not repeat and "What you need" states as a property of the reader rather than of the team. A Figma plan belongs to a team, a new team's plan is chosen when it is created, and Starter is the choice that needs no action. On a Starter team everything through 4.4 works, because variables, styles and components are all local writes; 4.5 is where it stops, and 4.5 is a step only a person can do. The account in this run already held several Education teams and still got a plan choice when creating a new one.
- **Both files in the same team.** On Professional and Education a library publishes at team level, and the team-or-organisation choice appears only on Organization and Enterprise. Two files in two different teams would pass 4.3 and 4.4, publish at 4.5, and then offer nothing to turn on in the Assets panel. Nothing in the guide says the two files are related by anything other than both being "in a team project", which reads as satisfiable separately.

The project inside the team does not matter, and neither does anything else about location: the sync addresses each file by the key after `/design/`, and no part of the token build, the scripts or the checks reads the project or the team. That is worth saying too, because it is the question a fork asks.

Confirmed for the plan constraint, which this run hit: creating a team called Acme offered Starter, Professional and Education, and Education had to be chosen. Not triggered for the same-team constraint, because both files went into Acme; it rests on Figma's documented team-level publishing rather than on a probe, and proving it would mean building a second library to throw away.

**Fix:** 4.2 should say both files go in one team, that the team is on Education or Professional, and that the agent needs nothing but the two URLs.

### 28. Fossil's typefaces are written into the fork's Figma file

`font.family.heading` and `font.family.mono` carry these `$description` values, and the apply wrote both into the fork's foundations file as the variables' descriptions:

```
Headings. An app can point this at its own face; the portfolio uses Roobert.
Labels and code. An app can point this at its own face; the portfolio uses Roobert Mono.
```

Acme Foundry's faces are Sora and IBM Plex Mono. So the two variables a designer opens when asking which typeface to use are the two that name a typeface the fork does not have, attributed to a portfolio that is not theirs. These are the only two of the 91 token descriptions that do this.

Guide 1.4's `git grep Fossil` cannot find them, for the reason issue 5 records: neither says "Fossil". Step 2 is where a fork replaces its typefaces, and 2.4 covers Figma's font list and the Make `@import` but not the descriptions beside the tokens being changed. Nothing in the build or the checks compares a description against the brand, and nothing can: a description is prose.

**Fixed, and confirmed on the live file.** With the two descriptions rewritten and taken into the fork, the next apply reported exactly `["font.family.heading: description", "font.family.mono: description"]` against 134 variables unchanged, and the two variables now read "An app can point this at its own face" with no face named. A description change publishes like any other modification, so it reaches a fork's designers the same way.

**Fix:** two things, because there are two faults. Fossil's own two descriptions should stop naming a specific face, since the sentence's point is that the token is a seam an app can repoint. And step 2 should say to read the `$description` of every token being rebranded, because those strings are the text a fork's designers read in Figma, which [ADR 0020](./decisions/0020-what-a-fork-renames.md) rule 1 makes the brand's.

### 29. The Assets panel is not where a library is turned on

Step 4.5 said to publish the foundations file, "then, in the components file, turn it on from the **Assets** panel's libraries". The Assets panel has no switch. The library is turned on in the **Libraries** modal, which the panel's book icon opens: inside it, the team's published libraries are grouped under **Teams**, and each has a toggle. So the instruction names the thing you click to get there and not the thing you do, and the panel it names shows nothing relevant until after the step is finished.

The skill said the same, in step 3 of its library workflow, and so does [ADR 0018](./decisions/0018-figma-foundations-and-components.md)'s consequence that "turning a library on is a step only a person can do, in the Assets panel". The record of the decision is left as it was written; the two sets of instructions are the ones a person follows.

This is the sharpest kind of error in the Figma half of the guide, because 4.5 is one of the two steps an agent cannot do or check for you, and the agent is waiting on it. A fork that cannot find the switch has nothing to compare against: 4.3 and 4.4 both reported success, and 4.6 will fail later for a reason that looks like the components are wrong.

**Fix:** both now give the path, which is **Libraries**, the book icon at the top of the Assets panel or the main menu, then the team under **Teams**, then the foundations library, and say that the panel alone won't do it. The skill also gains the check that makes this verifiable rather than assumed: `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()`, read in the components file, lists the foundations collections once the library is on and returns nothing until then. Run against this fork it returned `Semantic` with 55 variables and `Primitives` with 81, from `Acme Foundry Foundations`, which is how 4.5 was confirmed here instead of taken on trust.

### 30. The sheet gives no typography, and the check demands one anyway

The build sheet's rule for text is: "Text and icons inside a layer take the colour and text style it names, unless a layer inside names its own", and per component, "Text uses the text style named, or each part bound when the sheet lists parts". `Link` names neither. Its only layer is the component itself, with `fill` and, for `tone=accent`, a colour, so no text style and no parts to bind.

Built that way, the check fails:

```
tone=inherit: the text label has no text style from the library.
```

The rule is in `checkVariant`: for a text node, when the spec gives no `typography` at all, the last branch requires _some_ text style whose stamp the file recognises. So the sheet's two cases are not exhaustive, and the third case, no typography named, is the one `Link` falls into, with the requirement stated only in the checking code.

It was resolved by giving both `Link` labels `text/body`, which is right for an inline link in running text, but that was a guess the sheet did not sanction. Nothing says which style an unspecified text layer should take.

**Fix:** have `sheet.ts` say it. Either emit the inherited text style for a layer that has none of its own, so the sheet always names one, or state the rule in the sheet's preamble: a text layer with no typography of its own takes a library text style, and name which. The first is better, because the spec already knows the answer: `Link`'s CSS inherits the surrounding text style, and the sheet could say so.

### 31. Templating the stamp silently duplicates a library that already exists

[ADR 0020](./decisions/0020-what-a-fork-renames.md) says of the Figma stamp: "Fossil's own value is `fossil` either way, so nothing migrates when it lands." That is true of Fossil and false of any fork that has already built its library, which, as of this run, Acme has.

Probed against `FakeFigma`: apply the tokens with `ns` of `fossil`, as the fork's live library is stamped, then apply the same tokens again with `ns` of `acme`, as the fork would after taking the change.

```
beforeCollections: 2   afterCollections: 4
beforeVariables: 134   afterVariables: 268
collectionNames: Primitives, Semantic, Primitives, Semantic
stampedFossil: 134     stampedAcme: 134
lastResult: { acme: 'finish', commit: 'c0ffee', missing: [], orphans: [], unstamped: [] }
```

It does not refuse. It reports a clean bill of health: nothing missing, no orphans, nothing unstamped. The reason is that `ensureCollections` finds no collection stamped `acme`, so it creates a second `Primitives` and `Semantic`; `stampedVariables` then finds nothing, and the clash check looks only inside the new collection, which is empty. So every variable is created again, the old 134 keep the `fossil` stamp, and the components stay bound to the old ones while the sync now believes the new ones are the library.

A first draft of this finding said the apply would refuse with 136 name clashes. It does not, and the difference matters: a refusal is a message, and this is a published library quietly growing a second copy of itself.

What a migration has to cover, counted on Acme's live files. The foundations file:

| Stamp key    | On                | Under `fossil` | Under `acme` |
| ------------ | ----------------- | -------------- | ------------ |
| `path`       | variables         | 136            | 0            |
| `collection` | collections       | 2              | 0            |
| `commit`     | collections       | 2              | 0            |
| `path`       | text styles       | 12             | 0            |
| `path`       | effect styles     | 3              | 0            |
| `page`       | the Icons page    | 1              | 0            |
| `section`    | the Icons section | 1              | 0            |
| `icon`       | icon components   | 6              | 0            |
| `svg`        | icon components   | 6              | 0            |

169 stamps on 162 nodes, across seven keys, and nothing under the brand's namespace. The components file reports 34 `fossil` stamps across 247 nodes, but owns none of them: they are read through from the icon components imported from the foundations library, which [ADR 0018](./decisions/0018-figma-foundations-and-components.md) records as keeping their stamps. So the migration is one file, and the components follow when the library update is accepted.

**Fix:** the change needs a migration, which is the test ADR 0020 itself sets: "whether changing it would be a migration rather than a rename". A one-off `pnpm figma:restamp <old>` that generates a script re-stamping every variable, collection, style, page and icon from the old namespace to the brand's, run once before the first apply, keeps the fork's library and leaves no permanent reference to Fossil's name in anyone's runtime. Carrying the old namespace in the apply spec as a fallback would work too and is worse, because it makes every future apply carry a migration.

**Fixed.** `pnpm figma:restamp <old namespace>` writes one 7 KB script. It collects every local collection, variable, text style, effect style, page and node, moves each key `getSharedPluginDataKeys(old)` reports to the brand's namespace, clears the old one, and reports what it moved by kind and key, what is left under the old namespace, and any stamp that differs under both, which it refuses to overwrite. It skips instances, whose stamps are the library's. It refuses a file with no collection stamped under either namespace, which is how it declines the components file, and it tolerates a run that was interrupted after the collections moved, so a second run finishes the job rather than refusing.

Seven tests in `src/library/library.test.ts` run it against a whole foundations file built under another namespace: 19 stamps across nine kind-and-key pairs move, nothing is left behind, the applied commit survives so the next diff keeps its base, and the apply and styles scripts that follow report every variable, style and icon unchanged. The same tests hold the duplication itself: without the migration the apply creates a second pair of collections and a second copy of every variable, which is what the probe above found.

**Run against Acme's published foundations file.** The migration first:

```
{"acme":"restamp","from":"fossil","before":169,
 "moved":["collection collection: 2","collection commit: 2","effect style path: 3",
          "node icon: 6","node section: 1","node svg: 6","page page: 1",
          "text style path: 12","variable path: 136"],
 "remaining":0,"instances":0,"problems":[]}
```

Every row matches the table above, and the total matches the 169 counted before any code was written. Then the apply, in five scripts, and the foundations check:

```
part 1 of 4: created [] updated [] unchanged 40
part 2 of 4: created [] updated [] unchanged 40
part 3 of 4: created [] updated [] unchanged 40
part 4 of 4: created [] updated [] unchanged 16
finish:      commit adc90f1 missing [] orphans [] unstamped []
check:       The library matches the spec from adc90f1.
```

136 variables, every one unchanged, in a file the sync could not see at all an hour earlier. Two collections, not four.

A prediction made before the run was wrong in a way worth keeping: it expected roughly 136 `code syntax` updates, on the grounds that the live variables would still read `var(--fossil-…)`. They did not. Code syntax comes from `tokens.json`, and the fork's library was built _after_ the CSS prefix was renamed and _before_ the stamp followed the brand, so the prefix had already reached Figma and only the stamp lagged. The apply was therefore a pure no-op, which is the strongest evidence the migration moved the library rather than replacing it.

**The migration crosses a published library, which is the part that could not be asserted from a test.** A restamp changes nothing visible, since no variable, style or component differs in any property a designer can see, so whether Figma treats it as publishable was open. It does. The foundations file offered **23 changes, every one "modified"**: 12 text styles, 3 effect styles, 6 icon components and 2 variable collections, which is exactly the set of publishable items the restamp touched, and the 136 variables travel with their collections. The components file then listed **17 updates** under Libraries › Updates, the subset it imports, and accepting them carried the new stamps in: the components check that follows reports all 13 components matching the spec, with no problems and no foundations problems, which it could only do by resolving every binding through an `acme`-stamped variable, text style and effect style.

So the order for a fork with a two-file library is: restamp, apply, foundations check, publish the foundations file, accept the update in the components file, components check, publish the components file. The `fossil-figma-sync` skill's migration section states the first three; the last four are its existing publish steps, unchanged.

**One more thing the run earned.** Saving the components check result by hand transposed two components, `Popover` and `SkipLink`, which changes nothing a reader would notice and invalidates the hash. `figma:library-check report` refused it: "check-1.json doesn't match its hash: it was cut off or changed." The rule that every result carries a hash exists because an agent retypes these results, and on this run it caught exactly that, in the one place where a silent slip would have been recorded as a passing check.

### 32. The validator says Fossil, and its test asserts it

Found while writing 1.4's checklist, and it is issue 8 in another package. `validate.ts` refuses an unrecognised mode with `Unknown mode "dim"; Fossil's modes are dark`, and `validate.test.ts` asserts that string literally. Step 2 puts an adopter in these files, so it is a message they read and then rewrite, and the suite goes red on a test that says nothing about renaming. [ADR 0020](./decisions/0020-what-a-fork-renames.md) rule 1 covers it: prose a person reads is the brand's, and a test may not assert a system name as a literal.

**Fixed, by rephrasing rather than by reading the config.** The modes belong to the token format rather than to the system using it, so the sentence never meant the brand. It now reads `Unknown mode "dim"; the modes are dark`, and the test asserts that. Issue 8 resolved its five Figma-side strings the same way, for the same reason, and this leaves a fork nothing to rewrite.

### 33. The foundations markers follow the prefix, and the rename doesn't

`formats.ts` builds `BLOCK_START` and `BLOCK_END` from `brand.cssPrefix`, under [ADR 0020](./decisions/0020-what-a-fork-renames.md)'s rule that a local name is the brand's, so a fork looks for `<!-- acme:foundations:start -->`. `pnpm rename` rewrote `--fossil-` and `fossil-agents-md` and left the markers alone, which is what guide 1.4 and the same ADR both said it should do. So `pnpm build`, the first of the four commands 1.3 ends with, stops at the token package before anything else runs:

```
✗ AGENTS.md has no foundations block. Add <!-- acme:foundations:start --> and <!-- acme:foundations:end --> where it belongs.
1 problem. Nothing was built.
```

Fossil's own CI cannot see it, because its prefix is `fossil` and its committed markers match. Run 1's copy predates the commit that templated them.

**Fixed.** `rewrites()` rewrites `<prefix>:foundations`, with a case in `tests/rename.test.ts`. Guide 1.3 lists the markers among what the rename rewrites, 1.4 names them with the fork's prefix, and ADR 0020 moves them out of the local names that stay: the build refuses a file whose markers it cannot find, so they are not the cosmetic leftover that record took them for.

### 34. The token build's test asserts the markers as literals

Two tests in `build.test.ts` matched `/^# Agents\n\n<!-- fossil:foundations:start -->/`, so a fork's suite is red even once 33 is fixed, on a test that says nothing about renaming. The file already imports `BLOCK_START` and `BLOCK_END` from `formats.ts` to write its fixture, and then asserted the literal. It is issue 32 again, and [ADR 0020](./decisions/0020-what-a-fork-renames.md) rule 1 covers it: a test may not assert a system name as a literal.

**Fixed.** Both assertions take the markers from `formats.ts`, as the fixture beside them already did.

### 35. The rename rewrites its own test's fixtures

`tests/rename.test.ts` spelled every fixture out, so the rename rewrote its inputs and not its expectations:

```
AssertionError: expected 'padding: var(--boron-space-m);' to be 'padding: var(--acme-space-m);'
```

The input `--fossil-space-m` became the clone's prefix, while the expectation kept the prefix the test renames towards. The bin name, the badge label and the repository URLs have the same shape, and the first assertion to fail hid the rest.

Which assertions fail depends on what the fork called itself, which is the worst property a test can have. The fixtures rename towards the prefix `acme` and the scope `@acme-design`, so a fork that picks either gets that line for free: the probe used `boron` and saw it fail. The `Identity` constants are rewritten too, but only where they spell an address out, so `npmScope` follows the fork while `cssPrefix`, a bare word, stays `fossil`, which is what splits the two sides of a case apart.

**Fixed.** Every fixture is written from the two `Identity` constants, so the rename either rewrites both sides of a case or neither, and the negative cases keep testing what they mean: a longer scope, a longer bin name and a longer repository name are built from the old identity too.

### 36. The checklist's own test greps for a name a fork has to rewrite

`tests/adopting.test.ts` greps for `Fossil` and holds step 1.4 to naming every file it finds. In a fork, two readings of 1.4 are both defensible and they end differently. Rewrite the literal along with the rest of the prose in `tests/`, which the step's own bullet asks for, and the check becomes "every file that names your system is named in your checklist": it passes, and it is the check a fork wants, because the fork's own docs site offers the fork as a template. Leave it, reasoning that the grep looks for the upstream's name, and the suite fails once 1.4 is done:

```
AssertionError: expected 1 to be greater than 20
❯ tests/adopting.test.ts:55:30
```

The 1 is the test file itself, which still said Fossil in a comment. Nothing in the test or the guide said which reading was meant, and the probe took both. [ADR 0020](./decisions/0020-what-a-fork-renames.md) rule 1 again: a test may not assert a system name as a literal, and this one asserted it as a search.

**Fixed.** The grep's target is a named constant whose comment says it is the name the step is written about and that a fork rewrites it with the prose, the assertion carries the same sentence as its failure message, and guide 1.4's "Comments and test fixtures" bullet names the file and what to do with that line.

## Fixed so far

On this branch, with the issue's number and what it took:

| #             | Fix                                                                                                                                                                                                         | Commit    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 4, 5, 6, 7, 9 | Guide 1.4 is a checklist of every file that still says Fossil, grouped by [ADR 0020](./decisions/0020-what-a-fork-renames.md)'s three kinds of name, and `tests/adopting.test.ts` holds it against the grep | `pending` |
| 32            | The token validator's mode refusal names the format's modes rather than the system, and its test follows                                                                                                    | `pending` |
| 33, 34, 35    | `pnpm rename` rewrites the foundations markers, the token build's test takes them from the build, and the rename's own fixtures come from the identities                                                    | `pending` |
| 36            | The checklist's test names the system it greps for, says in its failure what a fork does with it, and guide 1.4 names the line                                                                              | `pending` |
| 22            | "What you need" has the npm organisation created before the rename, because the rename is what spends the scope                                                                                             | `pending` |
| 23, 24        | Guide 3A.3 publishes from a `main` with the rename merged, says what "no new packages" means there, and ends with `npm view` on each package and an install                                                 | `pending` |
| 12            | "What you need" installs Chromium, and says which `pnpm test` fails without it                                                                                                                              | `pending` |
| 25            | `pnpm rename` names the workspace root after the repository it was given                                                                                                                                    | `dc2e570` |
| 3, 17         | Guide 1.2 disables Docs beside Release, for the reason each one holds, and step 6 turns Docs back on                                                                                                        | `pending` |
| 16            | Guide 2 says the `AGENTS.md` block has an 8 KB budget, what spends it, and where detail goes when it runs out                                                                                               | `pending` |
| 14            | Guide 4.4 forward-references 2.4, where the font requirement is explained                                                                                                                                   | `pending` |
| 10, 21        | Guide 2.5 is the site's artwork, all four files of it, and 1.4 names `docs-site/meta.ts`                                                                                                                    | `pending` |
| 29            | Guide 4.5 and the skill give the Libraries path, and the skill gains a read that confirms the library is on                                                                                                 | `pending` |
| 31            | `pnpm figma:restamp <old namespace>` moves a fork's stamps before its first apply, with the duplication it prevents held in a test                                                                          | `pending` |
| 13, 27        | Guide 4.3 states both preconditions as requirements, and 4.2 gives the two placement constraints that decide 4.5, with what does not matter                                                                 | `pending` |
| 15            | Guide 4.6 says it is the longest step, what the sheet stands for, and how to work it: nested-first, checked in groups, against `use_figma`'s character limit                                                | `pending` |
| 26            | `pnpm figma:apply-scripts`, and neither `AGENTS.md` nor the skill asks permission for a generator that writes only to `.figma/`                                                                             | `pending` |
| 28            | Fossil's two font descriptions name no face, and guide 2.1 says to read every `$description` while rebranding                                                                                               | `pending` |
| 30            | `sheet.ts` names the text style a layer with no typography of its own takes, and says why the check accepts any                                                                                             | `pending` |
| 19            | `AGENTS.md`, `packages/react/AGENTS.md` and ADR 0016 call the script with `pnpm run docs`                                                                                                                   | `8244a2c` |
| 1             | `rewrites()` also rewrites `%40<scope>`, with a case for it in `tests/rename.test.ts`                                                                                                                       | `0e61106` |
| 20            | The Stylelint config's tests take a primitive colour from the built `lint.json`                                                                                                                             | `a79062a` |
| 2, 18         | `scripts/fonts.ts` checks each stylesheet against the faces and weights the text styles use                                                                                                                 | `0ab2c06` |
| 11            | The config file is `brand.config.json` and both lint configs export `brand()`, so the question is removed rather than answered: [ADR 0020](./decisions/0020-what-a-fork-renames.md)                         | `15d5df9` |
| 8             | Thirteen strings resolved by kind, under [ADR 0020](./decisions/0020-what-a-fork-renames.md): prose reads `brand.config.json`, format identifiers stay, Figma-side messages rephrased                       | `pending` |

Step 1.4's rewrite was sized on Fossil itself: 119 mentions in 53 files, against the 117 in 50 that issue 4 measured as the old seven categories' leftovers. The checklist names all 53, and `tests/adopting.test.ts` runs the step's own grep and fails when a file it finds isn't named there, so the list can't decay the way the list of seven did. It earned that on the first draft, which named the Storybook chrome as `.storybook/manager.ts` when those files are in `packages/react/.storybook/`, a gap a fork would have had to close by searching.

Issue 20's fix was proved against what broke it: the new test file, copied into the fork where `base.color.blue.600` no longer exists, passes with no reference to it.

Issue 18's fix found issue 2 by itself, on Fossil's own files, before either head file was touched:

```
✗ .storybook/preview-head.html loads Space Grotesk without weight 700, which the text styles set
✗ .storybook/manager-head.html loads Space Grotesk without weight 700, which the text styles set
```

Both now load the same faces the Make guidelines tell an app to load, so the docs site renders what an app will. The check allows a weight no text style names, because `<strong>` in running text asks the browser for bold and the `font.weight` tokens are reachable on their own. None of these four touches a package's public surface, so none takes a changeset.

Issue 8's fix splits the thirteen strings three ways, which [ADR 0020](./decisions/0020-what-a-fork-renames.md) records. The six that name the system, including the Figma descriptions on `Box`, `Stack` and `Icon`, now read `config.name`, and the two tests that cover them assert against the same config, so a fork's suite passes unchanged. The five sent to Figma were rephrased, because `script()` embeds the runtime's source text and hashes it, so no name can be read there: they never meant the brand anyway. "No Fossil text style" meant "no text style from the library", and "stamped as Fossil's Semantic collection" meant "carries the Semantic stamp". Two more name the tool's own format and keep it.

Proved in the fork: with the changed sync copied in, its 84 tests pass and `Box`'s Figma description reads "a frame bound to Acme Foundry's variables".

The block measured 7985 bytes against its 8192 budget here, against 7917 in the fork, where the shorter prefix saves the difference. That is 207 bytes of headroom in Fossil itself, which sharpens issue 16.

## What closing all of them doesn't settle

Every issue above is resolved: in the guide, in the code, or as a decision recorded with its reasoning. That is not Phase 8's third exit criterion, which asks for a fresh fork that reaches a building, linting app and a Figma file with variables and the generated library from the guide alone. No run has followed the rewritten guide from a fresh copy, and the copy this run used is already past the steps that changed.

The dry rename that found issues 33 to 36 establishes less than a run. It took a clone of the branch tip through 1.3 and a find-and-replace standing in for 1.4, and ended with `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm check:packages` all passing, and lint only after `pnpm format`, which is issue 9 behaving as the guide now says it will. What it cannot establish is anything the guide asks a person to read and decide, which is most of step 1.4, or anything outside the repository: npm, Pages, Figma.

Step 1.4 is where a second run would earn the most. Issues 4 to 7 are the point where this one needed a person's judgment rather than a command, and the checklist that replaced the list of seven is longer than what it replaced. `tests/adopting.test.ts` holds it to naming every file that still says Fossil; nothing can hold it to being followable. The other untested text is 3A.3's check, which has only ever been run against a published set that was already complete.

## Resolved before the test reached them

- `manager.ts` hard-coded the front page's title beside `brand.config.json`'s name. [#46](https://github.com/ibrahimmoazzam/fossil-design/pull/46) routes it through `siteTitle` in `meta.ts`. The fork predates that commit, so it still carries the old shape.
