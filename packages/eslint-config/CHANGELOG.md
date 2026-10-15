# @fossil-design/eslint-config

## 0.2.0

### Minor Changes

- 15d5df9: Rename the `fossil()` factory to `brand()`, with its options type `BrandOptions`. A config that calls `fossil({ … })` calls `brand({ … })` instead; the default export is unchanged. The factory is a name in an adopting app's own `eslint.config.js`, and nothing about it is Fossil's to claim, as [ADR 0020](https://github.com/ibrahimmoazzam/fossil-design/blob/main/docs/decisions/0020-what-a-fork-renames.md) sets out. The same reasoning renames `fossil.config.json` to `brand.config.json`, which no published package reads.
- 7091d73: Name the ESLint config's blocks after the system's CSS prefix, so a fork's lint output reads `acme/layout` rather than another system's name. A config that overrides a block by name, such as `fossil/layout`, names its own system's prefix instead. The prefix is generated into the package at build time, because a published package can't read `brand.config.json`. Both configs' descriptions no longer name Fossil, since they describe whichever system builds them.

## 0.1.0

### Minor Changes

- 32b9e36: The first working config. `fossil()` bans raw JSX elements that `Box` renders, such as `<div>` and `<nav>`, in favour of `<Box as="…">`, and requires a reason after `--` on every disable comment. Options set the layout rule's severity, its files, and opt in to `@typescript-eslint/no-deprecated`. `layoutElementRestrictions` lets a config that sets its own `no-restricted-syntax` keep Fossil's entries.

## 0.0.2

### Patch Changes

- 57232c2: First release through the trusted-publishing workflow, with npm provenance. The package contents are unchanged.
