import type { ReadPage, ReadVariable } from './runtime.ts';
import { hash } from './scripts.ts';

/** Everything the read scripts returned, checked. */
export interface Snapshot {
  /** The commit the last complete apply stamped, or '' if none has finished. */
  commit: string;
  collections: ReadPage['collections'];
  variables: ReadVariable[];
}

/** A snapshot that can't be trusted. Each problem says what to do. */
export class SnapshotError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(problems.join('\n'));
    this.name = 'SnapshotError';
    this.problems = problems;
  }
}

const isPage = (value: unknown): value is ReadPage =>
  typeof value === 'object' &&
  value !== null &&
  (value as { fossil?: unknown }).fossil === 'read';

/**
 * Joins the saved results of the read scripts, after checking each one's hash. A result cut off
 * by use_figma's response limit, or changed while it was copied, fails the check.
 */
export function readSnapshot(
  files: readonly { name: string; text: string }[],
): Snapshot {
  const problems: string[] = [];
  const pages = new Map<number, ReadPage>();
  for (const { name, text } of files) {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      problems.push(
        `${name} isn't complete JSON, so the result was probably cut off or copied wrongly. Run its read script again and save the whole result.`,
      );
      continue;
    }
    if (!isPage(value)) {
      problems.push(`${name} isn't a Fossil read result.`);
      continue;
    }
    const { page, pages: count, whole, commit, collections, variables } = value;
    if (
      hash(
        JSON.stringify({
          page,
          pages: count,
          whole,
          commit,
          collections,
          variables,
        }),
      ) !== value.hash
    ) {
      problems.push(
        `${name} doesn't match its hash, so it changed after Figma returned it. Run read script ${String(page)} again and save the result exactly as it is.`,
      );
      continue;
    }
    pages.set(page, value);
  }

  const first = pages.get(1);
  if (problems.length === 0 && first === undefined)
    problems.push('There is no page 1. Run pnpm figma:read 1 first.');
  if (first !== undefined) {
    for (let page = 1; page <= first.pages; page++)
      if (!pages.has(page))
        problems.push(
          `Page ${String(page)} of ${String(first.pages)} is missing. Run pnpm figma:read ${String(page)} and save its result.`,
        );
    const variables = [...pages.values()]
      .sort((a, b) => a.page - b.page)
      .flatMap((p) => p.variables);
    if (
      problems.length === 0 &&
      ([...pages.values()].some((p) => p.whole !== first.whole) ||
        hash(JSON.stringify(variables)) !== first.whole)
    )
      problems.push(
        'The pages come from different reads: Figma changed in between. Run pnpm figma:read 1 and read every page again.',
      );
    if (problems.length === 0)
      return {
        commit: first.commit,
        collections: first.collections,
        variables,
      };
  }
  throw new SnapshotError(problems);
}
