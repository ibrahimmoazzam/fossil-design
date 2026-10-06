# @fossil-design/tokens

## 0.6.0

### Minor Changes

- 5f97206: The build also writes `dist/foundations-brief.md`: the spacing, breakpoints, text styles and colours in about half the space of `foundations.md`, for an `AGENTS.md` block that's always in an agent's context.

## 0.5.0

### Minor Changes

- e3b8678: The build also writes `dist/foundations.md`, the same spacing, breakpoint, type and colour tables as the `AGENTS.md` foundations block, and `dist/tokens.md`, every semantic token with its values in light and dark and each deprecated token with its replacement. The foundations gain a breakpoints table.

## 0.4.1

### Patch Changes

- 59a565c: The heading text styles, `text.heading.xs` to `text.heading.xl`, are now set at weight 700 instead of 600. Figma's copy of Space Grotesk has no SemiBold, so at 600 the headings in code and in Figma's text styles couldn't match.

## 0.4.0

### Minor Changes

- b764993: Every primitive token now sits under a `base` group, so its name says it isn't for direct use: `color.gray.600` is `base.color.gray.600`, and `--fossil-color-gray-600` is `--fossil-base-color-gray-600`. If your site tokens alias a primitive, switch to the new name. One semantic token is renamed for the same reason: `motion.duration.base` is now `motion.duration.default`. The old name still works, deprecated, and the Stylelint config names its replacement. The build now fails on a primitive outside `base`, or a semantic token inside it.

## 0.3.0

### Minor Changes

- 7d974b6: Two semantic tokens for controls laid over images and video, the same in both modes: `color.background.veil` and `color.text.on-veil`. The contrast check now measures text on a translucent background at its worst, over white and over black, so `on-veil` is checked at 5.74:1.

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
