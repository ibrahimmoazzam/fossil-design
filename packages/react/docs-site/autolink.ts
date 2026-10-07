import { adrTarget, codeTarget, textLinks, type Target } from './links.ts';
import { decisionRecords } from './pages.ts';

const adrAnchors: Record<string, string> = Object.fromEntries(
  decisionRecords.map(({ path, anchor }) => [
    /\d{4}/.exec(path)?.[0] ?? '',
    anchor,
  ]),
);

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

const terms = Object.keys(textLinks)
  .sort((a, b) => b.length - a.length)
  .map(escape)
  .join('|');

// A known name standing alone, or "ADR 0013" and "ADRs 0016 and 0017".
const textPattern = new RegExp(
  `(?<![\\w@/.-])(${terms})(?![\\w/-])|\\b(ADRs?) (\\d{4}(?:(?:,? and|,) \\d{4})*)`,
  'g',
);

// Spans whose text must stay as it is: links, images, HTML, bare URLs and inline code.
const protectedPattern =
  /(!?\[[^\]]*\]\([^)]*\)|<[^>]+>|https?:\/\/[^\s)]+|`[^`\n]+`)/g;

/**
 * Turns the first mention of each known name in a section into a link: components, files,
 * packages, repositories, tokens, ADRs and tools. Headings, code blocks and existing links
 * stay as they are, and nothing links to the page it's on, except an ADR's place on it.
 */
export function autolink(markdown: string, currentPage?: string): string {
  const linked = new Set<string>();
  const take = (key: string, target: Target | undefined): target is Target => {
    if (!target || linked.has(key)) return false;
    const samePage = target.page !== undefined && target.page === currentPage;
    if (samePage && !key.startsWith('adr:')) return false;
    linked.add(key);
    return true;
  };

  const linkText = (text: string) =>
    text.replace(
      textPattern,
      (match, term?: string, adrWord?: string, numbers?: string) => {
        if (term !== undefined) {
          const href = textLinks[term];
          const target = href === undefined ? undefined : { href };
          return take(`href:${target?.href ?? term}`, target)
            ? `[${term}](${target.href})`
            : match;
        }
        if (adrWord === undefined || numbers === undefined) return match;
        const parts = numbers.split(/(\d{4})/);
        if (parts.length === 3) {
          const target = adrTarget(numbers, adrAnchors);
          return take(`adr:${numbers}`, target)
            ? `[${match}](${target.href})`
            : match;
        }
        const linkedNumbers = parts
          .map((part) => {
            if (!/^\d{4}$/.test(part)) return part;
            const target = adrTarget(part, adrAnchors);
            return take(`adr:${part}`, target)
              ? `[${part}](${target.href})`
              : part;
          })
          .join('');
        return `${adrWord} ${linkedNumbers}`;
      },
    );

  const linkLine = (line: string) =>
    line
      .split(protectedPattern)
      .map((segment, index) => {
        if (index % 2 === 0) return linkText(segment);
        if (!segment.startsWith('`')) return segment;
        const term = segment.slice(1, -1);
        const target = codeTarget(term);
        return take(`href:${target?.href ?? term}`, target)
          ? `[${segment}](${target.href})`
          : segment;
      })
      .join('');

  let fenced = false;
  return markdown
    .split('\n')
    .map((line) => {
      if (/^\s*```/.test(line)) {
        fenced = !fenced;
        return line;
      }
      if (fenced) return line;
      if (/^#{1,6} /.test(line)) {
        linked.clear();
        return line;
      }
      return linkLine(line);
    })
    .join('\n');
}
