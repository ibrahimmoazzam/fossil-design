# Architecture decision records

Each record states the context, the options considered, the decision and its consequences. Number new records in sequence. To change an accepted decision, write a new record that supersedes it and mark the old one as superseded, rather than rewriting it.

| Record                                | Decision                                                 | Status                              |
| ------------------------------------- | -------------------------------------------------------- | ----------------------------------- |
| [0001](./0001-monorepo.md)            | One monorepo with pnpm workspaces                        | Accepted                            |
| [0002](./0002-typescript-6.md)        | Pin TypeScript to 6.0                                    | Accepted                            |
| [0003](./0003-release-pipeline.md)    | Release with Changesets and npm trusted publishing       | Accepted, partly superseded by 0004 |
| [0004](./0004-protect-main.md)        | Protect main, and approve CI on the version pull request | Accepted                            |
| [0005](./0005-token-taxonomy.md)      | Token taxonomy, modes and validation                     | Accepted                            |
| [0006](./0006-token-build-outputs.md) | Token build outputs                                      | Accepted                            |
