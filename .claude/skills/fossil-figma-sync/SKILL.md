---
name: fossil-figma-sync
description: Syncs Fossil Design's tokens with Figma variables, and builds and checks Fossil's Figma component library, through the Figma MCP server's use_figma tool. Use when asked to apply or push tokens to Figma, update Figma variables from code, pull or bring back value changes a designer made in Figma, read Figma variables, open a pull request from Figma edits, or build, update or check the component library in Figma.
compatibility: Needs the Figma MCP server with use_figma and Figma's figma-use skill (and figma-generate-library for the component library), a Full seat with edit access to the file, and git, pnpm and gh.
---

# Fossil Figma sync

Fossil's tokens live in git, in `packages/tokens/src`. This skill puts them into Figma as variables, brings back the values designers change in Figma as a pull request, and builds the component library from code. The logic is Fossil's own tested code in `packages/figma-sync`. Your job is to carry its generated scripts to Figma and its results back, unchanged, and to build each component's frames from the spec it writes.

Fossil's Figma library is two files, each published as a library (ADR 0018):

- **The foundations file:** the variables, the text and effect styles, and the icons. The sync, the styles script and the foundations check run here.
- **The components file:** the components, bound to the foundations library's variables, styles and icons. Components are built and checked here.

## Rules

- **Never write Plugin API code for variables, text styles, effect styles or icons yourself.** Those `use_figma` calls send a script that `pnpm figma:*` generated, exactly as the file holds it. Don't fix, shorten, reformat or wrap it. Each script hashes itself and refuses to run if anything changed. Only the component frames are yours to write.
- **Always include `figma-use` in `skillNames`** when calling `use_figma`, as Figma requires.
- **Ask before writing to a Figma file.** Before the first apply script, styles script or component build in a session, ask the user whether to change that file, naming it and what will change, and wait for a yes. A pasted URL isn't a yes, and permission systems such as Claude Code's auto mode look for that explicit answer. Reads need no confirmation.
- **Save read results exactly as `use_figma` returns them.** Never edit a saved result: `figma:diff` checks its hash.
- **Don't work around an error.** If a script says it was changed, generate it again and resend it exactly. An apply script that failed for another reason can be sent again, because each one only changes what differs. Otherwise stop and report the error.

## Before either direction

1. Start from an up-to-date `main`: `git switch main && git pull`.
2. `pnpm install --frozen-lockfile && pnpm build`. The sync reads `packages/tokens/dist/tokens.json`.
3. Get the URL of the file the step runs on from the user: the foundations file for the sync and the styles script, the components file for building and checking components. Its key is the part after `/design/`.

## Apply: code to Figma

In the foundations file.

1. Run `pnpm figma:apply`. It refuses if the token source has uncommitted changes, because it stamps the current commit on Figma as the base for the next diff. It writes `packages/figma-sync/.figma/apply-1.js` up to `apply-N.js`.
2. Send each script to `use_figma`, in order, waiting for each result:
   - every script but the last returns the variables it `created`, `renamed` and `updated`;
   - the last returns `commit`, `missing`, `orphans` and `unstamped`, and stamps the commit only when nothing is missing.
3. If `missing` isn't empty, a part didn't finish. Send the parts again in order, then the last script.
4. Tell the user what changed, then explain anything left over:
   - **`orphans`** are variables for tokens deleted in code. They stay in Figma until no component binds them, so nothing loses its binding. The components check, in the components file, reports each binding the spec no longer names. Update those components, publish both files, then the user can delete the variable.
   - **`unstamped`** are variables someone added in Figma. The next diff refuses them.

A second apply right after the first changes nothing. That's the check that the first one worked.

## Pull: Figma to a pull request

From the foundations file.

1. Run `pnpm figma:read`. Send `.figma/read-1.js` to `use_figma`, and write the result, exactly as returned, to `packages/figma-sync/.figma/snapshot-1.json`.
2. The result's `pages` says how many pages there are. For each further page `n`, run `pnpm figma:read n`, send `.figma/read-n.js`, and save the result to `.figma/snapshot-n.json`.
3. Run `pnpm figma:diff`. It checks every page, compares Figma with the commit the last apply stamped and with the current source, writes Figma's value changes into the token files, and writes the report to `.figma/report.md`.
   - If it says a page was cut off, doesn't match its hash, or comes from a different read, run `pnpm figma:read 1` and read every page again.
4. If it wrote no changes, tell the user what the report says and stop.
5. Otherwise, open a pull request:
   1. `git switch -c tokens/figma-$(date +%Y%m%d-%H%M)`.
   2. Write a changeset, `.changeset/figma-<same timestamp>.md`, marking `'@fossil-design/tokens': patch`. Use the report's list of changes as its text.
   3. Run `pnpm build && pnpm lint && pnpm typecheck && pnpm test`. The build updates the foundations block in `AGENTS.md`; commit it too.
   4. Commit as `feat(tokens): bring back value changes from Figma`, push, and run `gh pr create --title "Token values changed in Figma" --body-file packages/figma-sync/.figma/report.md`.
6. Tell the user about anything the report refused or marked as a conflict. Those need a change in code, and the report says which.

Once the pull request merges, apply from `main`, so Figma's stamped commit includes the change.

