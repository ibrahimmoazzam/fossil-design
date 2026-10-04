---
'@fossil-design/react': patch
---

`VisuallyHidden`'s type declaration no longer copies React's props, which failed type-checking in apps on another `@types/react` version. `Tooltip`, `Tabs` and `Carousel` no longer make React 18 warn about `useLayoutEffect` during server rendering.
