# @fossil-design/tokens

## 0.2.0

### Minor Changes

- 32d3c6c: Colour tokens declare what they must stand out against and the WCAG ratio they need, under `contrast` in `tokens.json`. The AGENTS.md foundations table shows each ratio in light and dark, and descriptions no longer state ratios that a value change would make wrong. `tokens.json` now gives a token that aliases another semantic token its target's dark value: `color.border.selected` and `color.focus.ring` were listed with their light colour in dark mode.
- dddd654: Adds `border.width.default` and `border.width.hairline`, semantic stroke widths. The border composites now reference them, and Figma offers them for stroke weight. `border.focus` takes its width from `focus.ring.width`, so a focus ring and a focus outline stay the same thickness.

## 0.1.1

### Patch Changes

- 7abd7e1: `tokens.css` and `tokens.json` list tokens in the order their files do. Numbered names such as `space.025` no longer move after `space.1000`.

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
