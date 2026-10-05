---
'@fossil-design/eslint-config': minor
---

The first working config. `fossil()` bans raw JSX elements that `Box` renders, such as `<div>` and `<nav>`, in favour of `<Box as="…">`, and requires a reason after `--` on every disable comment. Options set the layout rule's severity, its files, and opt in to `@typescript-eslint/no-deprecated`. `layoutElementRestrictions` lets a config that sets its own `no-restricted-syntax` keep Fossil's entries.
