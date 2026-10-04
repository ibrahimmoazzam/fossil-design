# 0005. Token taxonomy, modes and validation

- **Status:** Accepted
- **Date:** 2026-10-02

## Context

Phase 1 harvests Fossil's tokens from the portfolio. Its CSS holds 106 custom properties and 958 literal values across 66 files. Every value got one of three outcomes: a Fossil token, a site token or a literal that stays in its component. That record lives in the portfolio repository, in `docs/fossil-inventory/`, because the Phase 8 migration runs there and the repository is private.

Four constraints shaped the taxonomy:

- **DTCG 2025.10** takes a colour as an object (`colorSpace`, `components`, optional `alpha`, and a 6-digit `hex` fallback); a hex string isn't valid. Dimensions take only `px` and `rem`. Typography needs all five parts, and DTCG also defines `border` and `shadow` composites.
- **DTCG has no modes in its format.** Theming lives in its separate Resolver module, which Style Dictionary 5.5.5 doesn't read.
- **Style Dictionary 5.5.5** reads DTCG colour objects natively and ships a `border/css/shorthand` transform, so neither needs Fossil code in Phase 2.
- **The portfolio uses every spacing step for both padding and gap.** Carbon applies one spacing scale to margin, padding and gap, and Atlassian uses one `space.*` set everywhere.

## Options

1. **Where dark values live.**
   - A file per mode, as DTCG's Resolver module describes. A token's light and dark values then sit in different files and different diffs.
   - **An extension on each semantic token.** Both values sit together, and a reviewer sees a contrast change in one place.
2. **Spacing.**
   - Separate inset and gap scales. That doubles the tokens with no difference in the portfolio's usage.
   - **One semantic scale.**
3. **Primitive space names.**
   - Multiples of 4px (`space.4` is 16px). This has no name for 2px.
   - Pixel values. These assume a 16px root, while the values are in `rem`.
   - **A percentage of an 8px base (`space.100` is 8px, `space.025` is 2px),** Atlassian's convention.

## Decision

**Two tiers, decided by folder.** Token files live in `packages/tokens/src/primitive/` and `src/semantic/`, named `*.tokens.json`. A path exists once, in one tier.

- A primitive holds a raw value and contains no reference.
- A semantic token is a reference to another token, primitive or semantic. A semantic composite (typography, shadow, border) has a reference in every part. Every semantic token has a `$description`.
- Components use semantic tokens only. An app's site tokens may also use primitives.

**Naming.**

- Primitives describe values. Space uses the 8px percentage (`space.025` to `space.1000`), font sizes are numbered steps (`font.size.1` to `font.size.11`), and colours are hue and step (`color.gray.600`). A translucent colour names its base and alpha (`color.alpha.black-400-22`).
- Semantic tokens describe intent: `color.text.muted`, `radius.control`, `shadow.floating`. Scales that have no intent beyond size use the same t-shirt sizes everywhere: `space.2xs` to `space.3xl`, and `text.heading.xs` to `text.heading.xl`.

**Modes.** A semantic token's dark value is an alias under `$extensions["com.ibrahimmoazzam.fossil"].modes.dark`. Only semantic tokens vary by mode, and `dark` is the only mode. The key follows DTCG's advice to use reverse domain names, and it is built on a domain the author owns. Forks keep it, because it names Fossil's extension format rather than a brand.

**Lifecycle metadata.** A deprecated token sets the standard `$deprecated`, as `true` or an explanation. It may also set `replacedBy` (a reference to a token of the same type that isn't deprecated) and `since` (the version that deprecated it, such as `"0.3.0"`) under the same vendor key. Neither belongs on a token that isn't deprecated.

**Contrast.** A colour token may declare what it must stand out against, under the same vendor key: `contrast: { "against": ["{color.background.page}"], "minimum": 4.5 }`. The minimum is WCAG 2.2's: 4.5 for text (1.4.3), and 3 for borders, focus rings and other marks that aren't text (1.4.11). The build calculates each ratio in light and dark for the foundations block, and a test fails when one falls short, including after a value changes in Figma. A translucent background, such as the veil over a photo, is checked at its worst: laid over white and over black, whichever gives less contrast. Descriptions don't state ratios, since nothing would keep them true.

**Values.**

- Colours are DTCG colour objects; transparency goes in `alpha`.
- The portfolio's `em` letter-spacing becomes `rem` at each text style's size, which is exact because a text style has a fixed size.
- The reference brand uses Space Grotesk for headings, Space Mono for labels and Figtree for body text. All three are open fonts on Google Fonts, so Phase 5b can build Figma text styles with them. `font.family.heading` and `font.family.mono` are semantic, so an app can point them at its own faces; the portfolio keeps Roobert this way.

**Validation runs first in the token build** (`packages/tokens/scripts/validate.ts`). It checks the tier rules, the DTCG value formats, references and their types, cycles, duplicate paths, modes, lifecycle fields and contrast checks. It reports every problem, and fails before anything is written. The script is TypeScript, run by Node's type stripping (`--experimental-strip-types`, which Node 22.14 needs and Node 24 accepts), so the build needs no extra dependency.

## Consequences

- The harvest comes to 82 primitives and 70 semantic tokens, 19 of them composites. The PRD's original targets were set before the portfolio was inventoried and are replaced by sizing from use.
- Five portfolio values change when the portfolio adopts Fossil: modal titles from 20px to 22px, three 13px labels to 12px with one label tracking value, four transition durations snapped to three, and the modal shadow's blur from 60px to 48px. The inventory marks each one.
- Adding a mode means adding it to `MODES` in the validator, and to the Phase 2 build.
- Phase 2 must read mode values from the token's original value, because Style Dictionary resolves references inside `$extensions`.
- A literal in a semantic token, a reference in a primitive or a missing description fails `pnpm build`, and so fails CI. A test keeps that true.
