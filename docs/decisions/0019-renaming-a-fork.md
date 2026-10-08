# 0019. Renaming a fork

- **Status:** Accepted
- **Date:** 2026-10-08
- **Supersedes:** the consequence in [0001](./0001-monorepo.md) that a fork renames its packages by hand

## Context

A team adopts Fossil by copying the repository and renaming it ([`PRD.md`](../PRD.md), Phase 8, task 2). `fossil.config.json` holds the system name, CSS prefix and npm scope. The token build, the class names and the generated docs read it. Much else spells the values out and can't read it:

- package names and the dependencies between packages ([0001](./0001-monorepo.md));
- imports of `@fossil-design/*`, in the packages, the lint configs, the smoke-test apps and the root configs;
- `var(--fossil-…)` in every component stylesheet;
- the repository URL in each `package.json`, which npm's trusted publishing checks and the gap form's link comes from.

A dry run on 8 October 2026 renamed a copy to Acme Design (`acme`, `@acme-design`, `acme/acme-design`). Replacing the scope, the custom property prefix and the bin's name across 79 files, then running `pnpm install` and Prettier, gave a copy that built and linted. 15 tests still failed: some set the prefix `fossil` themselves, and one expected the `AGENTS.md` block's markers under Fossil's scope.

## Options

1. **By hand, with the workspace test listing the package names to change.** About 80 files, and the test only catches package names.
2. **Find-and-replace commands in the adoption guide.** No new code, but every fork has to run shell commands correctly, and nothing notices when the commands go stale.
3. **Keep the CSS prefix fixed,** and rename only the scope. Fewer files, but a fork's CSS names another system, and `cssPrefix` would be a setting that can't change.
4. **A script that renames everything, with tests.**

## Decision

Option 4. `pnpm rename --name "Acme Design" --prefix acme --scope @acme-design --repo acme/acme-design` (`scripts/rename.ts`):

- reads the old values from `fossil.config.json` and the repository URL in the root `package.json`;
- refuses to run with uncommitted changes, so the rename is a diff of its own;
- rewrites tracked text files: the scope where it stands alone, the `AGENTS.md` block's markers named after it, every `--fossil-` custom property, the `fossil-agents-md` bin, and the repository's `owner/name`;
- leaves `docs/`, the changelogs and the lockfile alone, because they record Fossil's history or are regenerated;
- writes the new values to `fossil.config.json`, runs `pnpm install` to update the lockfile, and formats the files it changed.

Each rewrite matches only where the old value stands alone, so `@fossil-designer` or `--fossilized-` stays as it is. Any option left out keeps its old value.

Three changes make the rest of the repository rename cleanly:

- The token build's tests take the name and prefix from `fossil.config.json`, and the smoke test checks class names under the configured prefix.
- The root Stylelint config's ignores move to `.stylelintignore`. Stylelint lints each file with the nearest config, so a root config's `ignoreFiles` doesn't reach an app in `apps/` that has a config of its own.
- The docs site's name, tab titles and Getting Started page read `fossil.config.json`, so a fork's site names its own system and packages.

Some names stay: the `fossil.config.json` file, the `fossil()` factory in both lint configs, the `fossil-figma-sync` skill, the `fossil` namespace the Figma sync stamps, the token build's `fossil:foundations` markers, and the `com.ibrahimmoazzam.fossil` vendor key ([0005](./0005-token-taxonomy.md)). They name Fossil's tooling and formats, not a brand.

## Consequences

- In the dry run, the renamed copy passed `pnpm build`, `pnpm lint`, `pnpm typecheck`, all 383 tests, `pnpm check:packages` and `pnpm smoke`. A build after the rename changed no committed file, and `pnpm install --frozen-lockfile` passed, so CI accepts the rename's pull request as it is.
- Prose that names Fossil, such as READMEs, the front page and a few prop descriptions, isn't rewritten. Replacing a word in prose can't tell a description of the system from a credit to Fossil, so the adoption guide lists those files with one `git grep`.
- A new file that spells out the scope, the prefix or the repository is covered by the rename with no change. A new spelling of them that isn't one of these, such as a class name's `fossil-` prefix, has to read `fossil.config.json` instead.
- `tests/rename.test.ts` covers each rewrite and the near-misses it must leave. No test renames the whole repository, which takes minutes. A change to the build or to the tests that spells out a name should run a rename on a scratch copy, as the dry run did.
