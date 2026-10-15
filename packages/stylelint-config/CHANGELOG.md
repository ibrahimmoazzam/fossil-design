# @fossil-design/stylelint-config

## 0.2.0

### Minor Changes

- 15d5df9: Rename the `fossil()` factory to `brand()`, with its options type `BrandOptions`. A config that calls `fossil({ … })` calls `brand({ … })` instead; the default export is unchanged. The factory is a name in an adopting app's own `eslint.config.js`, and nothing about it is Fossil's to claim, as [ADR 0020](https://github.com/ibrahimmoazzam/fossil-design/blob/main/docs/decisions/0020-what-a-fork-renames.md) sets out. The same reasoning renames `fossil.config.json` to `brand.config.json`, which no published package reads.

### Patch Changes

- 7091d73: Name the ESLint config's blocks after the system's CSS prefix, so a fork's lint output reads `acme/layout` rather than another system's name. A config that overrides a block by name, such as `fossil/layout`, names its own system's prefix instead. The prefix is generated into the package at build time, because a published package can't read `brand.config.json`. Both configs' descriptions no longer name Fossil, since they describe whichever system builds them.
- Updated dependencies [7006478]
  - @fossil-design/tokens@0.6.2

## 0.1.4

### Patch Changes

- Updated dependencies [5f97206]
  - @fossil-design/tokens@0.6.0

## 0.1.3

### Patch Changes

- Updated dependencies [e3b8678]
  - @fossil-design/tokens@0.5.0

## 0.1.2

### Patch Changes

- Updated dependencies [b764993]
  - @fossil-design/tokens@0.4.0

## 0.1.1

### Patch Changes

- Updated dependencies [7d974b6]
  - @fossil-design/tokens@0.3.0

## 0.1.0

### Minor Changes

- 8e2d844: First working config. Stylesheets must use custom properties for colour, spacing, radius, type and duration; may not use primitive or deprecated tokens, or a raw colour anywhere; may only set margins to `0`; and every disable comment needs a reason. `fossil({ siteTokens })` adds an app's own token files, which alone may alias primitives and hold raw values.

## 0.0.2

### Patch Changes

- 57232c2: First release through the trusted-publishing workflow, with npm provenance. The package contents are unchanged.
