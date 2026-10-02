# 0001. One monorepo with pnpm workspaces

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Fossil has five packages: the tokens, the React components, an ESLint config, a Stylelint config and the private Figma sync. One token build feeds all of them. The CSS, the lint lists, `Box`'s generated styles and the Figma variables all come from the same run, so renaming a token touches every package.

Teams adopt Fossil by copying the repository as a template and replacing the token values with their own brand. The portfolio site, Fossil's first consumer, lives in its own repository and installs the packages from npm.

Established systems split both ways ([`Learnings.md`](../Learnings.md), section 3.11). Carbon, Fluent UI and Atlassian keep tokens and components in one monorepo. Primer and Spectrum split across repositories, because their tokens feed several implementations: React and CSS for Primer, React, CSS and web components for Spectrum.

## Options

1. **A repository per package,** like Primer and Spectrum.
2. **One monorepo for the five packages,** like Carbon, Fluent UI and Atlassian.
3. **One monorepo that also contains the portfolio site.**

## Decision

Option 2, with pnpm workspaces.

- Fossil is React only, so there is no implementation-neutral token repository to keep apart.
- A token change and everything it affects land in one pull request, checked by one CI run.
- GitHub's "Use this template" copies one repository. `fossil.config.json` renames the system in one place only if there is one place.

Option 3 is rejected. Workspace symlinks would hide the bugs that a published package exposes: a wrong `exports` map, declarations that don't resolve for a consumer, build output that only runs under Fossil's own bundler config ([`PRD.md`](../PRD.md), section 2, "Distribution").

pnpm, rather than npm or Yarn workspaces, because:

- its strict `node_modules` stops a package from importing a dependency it hasn't declared;
- catalogs give every package the same TypeScript version from one line;
- since pnpm 11, `pnpm publish` supports npm trusted publishing on its own.

## Consequences

- Package names in `package.json` can't read `fossil.config.json`. A fork renames them by hand, and `tests/workspace.test.ts` fails with the exact names to change.
- CI installs once and builds the packages in dependency order.
- Dependabot can't read the lockfile format that pnpm 11 and later write ([dependabot-core#14919](https://github.com/dependabot/dependabot-core/issues/14919)), which constrains the choice of dependency-update bot.
