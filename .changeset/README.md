# Changesets

Each Markdown file here records a change to a published package: which packages it touches, the semver bump, and a line for the changelog. Add one with `pnpm changeset` in any pull request that changes a package's public surface.

On `main`, the release workflow turns pending changesets into a "Version Packages" pull request. Merging that pull request publishes the new versions to npm through trusted publishing. See the [Changesets docs](https://changesets.dev) for the file format.
