# 0018. Two Figma libraries: foundations and components

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

[0015](./0015-figma-component-library.md) put the whole Figma library in one file: the variables, the text and effect styles, the icons and the components. A team can only turn that file on or off as a whole. Phase 6 splits it, so a fork that brings its own brand replaces the foundations and keeps the components, and a team that builds its components in another UI library replaces the components and keeps the foundations ([`PRD.md`](../PRD.md), Phase 6, task 9).

The PRD asked for the split to be verified on scratch files before anything changed. Measured on 7 October 2026, on the Education team ([`Learnings.md`](../Learnings.md), section 5):

- A "can edit" member can publish a library from a file in the team's project.
- The Plugin API can't turn a library on in a file. Once a person has, `figma.teamLibrary` lists its variables by name and key, and `importVariableByKeyAsync` imports each one.
- A variable imported from a library keeps its shared plugin data, so Fossil's stamp, as well as its name, its code syntax and its scopes. Its collection keeps the stamped commit. Styles and components imported by key keep their stamps too.
- A component bound to imported variables keeps every binding after both files are published, and after a value changes in the foundations and the update is accepted in the components file.
- `get_design_context` reports imported variables as `var(--fossil-…)`, and a standalone `Icon` whose glyph comes from the library as `<CloseIcon />`, as in Phase 5b.
- A file with only the foundations library turned on, and no variables of its own, binds a fill to `color/background/surface`.

## Options

1. **How the components file reaches the foundations.**
   - Copies of the variables and styles, kept in step by running the apply on both files. Two sources of truth, and every binding would point at a copy.
   - **The foundations file published as a library, and its variables, styles and icons imported by key.** One source of truth. Accepting a library update reaches every component.
2. **How the check reads a binding.**
   - By the variable's name. Names change when a token is renamed, and the check would need the name map from the spec.
   - **By the stamp, as before, found through the variable's or style's id.** An imported variable keeps its stamp, so the spec and the check still name tokens by path. Only the lookup changes: by id, for the file's own and imported ones alike, rather than from the file's own list.
3. **How the components file gets the keys of styles and icons.** The Plugin API lists a library's variables but not its styles or components.
   - A script that reads them from the foundations file. One more script to carry.
   - **The styles script returns them.** It already runs in the foundations file, and a second run changes nothing, so running it again is how to read them.
4. **What the check covers.**
   - One check that looks at whatever the file holds. A components file with a missing library and a foundations file without components would read the same.
   - **Two targets.** `pnpm figma:library-check foundations` checks the foundations file's styles and icons. `pnpm figma:library-check`, with or without component names, checks the components file's components.

## Decision

Fossil's Figma library is two files, each published as a library and neither one designed in:

- **Foundations:** the variables, which `figma:apply` writes and `figma:read` reads, with the stamped commit; the text and effect styles and the icon glyphs, which the styles script writes on an **Icons** page, stamped `icons`.
- **Components:** the component sets and components on a page named **Components**, a section per component. It has no variables, styles or icons of its own. The build sheet says to turn the foundations library on, import variables by key through `figma.teamLibrary`, and import styles and icons by the keys the styles script returns.

The check finds every variable and style a component uses by id, whether the file's own or imported, and compares its stamp with the spec. The foundations target checks that every text style, effect style and icon is there.

The apply's finishing script no longer looks for library components that still bind an orphaned variable, as 0015 had it do: the foundations file has none. The components check reports any binding the spec no longer names, orphans included.

## Consequences

- A design file turns on the foundations library to use Fossil's variables and styles without its components, or both libraries to design with Fossil's components.
- A fork that changes its brand replaces only the foundations file; the components follow when it publishes and they accept the update. A team that swaps the components keeps the foundations file and its sync.
- The order of first setup is fixed: the apply and the styles script in the foundations file, publish it, turn it on in the components file, build the components, publish them.
- Turning a library on is a step only a person can do, in the Assets panel.
- A component deleted and rebuilt in the components file loses its instances in design files, as before; update components in place.
- The Phase 5b scratch file keeps the one-file layout. The real files start as two.
