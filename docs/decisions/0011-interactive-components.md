# 0011. Interactive components: motion and extension points

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The last part of Phase 4 harvests the portfolio's interactive components: `Modal`, `Tabs`, `Carousel`, `Popover`, `Tooltip` and `Clip`. In the portfolio each animates with Motion. The PRD keeps Fossil free of an animation library ([`PRD.md`](../PRD.md), Phase 4, task 5):

- Fossil animates with CSS transitions, `@starting-style` and `data-state`, and honours `prefers-reduced-motion`.
- The portfolio adds Motion back through extension points that this record defines. The dry run validated the pattern on `Modal`: Fossil owns the dialog's lifecycle, and `renderPanel` lets Motion's `AnimatePresence` replace the CSS fade.
- Component props describe behaviour, never the element underneath, so a fork can swap a headless library into one component.

Three facts shaped the details, found while building in October 2026:

- An element that animates out has to stay mounted until its transition ends. `transitionend` alone gets this wrong: a transition reversed partway, by closing a popover just after opening it, runs for less than its full duration, and the one it replaced fires `transitioncancel`. CSS transitions appear in `element.getAnimations()`, and their `finished` promises settle correctly in every case.
- Floating UI ignores presses on elements added to the page after a floating element opens, treating them as injected by a browser extension.
- The React Compiler's lint treats any object that holds a ref as a ref, so reading its other fields during render is reported as reading a ref.

## Options

1. **Exit animations.**
   - Floating UI's `useTransitionStatus`. It needs each duration in milliseconds, which would copy the motion tokens into JavaScript.
   - **A `usePresence` hook** that keeps an element mounted until `getAnimations()` settles. The durations stay in CSS, and under reduced motion, with no transitions, the element unmounts on the next frame.
2. **Extension points.**
   - One per animation the portfolio has, each shaped to Motion.
   - **Only where a library needs to own an element's lifecycle,** each library-neutral: a render prop with a class to spread, or a callback.
3. **Reduced motion in JavaScript.**
   - Motion's `useReducedMotion`. A dependency every fork would inherit.
   - **`matchMedia` through `useSyncExternalStore`,** returning `null` until known, so code that starts motion waits rather than treating "unknown" as "no".

## Decision

**Motion.** Each component transitions opacity and scale or translate with the motion tokens. It enters through `@starting-style`, and exits on `data-state="closed"` while `usePresence` or `Modal` keeps it mounted. Every stylesheet turns its transitions off under `prefers-reduced-motion`. Tabs, Carousel and Clip read the preference through `usePrefersReducedMotion` before smooth-scrolling or playing.

**Extension points.**

| Component  | Extension point                                     | What it hands over                                                                                                                                                                     |
| ---------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Modal`    | `renderPanel({ open, panelProps, onExitComplete })` | The panel. Fossil keeps the `<dialog>`, focus, Escape, the scrim and the scroll lock, and closes the dialog when `onExitComplete` is called. `onExitComplete` is stable across renders |
| `Modal`    | `onShowingChange(showing)`                          | `true` when the dialog opens, `false` once its exit has finished, to pause and resume a smooth-scroll library                                                                          |
| `Tabs`     | `renderIndicator({ className })`                    | The selected tab's background, so a library can move it between tabs                                                                                                                   |
| `Carousel` | `data-*` attributes on the root                     | A marker for a library that looks for one, such as Lenis's `data-lenis-prevent-horizontal`                                                                                             |
| `Link`     | `asChild` ([0010](./0010-content-components.md))    | The element, for a router's link                                                                                                                                                       |

Behaviour props use the names common to headless libraries: `open` and `onOpenChange` for `Modal`, `Popover` and `Tooltip`, and `value`, `defaultValue` and `onValueChange` for `Tabs`.

**Components.**

- **`Modal`** is a native `<dialog>` opened with `showModal()`. Focus starts on the title, Escape and a click outside call `onOpenChange(false)`, and the page behind is scroll-locked with the scrollbar's width held.
- **`Tabs`** follows the ARIA tabs pattern, with the panel above a scrolling pill of tabs, as in the portfolio. A panel with nothing focusable takes a tab stop.
- **`Carousel`** is a native scroll-snap list. Its controls are buttons with `aria-disabled` or dots, and they appear only while the cards overflow.
- **`Popover` and `Tooltip`** use `@floating-ui/react`, the one runtime dependency. A surface whose trigger sits inside a `<dialog>` is portalled into it, to share the top layer. Both read the trigger's ref from the element on React 18, and from its props on React 19.
- **`Clip`** frames a silent looping video in `Figure`, with a play and pause toggle on the new veil tokens. `useClipPlayback` is exported for clips framed by something else.

**Tests.** Every component has stories with play functions, and axe passes on each in both themes. Real-input tests cover what play functions can't:

- `Modal`: Escape closes it and returns focus, a click outside the panel closes it, and Tab never reaches the page behind.
- `Tabs`: the arrow keys, Home and End.
- `Carousel`: arrow keys scroll the track, and the backward button keeps focus when it runs out.
- `Popover`: Escape, a click outside, and tabbing past its end.
- `Tooltip`: hover, Escape, and focus.
- `Clip`: Space on the toggle.

Those files run one at a time, because real input goes to whichever frame has focus.

## Consequences

- The portfolio's Phase 8 migration adds Motion through `renderPanel` and `renderIndicator`, and connects Lenis through `onShowingChange` and the carousel's data attribute.
- A component's tab panel content enters with a CSS fade; the portfolio's panel transition, if kept, is its own.
- `Popover` and `Tooltip` set their text in the mono face, as the portfolio's floating surfaces do, at the caption and fine sizes.
- Floating UI's ref setters are typed as methods, so destructuring them carries a lint disable comment with its reason.
- Two values change for the portfolio. Clips take Figure's caption size, 14px, and its compact radius, where the portfolio had 13px and the control radius. The two now read as one family, as the portfolio's comments intended.
