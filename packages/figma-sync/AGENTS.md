# figma-sync

Fossil's own code for syncing tokens with Figma variables. To run a sync, follow the `fossil-figma-sync` skill in `.claude/skills/`. This file covers working on the code. ADR 0007 explains the design.

## Commands

```sh
pnpm test --project figma-sync   # the sync's tests, against a fake Figma
pnpm figma:apply                 # write the apply scripts to .figma/
pnpm figma:read [page]           # write a read script to .figma/
pnpm figma:diff [--dry-run]      # compare saved read results with git, and write value changes
```

The CLIs run through Node's type stripping, so there's no build step. `pnpm --filter figma-sync typecheck` type-checks the package.

## Layout

- `src/runtime.ts` is the only code that runs in Figma. Everything else runs in Node.
- `src/model.ts` decides which tokens Figma gets, and converts their values.
- `src/spec.ts` turns them into variable specs: names, scopes, code syntax and renames.
- `src/scripts.ts` writes the scripts that carry `runtime.ts` and a spec to `use_figma`.
- `src/snapshot.ts` checks saved read results.
- `src/diff.ts` is the three-way diff. `src/write.ts` writes Figma's values into the token files.
- `src/cli.ts` holds the three commands. `src/fake-figma.ts` stands in for Figma in tests.
- `src/fixtures/tokens/` is a frozen copy of the reference token source, which the tests run on. A value changed in Figma, or a fork's own brand, therefore can't break them. Refresh the copy only when the token format changes. Tests that check the live source read `packages/tokens/src` directly.

The token source is read with the validator in `packages/tokens/scripts/validate.ts`, so both packages agree on what a valid token is.

## Rules

- **Keep the core independent of `use_figma`.** Only the scripts touch Figma, and only through the Plugin API, so a plugin could replace the agent without changing the logic.
- **`runtime.ts` is shipped as text.** Each script embeds only the functions it calls. So:
  - every function is top-level and self-contained, and imports nothing;
  - nothing in it is a multi-line string, because the generator drops indentation;
  - nothing calls `console.log` or `figma.notify`, because `use_figma` only sees the return value.
- **Every script checks its own hash, and every read result carries one.** Never weaken either check: the agent retypes scripts and results, and the hashes are what catch a slip.
- **Every class of diff has a test.** Add one with any new class, in `src/sync.test.ts`.
- **Keep the fake Figma as strict as Figma.** When a live run finds Figma behaving differently, change the fake first, so the tests show the difference, then change the code.
- **Nothing writes to the real Figma file without asking.** Tests use the fake; live checks use a scratch file.

## Known limits

Each one is verified in `docs/Learnings.md`:

- `use_figma` cuts off a response over about 20 KB with no error. Reads therefore page at 40 variables, and each page's hash catches truncation.
- A failed script may keep some of its writes. Apply scripts check everything before writing, and running one again only changes what differs.
- Professional and Education files allow four modes per collection.
- An empty `scopes` list hides a variable from Figma's pickers, which is how primitives stay out of designers' way.
- Figma refuses scopes on timing and easing variables, so the sync never sets them, and primitive durations and curves stay visible.
- Figma keeps every number as a 32-bit float, colour channels and curve points included, so the apply compares numbers at that precision.
- Figma HTML-escapes `&`, `<`, `>`, `"` and `'` in a variable's description, so the apply decodes them before comparing.
- The Plugin API can't reorder variables. Figma lists them in the order they were created, which follows the token files.
