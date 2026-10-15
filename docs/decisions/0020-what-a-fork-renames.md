# 0020. What a fork renames, and what keeps Fossil's name

- **Status:** Accepted
- **Date:** 2026-10-13
- **Refines:** [0019](./0019-renaming-a-fork.md), which made the rename mechanical

## Context

[0019](./0019-renaming-a-fork.md) gave a fork one command for its name, CSS prefix, npm scope and repository. The fresh-fork test ([`fork-test.md`](../fork-test.md), issues 4, 5, 8 and 11) showed that the mechanics are only half the question. A renamed copy still named Fossil 171 times across 73 files, and the adoption guide's list of seven things to rewrite left 117 of them.

Those mentions are not one kind of thing:

- Some are prose a fork must own. Its README, its docs site, its agent files, and the refusals its designers read during a sync. `library/components.ts` set `Box`'s description in Figma to "a frame bound to Fossil's variables", which every designer using the fork's library would read.
- Some identify Fossil's own formats. The `fossil` namespace stamped on a Figma variable, the `fossil:` discriminator on a script's result, the vendor key in a token file. A fork that rewrote these would still work on its own, but an upstream fix, a generated script and a Figma file written by either would stop fitting together.
- Rewriting the first kind without deciding the second broke the suite: `library.test.ts` and `sync.test.ts` assert those messages as literal strings, so a fork following the guide's own `git grep Fossil` got a red suite with no explanation.

A third name arrives when a fork rebuilds a component on a headless library, which [key decision 7](../key-decisions.md) leaves open. Nothing said where that library may be named.

An earlier draft of this record put the config file's name and the lint configs' factory in the second group, on the grounds that they name Fossil's tooling rather than its brand, the way `tsconfig.json` names TypeScript. That analogy does not hold: a fork does not use Fossil as a tool, it is a renamed copy that owns the code, so nothing of Fossil's is left for the name to refer to.

## Options

1. **Rename everything that says Fossil.** Simple to describe, and it breaks the stamp, the script format, the vendor key and the skill, so upstream fixes stop applying and a sync can no longer recognise what it wrote.
2. **Rename nothing beyond 0019's mechanics.** No code to write, and a fork's designers and agents read another system's name inside their own tools.
3. **Split by what the name is doing in the sentence.** More to explain, and each string has an owner.

## Decision

Option 3. There are three kinds of name, and each has one rule.

**1. The system's name comes from `brand.config.json`.** Any prose a person or an agent reads: the docs, page titles, the `AGENTS.md` block, the Make guidelines, the sync's refusals and reports, and the Figma component descriptions. Code reads `config.name` rather than spelling it out, and a test that covers such a message asserts against the same config, so a fork's suite passes unchanged. A test may not assert a system name as a literal.

**2. Only the vendor key stays literal.** `com.ibrahimmoazzam.fossil`, the key under `$extensions` in every token file, names the author of the extension schema rather than the system using it, which is what a reverse-DNS key is for. A fork's token files use Fossil's schema unchanged, and templating the key by prefix would give `com.ibrahimmoazzam.acme`, keeping one system's domain while changing the other's name. It would need a vendor domain in `brand.config.json` to do properly, and it does not earn one.

**The Figma stamp follows the brand too, once the sync has been verified against a real file.** The `fossil` namespace stamped on every variable, and the `fossil:` tag on a script's result, are data a fork's own Figma file carries, so they belong to the brand. Threading the prefix there is 37 call sites across both runtimes, five spec types and the hashed script payload, so it waits until a fork's library has been built once, to keep a failure in that build unambiguous. Fossil's own value is `fossil` either way, so nothing of Fossil's migrates when it lands — but a fork that has already built its library does have something to migrate, which the first run of this found and [`fork-test.md`](../fork-test.md) issue 31 records.

**Everything else is the brand's.** A filename or a symbol inside the fork's own code exchanges nothing with Fossil, so it has no reason to carry Fossil's name, and the most visible leftover sat at the top of the file tree. The config file is `brand.config.json`, and both lint configs export `brand()` with its `BrandOptions` type, which is what an adopting app writes in its own `eslint.config.js`. `AGENTS.md`'s `fossil:foundations` markers are local in the same way, and the token build names them after the prefix, so `pnpm rename` rewrites them: the build refuses a file whose markers it cannot find, which is a fork's first build rather than a cosmetic leftover. The `fossil-figma-sync` skill's folder stays for now, because nothing reads it from outside and renaming it buys little.

**3. An implementation's name appears only where the implementation is the subject.** A headless library a fork rebuilds a component on belongs in that component's JSDoc contract, so an agent knows which behaviour comes from where, and in the package's dependencies. It does not belong in the tokens, the Figma library, the lint configs or the sync, because none of them can tell what a component is built on: props, token usage and the generated Figma component are the same either way.

**Where the code runs decides how it reads the name.** Code that runs locally imports the config. Code that is sent to Figma cannot: `script()` embeds the runtime functions' source text and hashes it, so a name would have to travel inside the spec and be hashed with it. Those messages were rephrased instead, because they never meant the brand. "No Fossil text style" meant "no text style from the library", and "stamped as Fossil's Semantic collection" meant "carries the Semantic stamp".

## Consequences

- A fork's designers read their own system's name in the sync's refusals, the library check's report and the Figma component descriptions, from one commit, with no strings to maintain by hand.
- The adoption guide's step 1.4 becomes a checklist grouped by these three kinds, rather than a list of seven files and a `git grep`. A grep cannot find positioning prose that never names Fossil, which is what issue 5 records.
- A fork that swaps in a headless library renames nothing. Its tokens, Figma library, lint configs and agent docs are untouched, which is what makes the swap cheap.
- A fork whose Figma library predates the templated stamp needs a one-off re-stamp before its next apply, which is `pnpm figma:restamp <old namespace>`. Without one the apply does not fail: it creates a second set of collections and variables under the new namespace and reports nothing wrong, because the clash check looks only inside the collection it just made. The stamp is data in a live file, so changing it is a migration, which is the test this record sets for the second kind of name, and the migration step is what makes it pass.
- Adding a user-visible string to `figma-sync` now carries a question: which kind of name does it hold? A string that runs inside Figma and wants the system's name has to come through the spec, so prefer wording that names the library or the sync.
- Renaming `fossil()` to `brand()` changes the public surface of both lint configs, so it takes a changeset and a minor bump. At `0.x` that costs a line in a changelog; after `1.0.0` it would cost a major version, which is why it happens now.
- Fossil's own published packages keep saying Fossil, because its config says so. Nothing else about this decision is visible until a copy is renamed.
