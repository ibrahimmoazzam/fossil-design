# @fossil-design/react

## 0.5.1

### Patch Changes

- 84520e6: Title `tokens.md` "Semantic Tokens", since it lists only semantic tokens. The bundled docs in `@fossil-design/react` carry the same file.
- 052593a: `tokens.md` gives a group a Dark column only when one of its tokens has a dark value, so space, type and the other groups that look the same in both modes no longer carry an empty column. `@fossil-design/react` bundles the same file in its docs.
- Updated dependencies [84520e6]
- Updated dependencies [052593a]
  - @fossil-design/tokens@0.6.1

## 0.5.0

### Minor Changes

- 8e25c11: A `fossil-agents-md` bin writes Fossil's rules, the token scales, the components and the paths to their docs into your app's `AGENTS.md`, between `<!-- BEGIN:fossil-design-agent-rules -->` and `<!-- END:fossil-design-agent-rules -->`, and adds `@AGENTS.md` to `CLAUDE.md` if you have one. Run it again after upgrading; it replaces only the block. `--check` changes nothing and fails when the block is out of date, for CI.

  Figma Make guidelines ship in `guidelines/`: a Make file's own `guidelines/Guidelines.md` can be one line, `Read node_modules/@fossil-design/react/guidelines/Guidelines.md before writing any code, and follow it.` They set up the stylesheet, the fonts and the page's background, tell Make not to use its scaffold's Tailwind classes, and route it through the docs.

  The rules in `docs/foundations.md` add two points: no utility classes from Tailwind or any other framework, and how to make grid columns change per breakpoint. `Box`'s grid example now uses `minmax(min(100%, 14rem), 1fr)`, so a single column never overflows a narrow screen.

### Patch Changes

- Updated dependencies [5f97206]
  - @fossil-design/tokens@0.6.0

## 0.4.0

### Minor Changes

- 90c83cc: Docs for agents ship inside the package, in `docs/`, so they always match the installed version: an index, the foundations (the rules, escape hatches, gap logging and token scales), a token reference, and one file per component with its contract, props, variants and examples taken from its stories. `components.json` and `tokens.json` hold the same as JSON. Each component's JSDoc now carries that contract (when to use it, when not to, its states, and what it does for accessibility and what the app must do), so editors and Storybook show it too.

### Patch Changes

- Updated dependencies [e3b8678]
  - @fossil-design/tokens@0.5.0

## 0.3.1

### Patch Changes

- cf77a43: `Link` and `Tabs` render their inner spans through `Box`, so Fossil's components pass its own ESLint config. The markup gains Box's base class; nothing else changes.

## 0.3.0

### Minor Changes

- 589674d: A responsive prop's widthless key is now `default`, not `base`, because `base` now names primitive tokens: write `padding={{ default: 'm', tablet: 'l' }}`. The old key is a type error.

### Patch Changes

- Updated dependencies [b764993]
  - @fossil-design/tokens@0.4.0

## 0.2.0

### Minor Changes

- 87d67ba: Content components: `Button`, `Card`, `Figure`, `Icon`, `Link`, `SkipLink` and `VisuallyHidden`, with the six Material Symbols Fossil's components use as React components (`CloseIcon` and the rest). `Link` takes `asChild` to style a router's link or a button, and `Icon` takes any SVG component of your own. Each ships with stories and axe checks; real-input tests cover keyboard focus, hover and the skip link.
- 4769ac2: Interactive components: `Modal`, `Tabs`, `Carousel`, `Popover`, `Tooltip` and `Clip`, with `useClipPlayback`. They animate with CSS transitions and honour reduced motion, with no animation library. Extension points let an app add one: `Modal`'s `renderPanel` and `onShowingChange`, `Tabs`' `renderIndicator`, and data attributes on `Carousel`. `Figure` gains `captionHidden`. `Popover` and `Tooltip` bring `@floating-ui/react` as a dependency.

### Patch Changes

- d5b407d: `VisuallyHidden`'s type declaration no longer copies React's props, which failed type-checking in apps on another `@types/react` version. `Tooltip`, `Tabs` and `Carousel` no longer make React 18 warn about `useLayoutEffect` during server rendering.
- Updated dependencies [7d974b6]
  - @fossil-design/tokens@0.3.0

## 0.1.0

### Minor Changes

- e8e3055: First components: `Box`, `Stack` and `Text`, with their variant maps and prop types, and `style.css`, which carries the token values. `Box` takes token keys for padding, gap and radius, keywords for layout, per breakpoint, and a `surface` that sets a fill with its contrast-checked text colour. A heading style on `Text` needs an element.

## 0.0.2

### Patch Changes

- 57232c2: First release through the trusted-publishing workflow, with npm provenance. The package contents are unchanged.
