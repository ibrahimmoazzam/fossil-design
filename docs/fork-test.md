# The fresh-fork test

Phase 8's third exit criterion: a fresh fork, following only [the adoption guide](./adopting.md), reaches a building, linting app and a Figma file with variables and the generated library. This file records the run: every issue it found, and how each one is resolved.

The guide is the only part of Fossil with no check behind it. The token build validates, Stylelint rejects a raw value, `pnpm smoke` installs the tarballs into real apps, and the library check diffs Figma against the code. Nothing reads the guide and does what it says. This test does, once, and writes down what it cost.

## The run

|         |                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------- |
| Copy    | [ibrahimmoazzam/acme-design](https://github.com/ibrahimmoazzam/acme-design), public, from the template    |
| Created | 2026-10-12, from `5305359`, so it predates [#46](https://github.com/ibrahimmoazzam/fossil-design/pull/46) |
| Brand   | Acme Foundry, prefix `acme`, scope `@acme-foundry`                                                        |
| Route   | 3A, publishing under its own scope                                                                        |

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

| #   | Where                    | Issue                                                                                   | Status        | Goes to        |
| --- | ------------------------ | --------------------------------------------------------------------------------------- | ------------- | -------------- |
| 1   | `scripts/rename.ts`      | The npm badge spells the scope percent-encoded, so the rename misses it                 | Confirmed     | Code           |
| 2   | `.storybook/*-head.html` | The docs site loads Space Grotesk without weight 700, and hard-codes all three families | Confirmed     | Code           |
| 3   | Guide 1.2 and 6          | The Docs workflow fails on `main` until Pages is configured                             | Confirmed     | Guide          |
| 4   | Guide 1.4                | Its seven categories leave 117 mentions of Fossil in 50 files                           | Confirmed     | Guide          |
| 5   | Guide 1.4                | Its `git grep` cannot see prose that describes Fossil without naming it                 | Confirmed     | Guide          |
| 6   | Guide 1.4                | The rename turns Fossil's claims into plausible false ones                              | Confirmed     | Guide          |
| 7   | Guide 1.4                | A plain find-and-replace breaks grammar                                                 | Confirmed     | Guide          |
| 8   | Guide 1.4                | Rewriting the sync's messages fails a test that asserts one                             | Proven        | Guide and code |
| 9   | Guide 1.4                | It must end with `pnpm format`                                                          | Confirmed     | Guide          |
| 10  | Guide 1.4                | It doesn't name `docs-site/meta.ts` or `og-image.png`                                   | By inspection | Guide          |
| 11  | Guide 1.4                | It doesn't say which exported names stay                                                | Confirmed     | Guide, fixed   |
| 12  | Guide "What you need"    | `playwright install chromium` appears only in `AGENTS.md`                               | By inspection | Guide          |
| 13  | Guide 4.3                | It omits `pnpm build`, and that apply refuses an uncommitted token tree                 | By inspection | Guide          |
| 14  | Guide 4.4                | The font requirement is explained in 2.4 and fails here                                 | By inspection | Guide          |
| 15  | Guide 4.6                | One sentence stands for the longest step in the guide                                   | By inspection | Guide          |
| 16  | Guide 2                  | The 8 KB `AGENTS.md` block budget is never mentioned                                    | Confirmed     | Guide          |
| 17  | Guide 1.2                | Its reason for disabling Release doesn't hold when no changeset is pending              | Confirmed     | Guide          |

| 18 | `packages/react/scripts/docs.ts` | The Make guidelines' font check can never fail | Confirmed | Code |
| 19 | `AGENTS.md` | `pnpm --filter react docs` runs pnpm's own `docs` command, not the script | Confirmed | Docs |
| 20 | `packages/stylelint-config/test/config.test.ts` | The guide's own worked example in 2.1 turns the suite red | Confirmed | Code and guide |
| 21 | Guide 2.5 | It calls `public/` the site's icons, and a fork has no artwork of its own | Confirmed | Guide |
| 22 | Guide "What you need" | It doesn't say the npm organisation has to exist before the rename writes the scope into 79 files | Confirmed | Guide |

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

"Let it build and check the components" stands for building every component nested-first, naming each layer exactly, binding every fill, padding, gap and radius to an imported variable, importing styles and icons by key, adding the component properties, then looping on the check until it passes. That was most of Phase 5b.

**Fix:** say what it involves and that it is the longest step, so an adopter plans for it.

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

## Fixed so far

On this branch, with the issue's number and what it took:

| #     | Fix                                                                                                                                                                                   | Commit    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| 19    | `AGENTS.md`, `packages/react/AGENTS.md` and ADR 0016 call the script with `pnpm run docs`                                                                                             | `8244a2c` |
| 1     | `rewrites()` also rewrites `%40<scope>`, with a case for it in `tests/rename.test.ts`                                                                                                 | `0e61106` |
| 20    | The Stylelint config's tests take a primitive colour from the built `lint.json`                                                                                                       | `a79062a` |
| 2, 18 | `scripts/fonts.ts` checks each stylesheet against the faces and weights the text styles use                                                                                           | `0ab2c06` |
| 11    | The config file is `brand.config.json` and both lint configs export `brand()`, so the question is removed rather than answered: [ADR 0020](./decisions/0020-what-a-fork-renames.md)   | `15d5df9` |
| 8     | Thirteen strings resolved by kind, under [ADR 0020](./decisions/0020-what-a-fork-renames.md): prose reads `brand.config.json`, format identifiers stay, Figma-side messages rephrased | `pending` |

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

## Resolved before the test reached them

- `manager.ts` hard-coded the front page's title beside `brand.config.json`'s name. [#46](https://github.com/ibrahimmoazzam/fossil-design/pull/46) routes it through `siteTitle` in `meta.ts`. The fork predates that commit, so it still carries the old shape.
