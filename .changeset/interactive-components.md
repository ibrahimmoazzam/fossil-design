---
'@fossil-design/react': minor
---

Interactive components: `Modal`, `Tabs`, `Carousel`, `Popover`, `Tooltip` and `Clip`, with `useClipPlayback`. They animate with CSS transitions and honour reduced motion, with no animation library. Extension points let an app add one: `Modal`'s `renderPanel` and `onShowingChange`, `Tabs`' `renderIndicator`, and data attributes on `Carousel`. `Figure` gains `captionHidden`. `Popover` and `Tooltip` bring `@floating-ui/react` as a dependency.
