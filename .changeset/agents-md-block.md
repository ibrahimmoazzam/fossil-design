---
'@fossil-design/react': minor
---

A `fossil-agents-md` bin writes Fossil's rules, the token scales, the components and the paths to their docs into your app's `AGENTS.md`, between `<!-- BEGIN:fossil-design-agent-rules -->` and `<!-- END:fossil-design-agent-rules -->`, and adds `@AGENTS.md` to `CLAUDE.md` if you have one. Run it again after upgrading; it replaces only the block. `--check` changes nothing and fails when the block is out of date, for CI.

Figma Make guidelines ship in `guidelines/`: a Make file's own `guidelines/Guidelines.md` can be one line, `Read node_modules/@fossil-design/react/guidelines/Guidelines.md before writing any code, and follow it.` They set up the stylesheet, the fonts and the page's background, tell Make not to use its scaffold's Tailwind classes, and route it through the docs.

The rules in `docs/foundations.md` add two points: no utility classes from Tailwind or any other framework, and how to make grid columns change per breakpoint. `Box`'s grid example now uses `minmax(min(100%, 14rem), 1fr)`, so a single column never overflows a narrow screen.