After an apply that changed anything, the user publishes the foundations file, and accepts the update in the components file and in design files.

## What only code can change

The diff brings back values only: a primitive's value, or which variable a semantic token aliases in each mode. It refuses everything else and says what to do instead:

| In Figma                                         | In code instead                                                                                    |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| A variable added                                 | Add the token to a token file                                                                      |
| A variable deleted                               | Delete the token; apply restores the variable until then                                           |
| A variable renamed                               | Add the new token and deprecate the old one with `replacedBy`; apply renames the variable in place |
| A semantic variable detached to a raw value      | Pick a variable for it, or change the primitive it aliases                                         |
| A primitive turned into an alias                 | Set a raw value                                                                                    |
| One of Figma's named easings                     | Set a custom cubic Bézier                                                                          |
| A mode added or renamed                          | Modes are defined in code                                                                          |
| A value changed in Figma and differently in code | Settle it in code, then apply                                                                      |

## The component library

`pnpm figma:library-spec` reads every component's variant map, JSX and CSS Module and decides everything that must be exact: names, variants, properties, and the variable or style each property uses. You turn that into frames. `pnpm figma:library-check` reads the result back and compares it with the spec.

Load Figma's `figma-generate-library` skill as well as `figma-use`, and name both in `skillNames`. Every step after the first runs on one of the two files; the step says which.

1. Run `pnpm figma:library-spec`. It writes three files to `packages/figma-sync/.figma/`:
   - `library.md`, the build sheet: for each component, its variant and component properties, then every variant's layers, with the variable or style each one binds and the raw layout values to follow;
   - `library-spec.json`, the same spec as data;
   - `styles.js`, the script for the text styles, effect styles and the icon glyph components.
2. **In the foundations file,** applied from `main` (see Apply above), send `styles.js` to `use_figma`, exactly as it is. It checks fonts and variables before it writes anything, puts the icons on the Icons page, and a second run changes nothing. Its result's `keys` gives the key of every text style, effect style and icon, by name; keep them for step 4.
3. **The user** publishes the foundations file, then turns it on as a library in the components file, from the Assets panel. The Plugin API can't turn a library on.
4. **In the components file,** build each component the sheet lists, nested components first (`Icon` before `Button`, `Figure` before `Clip`), with your own `use_figma` code:
   - Put it in a section named after it, on a page named `Components`. A component with variants is a component set with the default variant at the top left.
   - Name every layer the sheet lists exactly as written: it is the CSS class, or the state selector, it stands for, such as `tab[aria-selected='true']`.
   - Bind everything the sheet names, and nothing to a raw value: every fill, stroke, padding, gap and radius is a variable. Text uses the text style named, or each part bound when the sheet lists parts.
   - Import every variable, style and icon from the foundations library; never create one in the components file. Find a variable's key by its name with `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync` and `getVariablesInLibraryCollectionAsync`, then `figma.variables.importVariableByKeyAsync`. Import styles with `figma.importStyleByKeyAsync` and icons with `figma.importComponentByKeyAsync`, by the keys from step 2.
   - Nest the library's own components as instances, with the variants the sheet gives, never as copies.
   - Add the component properties the sheet lists, named exactly as written, and set the description it gives.
5. Check both files:
   - **In the foundations file:** run `pnpm figma:library-check foundations`, send `check-1.js` exactly as it is, save the result exactly as it comes back to `.figma/check-1.json`, and run `pnpm figma:library-check report`.
   - **In the components file:** run `pnpm figma:library-check`, or `pnpm figma:library-check Button` for one component. Send each `check-<n>.js`, save each result to `.figma/check-<n>.json`, then run `pnpm figma:library-check report`.

   Each check clears the last one's scripts, so run them one at a time. Fix what the report lists and check again until it passes.

   Several names check a group, such as `pnpm figma:library-check Card Modal Tabs`. A group keeps each script short, so a mistyped one costs less to resend.

6. **The user** publishes the components file.

After a release that changes a component, run the spec and the check again, and update only what the check reports. Update a component in place: deleting a component that others nest breaks their instances.

### Traps in the Plugin API

Each was measured live; `docs/Learnings.md` has the detail.

- A script whose text contains an `svg` tag is rewritten by `use_figma`, which breaks every Fossil script's hash. Build SVG markup at run time.
- `figma.skipInvisibleInstanceChildren` starts on, which hides what's inside a hidden instance, such as a Button's hidden icon. Turn it off before reading or changing one.
- A slot and its `SLOT` property share one name. To keep a layer name from the sheet, such as `frame`, put the slot inside that layer.
- A new slot has no auto layout. Set its `layoutMode` before a child fills it.
- For a component set with a slot, make the slot in each variant with the same property name; combining them merges the properties into one.
- Don't rename an icon's glyph instance. Left alone, it takes the name of whichever icon it's swapped to, which is how `get_design_context` reports `<CloseIcon />`.
- Setting `textCase` on a text layer detaches its text style. Case stays in code.
- A text underline's colour can bind a variable, but its paint opacity comes back as 1. Draw a dim decoration as its own layer with layer opacity, as the sheet says for `Link`.
- After changing a main component, its instances elsewhere don't show the change until the next `use_figma` call. Edit an override on them, such as a nested icon's colour, in a call of its own.
