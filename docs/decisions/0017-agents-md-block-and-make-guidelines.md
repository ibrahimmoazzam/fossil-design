# 0017. The AGENTS.md block and the Make guidelines

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

[0016](./0016-bundled-agent-docs.md) put version-matched docs inside `@fossil-design/react`. Docs an agent never opens don't help, so Phase 6 also needs an always-on pointer in each place an agent starts: an app's `AGENTS.md`, and a Figma Make file's `guidelines/` ([`PRD.md`](../PRD.md), Phase 6, tasks 3, 5 and 7).

Checked in October 2026:

- **Next.js 16.3** writes its block between `<!-- BEGIN:nextjs-agent-rules -->` and `<!-- END:nextjs-agent-rules -->`, keeps everything outside the markers, and adds `@AGENTS.md` to `CLAUDE.md` ([guide](https://nextjs.org/docs/app/guides/ai-agents)). Vercel's evals scored an always-on index at 100%, against 53–79% for skills, after compressing it from 40 KB to 8 KB with no loss.
- **Figma Make** reads `guidelines/Guidelines.md` first, and other files only where it points; Figma recommends several short files that route to each other ([guidelines](https://help.figma.com/hc/articles/43602393097239)). In a test on 6 October, Make's agent read files under `node_modules` and quoted Fossil's docs exactly. Given a pointer in `Guidelines.md` and a prompt that never mentioned Fossil, it read `Guidelines.md`, `foundations.md`, `index.md` and each component's doc, and built on-system except for one Tailwind class string: its scaffold's own `AGENTS.md` tells it to use Tailwind.
- **Fonts in Make:** the scaffold's `AGENTS.md` says font wiring goes in `src/index.css`, `@import` first. Tailwind's docs say a font service's `@import url(…)` must sit above `@import "tailwindcss"`, because browsers ignore an `@import` after any other rule ([font-family](https://tailwindcss.com/docs/font-family)). Figma's kit docs say nothing about fonts, but recommend a complete code snippet wherever ordering or syntax could be ambiguous ([kits](https://help.figma.com/hc/articles/39241689698839)).

## Options

1. **What the block holds.**
   - One line pointing at the docs, as Next.js 16.3 now does. The rules stay one file away, and Fossil's argument is that foundations must be always-on ([`Learnings.md`](../Learnings.md), 3.7).
   - The full foundations tables, about 14 KB with the rules and the index.
   - **The rules, the tokens in brief and the component list,** under a budget of 8 KB that the build enforces.
2. **Who writes the token part.**
   - The component package, from `tokens.json`. A second renderer of the foundations.
   - **The token build, as `foundations-brief.md`,** beside `foundations.md`, as 0016 chose for the other token docs.
3. **How the bin gets the block.**
   - It renders the block from `docs/` when it runs. Then a block that outgrows its budget is found in an app, not in Fossil's CI.
   - **The build writes `docs/agents-block.md`,** and the bin copies it in.
4. **What the Make guidelines hold.**
   - Copies of the token and component docs inside `guidelines/`, as the PRD first listed. Every doc ships twice, and Make sees two copies of each.
   - **`Guidelines.md` and `setup.md` only,** routing into `docs/` by full path, the path Make already followed in the test.
5. **Fonts in the Make setup.**
   - A `<link>` in `index.html`. Works, but Make's scaffold puts font wiring in `src/index.css`.
   - A `fonts.css` in the package that imports Google Fonts. Every app would fetch the reference brand's fonts, including a fork that replaces them.
   - **A complete `@import url(…)` snippet in `setup.md`, first in `src/index.css`,** with the build checking that it names every font the text styles use.

## Decision

The package's build writes two more things from the same sources as `docs/`:

| File                       | Holds                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/agents-block.md`     | Where the docs are, the rules from `docs-src/rules.md`, the token build's `foundations-brief.md`, and the components by group, between markers |
| `guidelines/Guidelines.md` | For Make: the order to read in, routing into `docs/` by full path, and where the project's Tailwind scaffold must be ignored                   |
| `guidelines/setup.md`      | For Make: the package, the stylesheet and fonts as one snippet, the page's ground, light and dark                                              |

The hand-written sources are `docs-src/agents.md`, `docs-src/guidelines/` and `docs-src/rules.md`. The Figma section moves from `rules.md` to `docs-src/figma.md`, so `foundations.md` keeps it and the block doesn't. Placeholders fill in the system name, prefix, scope, package, version, the installed paths, the tablet breakpoint and the font names.

The build fails, writing nothing, if the block is over 8 KB, or if `setup.md` doesn't name a font family a semantic `font.family` token uses.

`fossil-agents-md`, the package's bin, copies the block into the `AGENTS.md` of the folder it runs in: between its markers if they're there, at the end otherwise, or into a new file. It adds `@AGENTS.md` to `CLAUDE.md` when one exists and doesn't import it. Run again, it replaces only the block. `--check` writes nothing and exits 1 if either file is out of date, so an app's CI can catch an upgrade that skipped it. The markers are `<!-- BEGIN:fossil-design-agent-rules -->` and its `END`, named after the npm scope as Next.js names its own; a fork's markers follow its scope, and a workspace test keeps the bin named after its CSS prefix.

A Make file without a kit installs the package from npm, and its own `guidelines/Guidelines.md` is one line:

```md
Read node_modules/@fossil-design/react/guidelines/Guidelines.md before writing any code, and follow it.
```

A kit's guidelines are the same line. Both get the guidelines that match the installed version.

The rules gain two points: no utility classes from Tailwind or any other framework, and how to make grid columns change per breakpoint, by fitting them with `auto-fill` in `style`, or with a class and a `min-width` query. Make's Tailwind classes were the one off-system line in the test, and need no new code: the gap closes as a pattern.

## Consequences

- The block is about 8 KB and always in an app agent's context. A new component adds a few bytes; a new token, about 100. When the budget fails, move detail into `foundations.md`, which the block points to.
- The rules in `rules.md` reach `foundations.md`, every app's `AGENTS.md` and Make through one file, so they're written for all three.
- The smoke test runs the bin from the packed tarball in both apps, checks `--check` passes after it, and checks that every installed path the block and `Guidelines.md` name exists.
- The bin is compiled by `tsc` into `dist/bin/`, since Node won't strip types from a file under `node_modules`.
- The font snippet assumes Google Fonts. A fork with other fonts rewrites that step in `docs-src/guidelines/setup.md`; the build's check then needs only its family names.
- The guidelines can't make Make's scaffold drop Tailwind, only tell its agent not to use it. Whether that holds is the exit criterion's no-kit test, after release.
