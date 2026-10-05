# 0004. Protect main, and approve CI on the version pull request

- **Status:** Accepted
- **Date:** 2026-10-02
- **Supersedes:** the note in [0003](./0003-release-pipeline.md) about CI on the version pull request

## Context

Every push to `main` runs the release workflow ([0003](./0003-release-pipeline.md)), so whatever lands on `main` can publish to npm. Nothing stopped a direct push, a force push or a merge with failing CI. Phase 1 of the PRD also makes the token build a required check.

0003 expected required CI to block the version pull request. The release workflow opens it with its own `GITHUB_TOKEN`, and events from that token didn't start other workflows, so 0003 planned to switch to a GitHub App token once CI was required. Since 11 June 2026, GitHub instead creates those runs in an approval-required state, and anyone with write access can start them ([changelog](https://github.blog/changelog/2026-06-11-bot-created-pull-requests-can-run-workflows-if-approved/)). The `0.0.2` version pull request ran CI this way before it merged.

## Options

1. **No protection.** One mistaken push to `main` publishes.
2. **Require CI, with a GitHub App token for the version job.** CI starts by itself on the version pull request. The repository stores the App's private key, which doesn't expire. The version job needs write access to contents and pull requests, which is enough to merge a pull request, and a merge to `main` publishes. Each fork creates its own App.
3. **Require CI, and approve the version pull request's run by hand.** No secret and no setup, for one click per release.

## Decision

Option 3. A repository ruleset, "Protect main", targets the default branch, with an empty bypass list. It:

- restricts deletions and blocks force pushes;
- requires a pull request, with 0 approvals, so a sole maintainer can merge their own;
- requires the status checks `Check on Node 22.14.0` and `Check on Node 24`;
- since Phase 4, also requires `Smoke-test the packed packages` ([0012](./0012-smoke-test.md)).

To release, open the "chore: version packages" pull request, choose "Approve workflows to run" on its latest run, wait for every required check to pass, then merge. The pull request updates each time a changeset lands, and runs on its earlier commits can be ignored.

## Consequences

- The repository still holds no long-lived credential that can publish.
- Every release needs a maintainer with write access to approve one run. Merge stays blocked until the required checks pass, so the step can't be skipped.
- Required checks match by name. Changing the Node versions in the matrix in `ci.yml`, or a job's `name`, renames the checks, so update the ruleset in the same change, or pull requests wait for checks that never report.
- Rulesets live in the repository's settings, not in git, so a fork recreates "Protect main" by hand. The Phase 8 adoption guide should include it.
- If approving becomes a burden, revisit option 2.
