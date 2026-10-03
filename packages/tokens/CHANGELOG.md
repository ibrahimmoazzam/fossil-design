# @fossil-design/tokens

## 0.1.0

### Minor Changes

- e59e46d: The first working release, built from the reference brand's 152 tokens.

  - `@fossil-design/tokens/tokens.css` declares every token as a `--fossil-*` custom property. Semantic tokens alias primitives through `var()`, text styles are split into five properties, and dark values follow the system or a `data-theme` attribute.
  - `@fossil-design/tokens/tokens.json` describes each token: its custom property, resolved value, alias, dark value, description and deprecation.
  - `@fossil-design/tokens/lint.json` lists the primitive and deprecated custom properties, for the Stylelint config.
  - The package exports `tokenKeys`, `breakpoints` and `mediaQueries`, with the types `TokenKey`, `TokenGroup`, `Breakpoint`, `TokensFile` and `LintLists`. The JSON imports come typed, and the stylesheet import type-checks under TypeScript 6.

## 0.0.2

### Patch Changes

- 57232c2: First release through the trusted-publishing workflow, with npm provenance. The package contents are unchanged.
