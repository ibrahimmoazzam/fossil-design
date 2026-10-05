---
'@fossil-design/react': minor
---

A responsive prop's widthless key is now `default`, not `base`, because `base` now names primitive tokens: write `padding={{ default: 'm', tablet: 'l' }}`. The old key is a type error.
