# 0015. The Figma component library

- **Status:** Accepted
- **Date:** 2026-10-06

## Context

Phase 5b puts Fossil's components into Figma, generated from code, with names that map straight to code ([`PRD.md`](../PRD.md), Phase 5b). Code Connect is out of reach on Professional and Education plans, so naming parity has to do its job. The PRD splits the work as the sync does: scripts decide everything that must be exact and check the result, and the agent builds the frames.

Measured live on the scratch file in October 2026 ([`Learnings.md`](../Learnings.md), section 5):

- `get_design_context` returns an instance whose overrides are only text and boolean properties as a call, `<Button children="Save changes" icon />`, with a generated props type of the exact names. An instance with a swapped nested instance is inlined as markup that keeps `data-name="Button"` and every value as `var(--fossil-…)`.
- A number variable bound to line height is read as pixels. Fossil's line heights are unitless.
- Figma's Space Grotesk has no SemiBold, the weight Fossil's headings used.
- `use_figma` rewrites a script whose text contains an `svg` tag, which breaks every Fossil script's hash.
- Slots reached general availability in the Plugin API in June 2026. A slot and its `SLOT` property share one name.

## Options

1. **What the spec reads.**
   - CSS Modules only, as the PRD first said. It misses the token props components pass in JSX: `Card`'s padding, fill and radius come from `<Box padding="l" surface="surface">`.
   - Rendered output, from a server render or a browser. Portals and measured states, such as `Popover`'s panel and `Carousel`'s controls, don't render without a real DOM and real input.
   - **Each component's JSX through the TypeScript compiler, and its CSS Module through PostCSS.** The JSX says which variant classes share an element, which `Box` and `Text` props an element takes, and which library components it nests. A small reviewed table says what code can't: the root layer, the layers Figma must have, derived axes such as `Button`'s `iconOnly`, and the kind of each Figma property.
2. **Who creates text styles, effect styles and icons.**
   - The agent, while it builds components. Every name and binding would be its choice.
   - **A generated script, like the variables' apply,** stamped with token paths, checked before it writes, and safe to run again.
3. **How layers are named.**
   - By role, chosen by the agent. The check couldn't know which layer stands for what.
   - **By the CSS class, or the state selector, each stands for,** such as `tab[aria-selected='true']`. Code names every layer, and the check finds each one by name.
4. **Where the check compares.**
   - In Node, from a paged read of every node. A library is far larger than a set of variables.
   - **In Figma, in one hashed script per part,** returning only the differences, with a hash of its result that the report verifies.
5. **Which components the library covers.**
   - Every exported component but `Box` and `Stack`, as the PRD said.
   - **Every component but `Box`, `Stack` and `VisuallyHidden`,** which renders nothing visible, so its instance would be an invisible layer.

## Decision

`pnpm figma:library-spec` writes the spec, a build sheet in Figma's names, and the styles script. For each component, the spec gives:

- its name, and its variant properties and values from its variant map, with code's defaults. A derived axis, such as `iconOnly`, adds the class code adds from other props;
- its component properties, named after its props: `TEXT` for text, `BOOLEAN` for an optional part such as an icon or an arrow, `INSTANCE_SWAP` for `Icon`'s glyph, and `SLOT` for content an app fills in;
- for every variant, each layer and the variable or style each of its properties uses, from CSS's cascade over the component's classes, `Box`'s generated classes and `Text`'s, with an app's knobs read as their token fallbacks;
- the library components nested inside, with their variants.

Text uses a text style when all five parts come from one typography token, and each part bound on its own otherwise, as for `Popover`'s mono caption. Colour and typography are checked through inheritance, as CSS applies them. Raw layout values, such as a 44px minimum height, go in the build sheet for the agent and aren't checked.

The styles script creates the text styles with family, size, weight and letter spacing bound to variables and line height as a percentage; the effect styles with all five shadow fields bound; the Components page; and one component per icon, named after its React export, with its fill bound to `color.text.default`. It builds SVG markup at run time, and the script generator refuses any script with an `svg` or `path` tag in it.

The library sits on one **Components** page, a section per component, so the check reads it with one page switch. The check reports, per component: the name, description, variants, default variant, properties, every layer's bindings, the text and icon colours and styles they inherit, the library instances inside, and any fill, stroke, padding, gap or radius bound to nothing. It ignores instances inside a slot, which stand for an app's content, and reads inside hidden instances, which `use_figma` skips by default.

The headings move from weight 600 to 700, so code and Figma's Space Grotesk match.

## Consequences

- All 13 components were built in the scratch file and pass the check. The first full check found one difference: setting uppercase on `Text`'s label layers detached their text style, so case stays in code.
- A component built by hand can still drift from code; the check is what notices. It runs locally, because only an agent can call `use_figma`.
- The table in `src/library/components.ts` is the one reviewed list. A class with token bindings that the table neither builds nor skips fails the spec, so new styling can't go unnoticed.
- Line height can't bind until Figma reads a number variable on it as a ratio. The check compares the value instead.
- The apply's finish step now names the library components that still bind each orphaned variable, which [0007](./0007-figma-sync.md) left for this phase.
- `Icon`'s glyph instances keep their component's name, so a swapped glyph reaches `get_design_context` as `<PlayArrowIcon />`.
- An instance with a swapped nested glyph is inlined rather than called. It still carries its component's name and every variable, so Claude Code can map it; Phase 6's docs should say which overrides keep the call form.
