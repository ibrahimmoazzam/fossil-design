---
'@fossil-design/eslint-config': minor
'@fossil-design/stylelint-config': patch
---

Name the ESLint config's blocks after the system's CSS prefix, so a fork's lint output reads `acme/layout` rather than another system's name. A config that overrides a block by name, such as `fossil/layout`, names its own system's prefix instead. The prefix is generated into the package at build time, because a published package can't read `brand.config.json`. Both configs' descriptions no longer name Fossil, since they describe whichever system builds them.
