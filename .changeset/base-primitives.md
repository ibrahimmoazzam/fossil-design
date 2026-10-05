---
'@fossil-design/tokens': minor
---

Every primitive token now sits under a `base` group, so its name says it isn't for direct use: `color.gray.600` is `base.color.gray.600`, and `--fossil-color-gray-600` is `--fossil-base-color-gray-600`. If your site tokens alias a primitive, switch to the new name. One semantic token is renamed for the same reason: `motion.duration.base` is now `motion.duration.default`. The old name still works, deprecated, and the Stylelint config names its replacement. The build now fails on a primitive outside `base`, or a semantic token inside it.
