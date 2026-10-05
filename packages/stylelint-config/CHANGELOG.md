# @fossil-design/stylelint-config

## 0.1.2

### Patch Changes

- Updated dependencies [b764993]
  - @fossil-design/tokens@0.4.0

## 0.1.1

### Patch Changes

- Updated dependencies [7d974b6]
  - @fossil-design/tokens@0.3.0

## 0.1.0

### Minor Changes

- 8e2d844: First working config. Stylesheets must use custom properties for colour, spacing, radius, type and duration; may not use primitive or deprecated tokens, or a raw colour anywhere; may only set margins to `0`; and every disable comment needs a reason. `fossil({ siteTokens })` adds an app's own token files, which alone may alias primitives and hold raw values.

## 0.0.2

### Patch Changes

- 57232c2: First release through the trusted-publishing workflow, with npm provenance. The package contents are unchanged.
