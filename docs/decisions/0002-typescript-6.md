# 0002. Pin TypeScript to 6.0

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

TypeScript 7.0.2, published in July 2026, is the native compiler and is now the `latest` version on npm. Its package's main entry exports only `version`. There is no compiler API.

Fossil's toolchain imports that API by name:

- `typescript-eslint` 8.71 declares a peer range of `typescript >=4.8.4 <6.1.0`;
- `react-docgen-typescript` reads component props in Phase 6;
- declaration tooling in the Phase 4 build.

## Options

1. **TypeScript 7.** `pnpm lint` fails on its first run.
2. **The `@typescript/typescript6` alias.** Tools import `typescript` by name, so they would not find it.
3. **TypeScript `~6.0.3`.**

## Decision

Option 3. The version is set once, in the pnpm catalog in `pnpm-workspace.yaml`, and every package refers to it with `catalog:`.

All packages extend `tsconfig.base.json`. It sets strict mode and the module options explicitly, so behaviour doesn't depend on TypeScript 6's changed defaults. It also adds `noUncheckedIndexedAccess`, `verbatimModuleSyntax` and `erasableSyntaxOnly`. The target and library stop at ES2024, the newest that Node 22, Fossil's oldest supported runtime, fully implements. For the same reason, `@types/node` follows Node 22.

## Consequences

- Revisit when `typescript-eslint` and `react-docgen-typescript` support TypeScript 7.
- Automated dependency updates must skip TypeScript major versions until then.
- TypeScript 6 includes no `@types` packages by default, so any config that needs Node's globals lists `"types": ["node"]`.
