# Architecture decision records

Each record states the context, the options considered, the decision and its consequences. Number new records in sequence. To change an accepted decision, write a new record that supersedes it and mark the old one as superseded, rather than rewriting it.

| Record                                                | Decision                                                  | Status                              |
| ----------------------------------------------------- | --------------------------------------------------------- | ----------------------------------- |
| [0001](./0001-monorepo.md)                            | One monorepo with pnpm workspaces                         | Accepted                            |
| [0002](./0002-typescript-6.md)                        | Pin TypeScript to 6.0                                     | Accepted                            |
| [0003](./0003-release-pipeline.md)                    | Release with Changesets and npm trusted publishing        | Accepted, partly superseded by 0004 |
| [0004](./0004-protect-main.md)                        | Protect main, and approve CI on the version pull request  | Accepted                            |
| [0005](./0005-token-taxonomy.md)                      | Token taxonomy, modes and validation                      | Accepted, partly superseded by 0013 |
| [0006](./0006-token-build-outputs.md)                 | Token build outputs                                       | Accepted                            |
| [0007](./0007-figma-sync.md)                          | The Figma sync                                            | Accepted                            |
| [0008](./0008-stylelint-config.md)                    | The shared Stylelint config                               | Accepted                            |
| [0009](./0009-component-package.md)                   | The component package                                     | Accepted, partly superseded by 0013 |
| [0010](./0010-content-components.md)                  | Content components: icons, element substitution and media | Accepted                            |
| [0011](./0011-interactive-components.md)              | Interactive components: motion and extension points       | Accepted                            |
| [0012](./0012-smoke-test.md)                          | The consumption smoke test                                | Accepted                            |
| [0013](./0013-base-primitives.md)                     | Primitive tokens live under `base`                        | Accepted                            |
| [0014](./0014-enforcement.md)                         | The ESLint config, the escape count and the gap log       | Accepted                            |
| [0015](./0015-figma-component-library.md)             | The Figma component library                               | Accepted, partly superseded by 0018 |
| [0016](./0016-bundled-agent-docs.md)                  | Agent docs bundled in the component package               | Accepted                            |
| [0017](./0017-agents-md-block-and-make-guidelines.md) | The AGENTS.md block and the Make guidelines               | Accepted                            |
| [0018](./0018-figma-foundations-and-components.md)    | Two Figma libraries: foundations and components           | Accepted                            |
