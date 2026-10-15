---
'@fossil-design/eslint-config': minor
'@fossil-design/stylelint-config': minor
---

Rename the `fossil()` factory to `brand()`, with its options type `BrandOptions`. A config that calls `fossil({ … })` calls `brand({ … })` instead; the default export is unchanged. The factory is a name in an adopting app's own `eslint.config.js`, and nothing about it is Fossil's to claim, as [ADR 0020](https://github.com/ibrahimmoazzam/fossil-design/blob/main/docs/decisions/0020-what-a-fork-renames.md) sets out. The same reasoning renames `fossil.config.json` to `brand.config.json`, which no published package reads.
