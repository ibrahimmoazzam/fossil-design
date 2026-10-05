# 0013. Primitive tokens live under `base`

- **Status:** Accepted
- **Date:** 2026-10-05
- **Partly supersedes:** the naming in [0005](./0005-token-taxonomy.md), and the responsive key in [0009](./0009-component-package.md)

## Context

[0005](./0005-token-taxonomy.md) tells the two tiers apart by folder, and expects their names to differ: primitives name values (`space.200`, `color.gray.600`) and semantic tokens name intent (`space.m`, `color.text.muted`). Enforcement already keeps primitives out of components: the Stylelint config rejects them, typed props accept only semantic keys, `AGENTS.md` lists only semantic tokens, and Figma hides primitives from every picker.

Two places have no enforcement, and the names alone don't tell the tiers apart:

- **Figma Make's properties panel** lists every `--fossil-*` custom property in its dropdowns, primitives included.
- **A developer writing CSS by hand** before the linter runs.

Several primitive names read like intent: `--fossil-radius-sm` beside the semantic `--fossil-radius-compact`, `--fossil-line-height-base`, `--fossil-letter-spacing-wide`, and `--fossil-space-200` beside `--fossil-space-2xs`.

Established systems split on this:

- **A tier word in the name:**
  - Material 3: `md.ref.palette.primary40` against `md.sys.color.primary`.
  - Primer: `base-size-4` and `base-color-green-5` against `bgColor-inset`.
  - Salesforce SLDS 2: `--slds-g-color-palette-cloud-blue-90` against `--slds-g-color-surface-1`.
- **Name shape only:** Spectrum (`blue-800` against `accent-color-800`), Fluent 2 (`grey[14]` against `colorNeutralForeground1`) and Polaris v12.
- **A separate package:** Carbon's palette (`$blue-60`) against its tokens (`$background`).

## Options

1. **Keep the names; rely on enforcement.** No churn, but Make and hand-written CSS stay ambiguous.
2. **Prefix both tiers,** as Material does with `ref` and `sys`. Every semantic name gets longer, and those are the names people use.
3. **Prefix primitives only,** as Primer does. The names people use stay short, and the ones they shouldn't use say so.
   - **`base`**, Primer's word: plain, and readable to a designer in Figma.
   - `ref`: shorthand people would have to learn.
   - `palette`: fits colours, not spacing or durations.
   - A single letter such as `p`: opaque. No major system uses one.

## Decision

Option 3, with `base`. Every primitive sits under a top-level `base` group, and its path, custom property and Figma variable all carry it:

| Before                    | After                          |
| ------------------------- | ------------------------------ |
| `color.gray.600`          | `base.color.gray.600`          |
| `--fossil-color-gray-600` | `--fossil-base-color-gray-600` |
| Figma `color/gray/600`    | Figma `base/color/gray/600`    |

The validator enforces it, so the folder and the name can't drift apart: a primitive whose path doesn't start with `base.` fails the build, and so does a semantic token under `base`. The group name is one constant, `PRIMITIVE_GROUP` in `packages/tokens/scripts/validate.ts`.

Semantic names don't change. The folder rule from 0005 stands, and so does everything else in it.

So that `base` means only this, a responsive prop's widthless key, which 0009 named `base`, becomes `default`: `padding={{ default: 'm', tablet: 'l' }}`. It applies at every width until a breakpoint overrides it.

## Consequences

- A designer who sees `base` in a Make or Figma dropdown, and a developer who types it, knows they've reached the wrong tier. The linter still makes the final call.
- `@fossil-design/tokens` 0.4.0 renames every primitive custom property. Nothing in Fossil's components uses them, so `@fossil-design/react` is unaffected. An app's site tokens that alias a primitive must switch to the new names. No primitive is kept under its old name, because before 1.0 nothing outside Fossil depends on them yet.
- The next Figma apply creates the 82 `base/…` variables and re-points every semantic alias to them. The old primitive variables are left as orphans, since the sync never deletes; delete them by hand once the apply reports them. Nothing binds to a primitive directly.
- In Figma, primitives sit under a `base/` folder inside the `Primitives` collection. That repeats the collection name, but keeps the variable's name equal to its token path, which the sync relies on.
- `@fossil-design/react` 0.3.0 renames the responsive key: `{ base: 'm' }` becomes `{ default: 'm' }`, and the old key is a type error.
- The portfolio's token inventory names primitives the old way; the Phase 8 migration uses the new names.
