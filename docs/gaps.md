# Gaps

A gap records a place where Fossil fell short: an app couldn't build something from Fossil, rebuilt something Fossil might need, or added a lint escape. Gaps are how a composition becomes a pattern or a component ([`PRD.md`](./PRD.md), Phase 5, and [ADR 0014](./decisions/0014-enforcement.md)).

## Logging one

Open an issue from the [gap form](https://github.com/ibrahimmoazzam/fossil-design/issues/new?template=gap.yml). It asks for four things: where it came up, what the task needed, what Fossil offered, and the evidence. Describe the need, not the solution. The form adds the `gap` label.

Log one whenever:

- an agent or a person can't build something from Fossil's components and tokens;
- an app rebuilds something that looks generic;
- an app adds a disable comment for one of Fossil's rules. The `Count lint escapes` job lists each one a pull request adds, with its reason.

## Reviewing

Review every open gap before merging a version pull request. Three gaps for the same need, or three escapes from one rule, call for a review sooner; they don't promote anything by themselves.

With one consumer, "several teams need it" can't be the test. Ask instead:

- **Does it repeat inside the app?** Count the places, not the requests.
- **Is it generic?** It carries no app-specific content or branding.

## Recording the decision

Close each gap with one of three labels and a comment giving the reason:

| Label                  | Outcome                                                                                                                                                                                  | Close as    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `decision: component`  | Add it to Fossil with its variants, a story, tests, and "when to use" and "when not to use" docs. Link the pull request. The Figma library and the Make guidelines pick it up on release | Completed   |
| `decision: pattern`    | Document how to build it from existing components, with no new code. Link the docs                                                                                                       | Completed   |
| `decision: keep local` | It stays a composition in the app. Say why, so the next gap for the same need starts from the reason                                                                                     | Not planned |

The comment follows this shape:

```md
**Decision:** keep local
**Why:** only the portfolio's case-study pages use it, and its layout depends on their content.
**Related:** #12, #15
```
