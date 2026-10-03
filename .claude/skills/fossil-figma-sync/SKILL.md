---
name: fossil-figma-sync
description: Syncs Fossil Design's tokens with Figma variables through the Figma MCP server's use_figma tool. Use when asked to apply or push tokens to Figma, update Figma variables from code, pull or bring back value changes a designer made in Figma, read Figma variables, or open a pull request from Figma edits.
compatibility: Needs the Figma MCP server with use_figma and Figma's figma-use skill, a Full seat with edit access to the file, and git, pnpm and gh.
---

# Fossil Figma sync

Fossil's tokens live in git, in `packages/tokens/src`. This skill puts them into Figma as variables, and brings back the values designers change in Figma as a pull request. The logic is Fossil's own tested code in `packages/figma-sync`. Your job is to carry its generated scripts to Figma and its results back, unchanged.

## Rules

- **Never write Plugin API code for variables yourself.** Every `use_figma` call in this skill sends a script that `pnpm figma:*` generated, exactly as the file holds it. Don't fix, shorten, reformat or wrap it. Each script hashes itself and refuses to run if anything changed.
- **Always include `figma-use` in `skillNames`** when calling `use_figma`, as Figma requires.
- **Ask before writing to a Figma file.** Before the first apply script in a session, confirm the file (its URL) with the user, and that they want its variables changed. Reads need no confirmation.
- **Save read results exactly as `use_figma` returns them.** Never edit a saved result: `figma:diff` checks its hash.
- **Don't work around an error.** If a script says it was changed, generate it again and resend it exactly. An apply script that failed for another reason can be sent again, because each one only changes what differs. Otherwise stop and report the error.

## Before either direction

1. Start from an up-to-date `main`: `git switch main && git pull`.
2. `pnpm install --frozen-lockfile && pnpm build`. The sync reads `packages/tokens/dist/tokens.json`.
3. Get the Figma file's URL from the user. Its key is the part after `/design/`.

## Apply: code to Figma

1. Run `pnpm figma:apply`. It refuses if the token source has uncommitted changes, because it stamps the current commit on Figma as the base for the next diff. It writes `packages/figma-sync/.figma/apply-1.js` up to `apply-N.js`.
2. Send each script to `use_figma`, in order, waiting for each result:
   - every script but the last returns the variables it `created`, `renamed` and `updated`;
   - the last returns `commit`, `missing`, `orphans` and `unstamped`, and stamps the commit only when nothing is missing.
3. If `missing` isn't empty, a part didn't finish. Send the parts again in order, then the last script.
4. Tell the user what changed, then explain anything left over:
   - **`orphans`** are variables for tokens deleted in code. They stay in Figma until the Figma component library is regenerated without them, so nothing loses its binding.
   - **`unstamped`** are variables someone added in Figma. The next diff refuses them.

A second apply right after the first changes nothing. That's the check that the first one worked.

## Pull: Figma to a pull request

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
