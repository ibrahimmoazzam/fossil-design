---
'@fossil-design/tokens': minor
---

Colour tokens declare what they must stand out against and the WCAG ratio they need, under `contrast` in `tokens.json`. The AGENTS.md foundations table shows each ratio in light and dark, and descriptions no longer state ratios that a value change would make wrong. `tokens.json` now gives a token that aliases another semantic token its target's dark value: `color.border.selected` and `color.focus.ring` were listed with their light colour in dark mode.
