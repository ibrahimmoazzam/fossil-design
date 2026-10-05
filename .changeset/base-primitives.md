---
'@fossil-design/tokens': minor
---

Every primitive token now sits under a `base` group, so its name says it isn't for direct use: `color.gray.600` is `base.color.gray.600`, and `--fossil-color-gray-600` is `--fossil-base-color-gray-600`. Semantic tokens are unchanged. If your site tokens alias a primitive, switch to the new name. The build now fails on a primitive outside `base`, or a semantic token inside it.
