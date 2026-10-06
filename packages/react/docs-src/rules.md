## Building with {{name}}

1. **Use a component first.** The index lists them all. Read a component's doc before using it; its "When not to use" names the better choice.
2. **Lay out with `Box` and `Stack`,** never a raw `<div>`, `<section>`, `<nav>` or any other element `Box` renders. `Stack` is a row or a column. `Box` adds grid, a display that changes per breakpoint, and surfaces. `{{scope}}/eslint-config` rejects the raw elements.
3. **No utility classes** from Tailwind or any other CSS framework, even if the project's template sets one up: they skip the tokens and the lint.
4. **Style with semantic tokens only,** as `var(--{{prefix}}-…)`, in a CSS Module or any other stylesheet. No raw colours (hex, `rgb()` and the like), no raw sizes for padding, gap, radius or type, no primitive tokens (`--{{prefix}}-base-…`) and no deprecated ones. `{{scope}}/stylelint-config` rejects each of them.
5. **Space with padding and `gap`, never margin.** `margin: 0` is fine. Any other margin needs the person's approval and a disable comment giving the reason.
6. **Mobile first.** Style for the smallest screen, then add `min-width` media queries. `Box` and `Stack` props take the same breakpoints: `padding={{ default: 's', tablet: 'l' }}`. `style` can't change per breakpoint, so for grid columns that should, let the grid fit them, `style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 14rem), 1fr))' }}`, or set the count in a class: `@media (min-width: {{tablet}}) { .cards { grid-template-columns: repeat(3, 1fr); } }`.
7. **Render text with `Text`,** which sets the five parts of a text style. In a stylesheet, set all five yourself, never the `font` shorthand.
8. **Light and dark need no work.** Every colour token follows `prefers-color-scheme`, and `data-theme="light"` or `data-theme="dark"` on `<html>` forces one.

## When {{name}} doesn't have it

### A value with no token

Don't write the raw value. If it belongs to this app alone, add it to the app's site tokens file, the one Stylelint's `siteTokens` option names; site tokens may alias {{name}}'s primitives. If it could serve other apps, it's a gap.

### Escape hatches

Deviation is allowed, and always visible:

1. **Sanctioned:** `Box`'s `style` prop takes the layout tokens can't express: `gridTemplateAreas`, `gridTemplateColumns`, `aspectRatio` and `transform`. It needs no comment.
2. **Logged:** anything else needs a disable comment with its reason after `--`, as in `/* stylelint-disable-next-line <rule> -- <the reason> */`. Ask the person before adding a margin. CI counts these comments.
3. **A signal:** the same escape three times is a gap.

### Logging a gap

A gap is a place where {{name}} fell short: you couldn't build something from its components and tokens, you rebuilt something that looks generic, or you added a logged escape. Don't file it yourself. Draft it, show the person these four fields, and let them decide:

- **Where:** the file, and the task you were doing.
- **Needed:** what the task needed. Describe the need, not a solution.
- **Offered:** what {{name}} offered, and why it fell short.
- **Evidence:** the code you wrote instead, or the escape comment.

If they agree, it goes on the gap form: {{gapForm}}
