---
'@fossil-design/tokens': patch
---

`font.family.heading` and `font.family.mono` no longer name a typeface in their descriptions. The sentence still says what the token is for — a seam an app can point at its own face — without crediting a face the app may not use. A token's description reaches `tokens.json`, the foundations block and, through the sync, the Figma variable a designer reads, so it is the brand's text rather than Fossil's.
