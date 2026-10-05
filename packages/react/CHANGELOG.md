# @fossil-design/react

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
