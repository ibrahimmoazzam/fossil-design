# 0003. Release with Changesets and npm trusted publishing

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Fossil's packages publish to the public npm registry, because the portfolio site installs them from a separate repository.

npm is retiring tokens that bypass two-factor authentication. Since 31 July 2026 they can't manage accounts, organisations or packages, and from January 2027 they can't publish. Trusted publishing replaces them: GitHub Actions proves its identity to npm with a short-lived OIDC token, and npm automatically attaches a provenance attestation that links each version to the workflow run that built it.

Trusted publishing can't create a package. `npm trust` needs the package to exist on the registry first ([npm/cli#8544](https://github.com/npm/cli/issues/8544)).

## Options

1. **A long-lived `NPM_TOKEN` secret.** It is being phased out, and anyone holding it can publish.
2. **Trusted publishing from a single release job.** That job installs dependencies, builds, versions and publishes, all with permission to mint an npm token.
3. **Trusted publishing with separate jobs,** as the Changesets docs recommend.

## Decision

Option 3. [Changesets](https://changesets.dev) records release notes and versions, and `.github/workflows/release.yml` runs on every push to `main`:

1. `select-mode` decides whether there is anything to version or publish.
2. `version` opens or updates a "chore: version packages" pull request.
3. `pack` builds the packages and packs them into tarballs.
4. `publish` publishes those tarballs. It is the only job with `id-token: write`, and it never runs a build.

Each package's `prepack` script runs its build, so a tarball can't contain a stale `dist/`. Every action is pinned to a commit SHA.

Each package's first version is bootstrapped by hand:

1. Publish `0.0.1` from a local machine with 2FA.
2. Link the package to the workflow with `npm trust github <package> --file release.yml --repository ibrahimmoazzam/fossil --allow-publish`.
3. Every later version, starting with `0.0.2`, goes through the workflow.

## Consequences

- The repository holds no npm secret.
- The repository must stay public for npm to generate provenance.
- GitHub Actions must be allowed to create pull requests (repository settings, Actions, General).
- Pull requests opened with the workflow's own token don't trigger other workflows, so CI doesn't run on the version pull request. If branch protection later requires CI, switch the version job to a GitHub App token.
- A fork that publishes under its own scope repeats the bootstrap. The Phase 8 adoption guide covers this.
