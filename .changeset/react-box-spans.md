---
'@fossil-design/react': patch
---

`Link` and `Tabs` render their inner spans through `Box`, so Fossil's components pass its own ESLint config. The markup gains Box's base class; nothing else changes.
