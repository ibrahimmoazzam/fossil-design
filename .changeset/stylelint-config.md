---
'@fossil-design/stylelint-config': minor
---

First working config. Stylesheets must use custom properties for colour, spacing, radius, type and duration; may not use primitive or deprecated tokens, or a raw colour anywhere; may only set margins to `0`; and every disable comment needs a reason. `fossil({ siteTokens })` adds an app's own token files, which alone may alias primitives and hold raw values.
