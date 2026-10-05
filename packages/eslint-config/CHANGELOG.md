# @fossil-design/eslint-config

## 0.1.0

### Minor Changes

- 32b9e36: The first working config. `fossil()` bans raw JSX elements that `Box` renders, such as `<div>` and `<nav>`, in favour of `<Box as="…">`, and requires a reason after `--` on every disable comment. Options set the layout rule's severity, its files, and opt in to `@typescript-eslint/no-deprecated`. `layoutElementRestrictions` lets a config that sets its own `no-restricted-syntax` keep Fossil's entries.

## 0.0.2

### Patch Changes

- 57232c2: First release through the trusted-publishing workflow, with npm provenance. The package contents are unchanged.
