# 0008. The shared Stylelint config

- **Status:** Accepted
- **Date:** 2026-10-04

## Context

The PRD closes the styling surface in two places: typed props in code, and lint in stylesheets. `@fossil-design/stylelint-config` is the stylesheet half. One config lints Fossil's own components and every consumer's CSS, from off-the-shelf rules and the lists the token build writes to `lint.json` ([0006](./0006-token-build-outputs.md)).

The PRD put the config in Phase 5, but Phase 4's exit criterion lints every component stylesheet with it. Writing a dozen stylesheets first and linting them afterwards means fixing them twice.

Probing the two plugins against Stylelint 17.16 in October 2026 settled what their docs leave open:

- With `expandShorthand`, `stylelint-declaration-strict-value` checks each longhand of `border`, `background`, `outline` and `transition`, so `border: 1px solid #ccc` fails on the colour.
- It accepts any function by default, `rgb()` and `calc()` included, unless `ignoreFunctions` is off.
- It only sees the properties it is given, so a raw colour in a local custom property or a `box-shadow` passes it.
- `stylelint-value-no-unknown-custom-properties` accepts `var(--x, fallback)` for an unknown `--x`, so a component's own knobs work as long as they carry a token fallback.
- Stylelint 17 passes `(property, value)` to a function `message`, so one rule can explain each kind of failure differently.

## Options

1. **When to build it.**
   - In Phase 5, as planned. Phase 4's components are linted after the fact.
   - **First in Phase 4.** Only this task moves; the ESLint config, the escape count and the gap log stay in Phase 5.
2. **Raw colours outside colour properties.**
   - Leave them to review. `--tint: #1b4dff` or a `box-shadow` with `rgb()` passes.
   - **Reject raw colour syntax in every value** with the core disallowed list: hex, and the colour functions. A raw colour in a colour property is then reported twice.
3. **Functions in token properties.**
   - Allow them, the plugin's default. `padding: calc(4px + 2px)` passes.
   - **Refuse them.** Arithmetic on two tokens needs a token of its own or a disable comment with a reason.
4. **How a consumer adds its own tokens.**
   - A second config the consumer writes and merges.
   - **An option on a factory:** `fossil({ siteTokens })` makes those files' properties known everywhere, and lets those files alone alias primitives and hold raw values.

## Decision

The package exports `fossil(options)` and, as its default, `fossil()`:

```js
// stylelint.config.js in an app
import { fossil } from '@fossil-design/stylelint-config';

export default fossil({ siteTokens: ['src/styles/site-tokens.css'] });
```

| Rule                                                                                    | What it enforces                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scale-unlimited/declaration-strict-value`                                              | Colour, fill, stroke, padding, gap, radius, font family, size and weight, letter-spacing, line-height and duration take a custom property, shorthands expanded. Plain keywords pass: `inherit`, `initial`, `unset`, `revert`, `revert-layer`, `transparent`, `currentColor`, `none`, `normal` and `0`. Functions don't |
| `csstools/value-no-unknown-custom-properties`                                           | Every `var()` names a property from `tokens.css`, a site-tokens file or the same stylesheet                                                                                                                                                                                                                            |
| `declaration-property-value-disallowed-list`                                            | No primitive or deprecated token, and no raw colour, in any value. The message says which, and names a deprecated token's replacement                                                                                                                                                                                  |
| `declaration-property-value-allowed-list`                                               | Margins only `0`                                                                                                                                                                                                                                                                                                       |
| `reportDescriptionlessDisables`, `reportNeedlessDisables`, `reportInvalidScopeDisables` | Every disable comment has a reason, disables something, and names a rule that exists                                                                                                                                                                                                                                   |

The site-tokens override turns off the strict-value rule and keeps only the deprecated-name check. `siteTokens` paths resolve from `root`, which defaults to the working directory, because the unknown-property plugin needs absolute paths in a monorepo.

Fossil's root `stylelint.config.js` is `fossil()` plus ignores for build output, so Fossil's own stylesheets go through exactly what a consumer gets. Box's generated CSS is linted too.

## Consequences

- A local custom property may still hold a raw length, such as Carousel's `--dot-size: 6px`. That is the inventory's "stays in the component" outcome, which needs a reason in review. A raw colour can't hide that way.
- A raw colour in a colour property gets two errors, one from each rule.
- The config reads `@fossil-design/tokens` from its built `dist/`, so `pnpm lint` needs `pnpm build` first, as type-checking already does.
- Storybook's few base styles live in `preview-head.html`. TypeScript 6 needs a declaration for every side-effect import, and a wildcard `*.css` declaration would also match `*.module.css`, hiding a missing generated type.
- The Phase 5 exit check, a deliberately off-system commit failing in Fossil and in the smoke-test app, still waits for Phase 5.
