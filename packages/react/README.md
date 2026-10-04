# @fossil-design/react

React components for [Fossil Design](https://github.com/ibrahimmoazzam/fossil-design), an open-source design system for agentic coding. Their props take token keys and variant names, never raw values, so code written with them stays on-system.

> **Early release.** Versions `0.x` may change component APIs between minor versions while the library is built out. The release notes list each change.

## Install

```sh
npm install @fossil-design/react
```

React 18.3 or 19 is a peer dependency. Import the stylesheet once, at your app's root. It already holds the token values, so your app needs no CSS tooling of its own:

```js
import '@fossil-design/react/style.css';
```

No fonts are included. The text styles name Space Grotesk, Space Mono and Figtree, which are on Google Fonts; load them, or point the font tokens at your own faces ([`@fossil-design/tokens`](https://www.npmjs.com/package/@fossil-design/tokens)).

## Use it

```tsx
import { Box, Stack, Text } from '@fossil-design/react';

export function Note() {
  return (
    <Box
      as="article"
      surface="surface"
      padding={{ base: 'm', tablet: 'l' }}
      radius="surface"
    >
      <Stack gap="xs">
        <Text as="h2" variant="heading-s">
          Release notes
        </Text>
        <Text tone="muted">Spacing, colour and type all come from tokens.</Text>
      </Stack>
    </Box>
  );
}
```

| Component        | What it does                                                                                                                                                                                                                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Box`            | The base layout element. `padding`, `paddingBlock`, `paddingInline` and `gap` take space tokens; `display`, `flexDirection`, `alignItems` and `justifyContent` take keywords. Each can change per breakpoint, mobile first: `{ base, tablet, compact, large, max }`. `surface` sets a fill and its contrast-checked text colour together. There is no margin prop |
| `Stack`          | A `Box` in a row or a column, spaced by `gap`                                                                                                                                                                                                                                                                                                                     |
| `Text`           | Text in one of the token text styles. A heading style needs `as`, so the outline is always chosen                                                                                                                                                                                                                                                                 |
| `Button`         | A native button: `tone` primary or secondary, `size` s or m, text, an icon and text, or an icon alone with a `label`. Size m is at least a 44px target                                                                                                                                                                                                            |
| `Link`           | A link with a dotted underline that fills in on hover and focus. A new tab gets an outward arrow and says so to screen readers. `asChild` styles a router's link, or a button for an action that reads like a link                                                                                                                                                |
| `Card`           | A bordered surface for one of a set of parallel pieces of content, with an optional title at a heading level you choose                                                                                                                                                                                                                                           |
| `Figure`         | Frames your image or video, and ties an optional caption to it                                                                                                                                                                                                                                                                                                    |
| `Icon`           | An icon, decorative unless it has a `label`. Takes one of Fossil's icons, such as `CloseIcon`, or any SVG component of your own                                                                                                                                                                                                                                   |
| `SkipLink`       | Lets keyboard users jump past the navigation; hidden until focused                                                                                                                                                                                                                                                                                                |
| `VisuallyHidden` | Text for assistive technology only                                                                                                                                                                                                                                                                                                                                |

Each component exports its variants as a constant, such as `textVariants`, for docs and tools to read.

## Icons

Fossil ships the [Material Symbols](https://fonts.google.com/icons) its components use, as React components: `ArrowOutwardIcon`, `ChevronLeftIcon`, `ChevronRightIcon`, `CloseIcon`, `PauseIcon` and `PlayArrowIcon`. They are © Google, under the Apache License 2.0, included as `dist/licenses/material-symbols.txt`. For any other icon, pass your own SVG component to `Icon`.

## License

MIT © 2026 Ibrahim Moazzam. See [LICENSE](./LICENSE).
