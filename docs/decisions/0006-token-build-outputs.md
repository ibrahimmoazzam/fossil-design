# 0006. Token build outputs

- **Status:** Accepted
- **Date:** 2026-10-03

## Context

Phase 2 of the PRD turns the token source ([0005](./0005-token-taxonomy.md)) into everything the rest of Fossil reads, in one validated Style Dictionary run: `tokens.css`, `tokens.json`, key unions for typed props, breakpoints, lists for the Stylelint config, and the foundations in `AGENTS.md`.

The dry run had already found four gaps in Style Dictionary 5.5.5: durations print as `[object Object]`, name collisions only warn, references inside `$extensions` are resolved, and typography becomes a `font` shorthand that drops letter-spacing. Reading its source and building the real tokens found three more:

- **`outputReferences` corrupts composites.** For an object value it replaces each referenced token's resolved value inside the transformed string. Two parts with the same value can swap names, and one value inside another breaks the CSS: a shadow with a `5rem` blur and a `0.25rem` offset came out as `0.2var(--fossil-space-1000) 5rem`, with no warning.
- **`expand` drops aliases.** It resolves references to object values before splitting a typography token, so the font family, size and letter-spacing parts become literals. An app that points `font.family.heading` at its own face, as the portfolio does with Roobert, would see no text style change.
- **No transform converts DTCG font weight names** such as `semi-bold`, which the validator accepts and CSS doesn't.

## Options

1. **References in `tokens.css`.**
   - Style Dictionary's `outputReferences`. Wrong for composites, and it can't see the aliases that `expand` and `$extensions` resolution remove.
   - Split every composite into scalars, so only string values carry references. Every border and shadow in a component would then need three to five custom properties.
   - **Fossil's CSS format writes them** from the validated source, part by part, using Style Dictionary's names.
2. **Generated TypeScript.**
   - Emit `.js` and `.d.ts` straight from Style Dictionary.
   - **Generate `.ts` into `src/generated/`** (ignored by git), and compile it with the rest of the package, so the compiler checks it and writes matching declarations.
3. **Foundations in `AGENTS.md`.**
   - A separate generated file that `AGENTS.md` links to. An agent would have to choose to open it, which is the retrieval the PRD rules out for foundations.
   - **A block between markers in `AGENTS.md`,** rewritten by the build and committed.

## Decision

**One run, checked before writing.** The build validates the source first. It then runs Style Dictionary once, with one platform and `log.warnings: 'error'`, and renders every output in memory with `formatPlatform`. Only when every output passes does it clear `dist/` and `src/generated/` and write. A failure writes nothing.

**Style Dictionary names and converts; the source supplies the structure.** Style Dictionary names every custom property with `name/kebab` and the prefix from `fossil.config.json`, including the parts of each text style, which its `expand` splits. It converts literal values with its own transforms and two of Fossil's: DTCG durations (`150ms`) and font weight names (`600`). Fossil's formats match each Style Dictionary token to the validated source token it came from. References, dark values and lifecycle fields come from that source, not from `token.original`, which `expand` has already resolved.

**`tokens.css`.**

- Every token goes under `:root`, in source order, with its description as a comment.
- An alias is `var()` of the token it references. A semantic border or shadow is written in shorthand order with one `var()` per part, and a text style is five properties.
- Dark values go in the two identical blocks the PRD specifies, each setting `color-scheme: dark`.

The build fails, naming the tokens, when:

- two tokens produce the same custom property. Style Dictionary would also fail with `log.warnings: 'error'`, but its message names neither token unless logging is verbose, and it ends "Ignore this warning if intentional";
- a declared value is empty or contains `[object Object]`, `undefined` or `NaN`.

**`tokens.json`** maps each token path to its tier, type, custom property (one per part for a text style), DTCG value with references resolved, `aliasOf` (a path, or a path per part), dark value and alias, description, and deprecation fields. The package exports its type as `TokensFile`.

**`lint.json`** lists every custom property of a primitive token, and each deprecated custom property with its replacement and reason.

**`tokens.ts`** exports `tokenKeys`: each semantic group (a path without its last segment) and its keys, with deprecated tokens left out. `TokenKey<'space'>` is the union of spacing keys.

**`breakpoints.ts`** exports the `breakpoint` group's widths and a `min-width` media query for each.

**The foundations block** in the root `AGENTS.md` sits between `<!-- fossil:foundations:start -->` and `<!-- fossil:foundations:end -->`, inside a Prettier ignore range. It holds the spacing scale (the `space` group), the type scale (every typography token), the semantic colours with their descriptions, the names of the other semantic tokens, and the padding-and-`gap` rule. CI runs `git diff --exit-code` after the build, so a token change can't land without its regenerated block.

## Consequences

- Fossil owns the code that writes CSS references, in `packages/tokens/scripts/formats.ts`, and doesn't use `outputReferences`. A regression test builds the shadow that Style Dictionary corrupts.
- References inside composites are supported for borders, shadows and text styles. A new composite type needs its shorthand order added; until then the build fails and names the token.
- The build uses two group names: `breakpoint` for `breakpoints.ts` and `space` for the spacing scale. A fork that renames either updates the build.
- The shapes of `tokens.json` and `lint.json` are now public API of `@fossil-design/tokens`, which can still change in `0.x`.
- The token build writes outside its package, to the root `AGENTS.md`. A token change therefore shows two diffs: the token file and the block.
- The package exports `.`, `./tokens.css`, `./tokens.json` and `./lint.json`, and declares `sideEffects: ["*.css"]` so bundlers keep the stylesheet import.
- Each export that isn't TypeScript has a generated declaration. TypeScript 6 checks side-effect imports, so `tokens.css` gets an empty one. The JSON files are typed as `TokensFile` and `LintLists` rather than inferred, in `.d.cts` files with `export =`, because TypeScript treats a JSON module as CommonJS. A scratch consumer on TypeScript 6 type-checks all three under `nodenext`, `bundler` and `preserve`, and attw (`--profile esm-only`) and publint pass on the packed tarball.
- The block gives sizes in px at a 16px root, for reading; the tokens themselves stay in rem.
