# {{name}} in Figma Make

Build every screen with {{name}}'s components, from `{{package}}` {{version}}. These guidelines ship inside the package, so they match the version installed. Before writing code, read in this order:

1. `{{guidelines}}/setup.md`: the stylesheet, the fonts and the page's ground. Check it once per file.
2. `{{docs}}/foundations.md`: the rules, the escape hatches and the token scales.
3. `{{docs}}/index.md`: every component, in a line each.
4. `{{docs}}/components/<Name>.md`, for each component you use: when to use it and when not to, its props and examples.

When you need a token the foundations don't show, `{{docs}}/tokens.md` lists every one, with its light and dark values.

## Where this project's AGENTS.md disagrees

This project's `AGENTS.md` describes a Tailwind scaffold. Where it and these guidelines differ, follow these:

- **No Tailwind classes,** in JSX or through `@apply`. Lay out with `Box` and `Stack` props. For anything they can't express, such as grid columns that change per breakpoint, write a CSS file that uses {{name}}'s semantic tokens; `foundations.md` shows how.
- **Leave `@import "tailwindcss"` where it is.** {{name}}'s stylesheet isn't in a cascade layer, so it wins over Tailwind's reset.
- **Only `--{{prefix}}-…` tokens.** Never `--{{prefix}}-base-…`, which are primitives, and never the raw values of a Figma library's variables, if the file has any as CSS.

## Before you finish

- Every element comes from {{name}}: no raw `<div>`, `<section>` or other element `Box` renders.
- No raw colours, sizes or margins, and no Tailwind classes.
- One `h1`, and headings in order below it. `Text`'s `as` and `Card`'s `titleAs` set the level.
