## Building with {{name}}

1. **Use a component first.** The index lists them all. Read a component's doc before using it; its "When not to use" names the better choice.
2. **Lay out with `Box` and `Stack`,** never a raw `<div>`, `<section>`, `<nav>` or any other element `Box` renders. `Stack` is a row or a column. `Box` adds grid, a display that changes per breakpoint, and surfaces. `{{scope}}/eslint-config` rejects the raw elements.
3. **Style with semantic tokens only,** as `var(--{{prefix}}-…)`, in a CSS Module or any other stylesheet. No raw colours (hex, `rgb()` and the like), no raw sizes for padding, gap, radius or type, no primitive tokens (`--{{prefix}}-base-…`) and no deprecated ones. `{{scope}}/stylelint-config` rejects each of them.
4. **Space with padding and `gap`, never margin.** `margin: 0` is fine. Any other margin needs the person's approval and a disable comment giving the reason.
5. **Mobile first.** Style for the smallest screen, then add `min-width` media queries. `Box` and `Stack` props take the same breakpoints: `padding={{ default: 's', tablet: 'l' }}`.
6. **Render text with `Text`,** which sets the five parts of a text style. In a stylesheet, set all five yourself, never the `font` shorthand.
7. **Light and dark need no work.** Every colour token follows `prefers-color-scheme`, and `data-theme="light"` or `data-theme="dark"` on `<html>` forces one.

## When {{name}} doesn't have it

### A value with no token

Don't write the raw value. If it belongs to this app alone, add it to the app's site tokens file, the one Stylelint's `siteTokens` option names; site tokens may alias {{name}}'s primitives. If it could serve other apps, it's a gap.

### Escape hatches

Deviation is allowed, and always visible:

1. **Sanctioned:** `Box`'s `style` prop takes the layout tokens can't express: `gridTemplateAreas`, `gridTemplateColumns`, `aspectRatio` and `transform`. It needs no comment.
2. **Logged:** anything else needs a disable comment with its reason after `--`, such as `/* stylelint-disable-next-line declaration-property-value-allowed-list -- lines the badge up with the avatar's edge */`. Ask the person before adding a margin. CI counts these comments.
3. **A signal:** the same escape three times is a gap.

### Logging a gap

A gap is a place where {{name}} fell short: you couldn't build something from its components and tokens, you rebuilt something that looks generic, or you added a logged escape. Don't file it yourself. Draft it, show the person these four fields, and let them decide:

- **Where:** the file, and the task you were doing.
- **Needed:** what the task needed. Describe the need, not a solution.
- **Offered:** what {{name}} offered, and why it fell short.
- **Evidence:** the code you wrote instead, or the escape comment.

If they agree, it goes on the gap form: {{gapForm}}

## Implementing a Figma design

{{name}}'s Figma components and their properties share these components' and props' names, so map them by name. Through the Figma MCP server:

- An instance whose overrides are only text and boolean properties arrives as a call, such as `<Button children="Save changes" icon />`, with Figma's property names. Variant values are strings, and `"true"` and `"false"` become booleans.
- A boolean that shows a nested icon, such as `Button`'s `icon`, stands for a prop that takes an icon component. Pass the glyph the design shows: a glyph arrives as `<CloseIcon />`.
- An instance with a swapped nested instance, or with an instance-swap property set, arrives as markup marked `data-name="Button"`. Rebuild it as that component.
- A frame bound to variables arrives with values such as `var(--{{prefix}}-space-m, 16px)`. Build it with `Box` or `Stack`, passing the token keys those variables name (`gap="m"`), and drop the fallbacks.
