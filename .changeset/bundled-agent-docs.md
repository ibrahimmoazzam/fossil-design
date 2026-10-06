---
'@fossil-design/react': minor
---

Docs for agents ship inside the package, in `docs/`, so they always match the installed version: an index, the foundations (the rules, escape hatches, gap logging and token scales), a token reference, and one file per component with its contract, props, variants and examples taken from its stories. `components.json` and `tokens.json` hold the same as JSON. Each component's JSDoc now carries that contract (when to use it, when not to, its states, and what it does for accessibility and what the app must do), so editors and Storybook show it too.
