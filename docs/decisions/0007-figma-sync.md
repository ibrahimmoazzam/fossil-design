# 0007. The Figma sync

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

Phase 3 of the PRD puts Fossil's tokens into Figma as variables, and brings back the values designers change there as pull requests. On a Professional or Education plan, the only way in is the Plugin API. The Figma MCP server's `use_figma` tool runs Plugin API code, but only for an approved agent signed in through OAuth, so a script or CI job can't call it. An agent has to carry the code.

Checked in October 2026 ([`Learnings.md`](../Learnings.md), section 5):

- `use_figma` runs plain JavaScript with top-level `await`, and returns whatever the script returns, as JSON. No state persists between calls.
- A response over about 20 KB is cut off mid-JSON, with no error.
- A failed script may keep some of its writes. Figma's own `figma-use` skill dropped its atomicity guarantee for a per-error retry flag.
- A Professional or Education file allows four modes per collection. An empty `scopes` list hides a variable from every picker.
- Shared plugin data on a variable or collection is readable by any plugin, which includes `use_figma`.
- Plugin API Update 133 (August 2026) added `TIMING` variables, which hold seconds, and `EASING` variables, which hold a named easing or a custom cubic Bézier. A third-party project found that Figma refuses scopes on both (figwright, pull request 261).

## Options

1. **How the agent carries the logic.**
   - The agent writes Plugin API code from instructions. Not repeatable, and not testable.
   - **Fossil generates every script.** A fixed runtime plus a spec, which the agent passes on unchanged.
2. **How a variable is matched to its token.**
   - By name. A rename in Figma or in code loses the match, and every binding with it.
   - By variable ID. IDs are file-scoped, so a duplicated file loses them, and the IDs would have to be stored somewhere.
   - **By the token path stamped on the variable**, in shared plugin data.
3. **How a retyped script or result is checked.**
   - Not at all. One wrong character in a copied value goes unnoticed.
   - A hash of the data. This misses a change to the code.
   - **A hash of the data and of the functions the script carries,** checked by the script itself through `Function.prototype.toString`. Read results carry hashes the diff checks.
4. **How much each script does.**
   - Everything in one script. A failure leaves an unknown partial state, and the script is large.
   - **Parts of 40 variables.** Each part checks everything before writing anything and changes only what differs, so it can safely be run again. A last step stamps the commit only once every variable is in place.
5. **Which tokens Figma gets.**
   - Colour, dimension, number, font weight and font family. The new motion types are two months old, and Fossil's Figma library doesn't model motion yet.
   - **Every scalar type, durations and easing included,** with whatever the motion types still need worked out as the sync is used. Composites and stroke styles stay in code.

## Decision

**Two collections.** `Primitives` has one mode, `Value`, and gives every variable empty scopes. `Semantic` has `Light` and `Dark` modes; its variables alias primitives or other semantic variables, and are scoped by token group: `color.text.*` to text fills, `space.*` to gap, `radius.*` to corner radius, and so on (`src/spec.ts`). A variable's name is its token path with slashes, such as `color/text/muted`. Its code syntax is `var(--fossil-…)`, from `tokens.json`. Shared plugin data under the `fossil` namespace stamps:

- each variable's token path (`path`);
- each collection's key (`collection`);
- the commit of the last complete apply (`commit`).

**Values.** Colours travel as hex and alpha, and compare to the 8-bit channel. Dimensions travel in px at a 16px root, and are written back in the token's own unit. Figma holds only a font stack's first name; the fallbacks stay in code. Durations travel in seconds and are written back in their own unit. Easing travels as a custom cubic Bézier; a designer who picks one of Figma's named easings is refused, because Figma doesn't document the curves behind them. Timing and easing variables have no scopes, since Figma refuses them, so primitive durations and curves stay visible in Figma's motion pickers. The sync handles sRGB colours only.

**Apply** writes the parts in order: primitives first, then semantic variables, each after anything it aliases.

- A variable stamped with a deprecated token's path, whose `replacedBy` is the new token, is renamed in place, so its ID and bindings survive.
- Deprecated tokens never reach Figma.
- A variable whose token was deleted in code is reported as an orphan, not removed.

**Read** returns pages of 40 variables. Each page carries a hash of itself, and a hash of the whole read, so a cut-off page or pages from two different reads fail the check.

**Diff** compares each variable, mode by mode, with the source at the stamped commit and with the current source:

- changed only in Figma: written to the token files;
- changed only in code: left for the next apply;
- changed in both: a conflict.

Additions, deletions, renames, detached aliases and mode changes made in Figma are refused, each with the code change it needs. Changes are formatted with Prettier and checked by the token validator before anything is written.

**Tests** run the generated scripts against a fake Figma that is as strict as Figma: types, unique names, the four-mode limit.

## Consequences

- The agent retypes each script and result. Apply parts are 11 to 22 KB, the finish step 8 KB and a read 5 KB, because each script carries only the runtime functions it calls.
- `runtime.ts` is shipped as text, so it is written in a restricted style; `packages/figma-sync/AGENTS.md` lists the rules.
- Five things only a live run can confirm:
  - that `Function.prototype.toString` in Figma's sandbox returns the source the integrity check hashes;
  - that empty scopes hide primitives while aliases to them still resolve;
  - that the `GAP` scope covers padding;
  - how large a script `use_figma` accepts;
  - that timing and easing variables accept aliases and custom curves as documented.
- Reporting the library components still bound to an orphaned variable waits for Phase 5b, which builds the library.
- The scope table follows Fossil's token groups. A fork that renames groups edits it.
- The diff needs the stamped commit in the local clone, so it asks for a `git fetch` when the commit is missing.
- `figma-sync` imports the token validator from `packages/tokens/scripts` by relative path. Both live in this repository and `figma-sync` is never published, so they always ship together.
