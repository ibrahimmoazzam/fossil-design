# 0014. The ESLint config, the escape count and the gap log

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

Phase 5 closes the rest of the enforcement loop ([`PRD.md`](../PRD.md), Phase 5). The Stylelint config already guards stylesheets ([0008](./0008-stylelint-config.md)). What remains is the JSX half, the escape-hatch policy, a count of escapes on each pull request, and a record of gaps that ends in decisions. The exit check is a deliberately off-system commit, with a raw `<div>`, a hex colour, a primitive token and a margin without a reason, failing in Fossil and in the smoke-test app.

Checked in October 2026:

- `@eslint-community/eslint-plugin-eslint-comments` 4.8.1 accepts ESLint `^10`. Its `require-description` rule takes an `ignore` list of directive kinds.
- typescript-eslint 8.71 enables `@typescript-eslint/no-deprecated` in `strictTypeChecked` only.
- In flat config a later `no-restricted-syntax` setting replaces an earlier one; options don't merge.

## Options

1. **Which elements the JSX rule bans.**
   - A hand-picked set of block elements. It would drift from `Box`.
   - **Exactly the elements `Box` renders,** `span` included, kept equal to `boxElements` by a workspace test. Every banned element has a `Box` replacement.
2. **What counts as an escape.**
   - Every disable comment. Routine TypeScript disables, such as `unbound-method`, would bury the design-system signal.
   - **A disable that names one of Fossil's rules, or names none,** outside tests and the off-system fixture.
3. **Where CI reports the count.**
   - A pull request comment. It needs `pull-requests: write`, which a pull request from a fork doesn't get.
   - **The job summary** of a `Count lint escapes` job, with no extra permissions. It lists the escapes the branch adds against its base, and marks a rule with three or more. It never fails.
4. **Where gaps live.**
   - A `gaps.md` ledger in the repository. A consumer agent can't write to it.
   - **Issues from a `gap` issue form,** with the four fields the PRD asks for. A gap closes with a decision label and a comment giving the reason.
5. **How the exit check runs.**
   - Once, by hand. Nothing would notice a regression.
   - **A shared fixture, `smoke/off-system/`,** linted with Fossil's own configs by a workspace test and copied into each smoke-test app by `pnpm smoke`, which expects every line to fail. A throwaway pull request shows the same failure in CI once.

## Decision

`@fossil-design/eslint-config` exports `fossil(options)` and, as its default, `fossil()`:

| Setting                                                 | What it enforces                                                                                |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `no-restricted-syntax`                                  | No raw JSX element that `Box` renders. Severity from `layoutElements`, `error` by default       |
| `@eslint-community/eslint-comments/require-description` | Every disable and inline config has a reason after `--`                                         |
| `reportUnusedDisableDirectives: 'error'`                | A disable that disables nothing fails                                                           |
| `@typescript-eslint/no-deprecated`, with `deprecations` | Deprecated components and props are flagged. Opt-in: it needs typescript-eslint's typed linting |

It sets no parser; a TypeScript app already has typescript-eslint's. It exports `layoutElementRestrictions` for a config that sets `no-restricted-syntax` itself. Fossil's root `eslint.config.js` adds `fossil()` after its own configs.

The escape levels:

1. **Sanctioned:** `Box`'s `style` prop. Not counted.
2. **Logged:** a disable comment with a reason. Counted by `pnpm escapes` and the CI job.
3. **Signal:** three escapes from one rule, or three gaps for one need, trigger a review.

Gaps are reviewed before each version pull request is merged, and each closes as **component**, **pattern** or **keep local** ([`docs/gaps.md`](../gaps.md)).

## Consequences

- Fossil's own components follow the rule. Five `<span>`s in `Link` and `Tabs` became `<Box as="span">`. `Popover` and `Tooltip` keep a `<div>` with a reasoned disable, because Floating UI positions them with inline `position`, `top` and `left`, which `Box`'s `style` prop refuses. Those are the first two counted escapes.
- The count is a report. A pull request that adds escapes still merges; the reviewer sees each one with its reason.
- The smoke-test apps install ESLint and typescript-eslint, as a consumer would.
- The `gap` and decision labels have to exist on the repository for the issue form to apply them.
