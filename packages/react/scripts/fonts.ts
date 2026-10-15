// Checks that a stylesheet loads the faces the text styles actually use. The families and
// weights come from the built tokens, so a rebrand can't leave a font list behind: it was the
// Make guidelines and the docs site's own two head files that silently kept loading the
// reference brand's faces, in weights its headings had moved off.

/** A typography token's resolved value, as `tokens.json` records it. */
interface TypographyValue {
  fontFamily?: unknown;
  fontWeight?: unknown;
}

export interface TokensFile {
  tokens: Record<string, { tier: string; type?: string; value?: unknown }>;
}

/** Each family the text styles name, with every weight they set on it. */
export function requiredFonts(file: TokensFile): Map<string, Set<number>> {
  const required = new Map<string, Set<number>>();
  for (const [, token] of Object.entries(file.tokens)) {
    if (token.tier !== 'semantic' || token.type !== 'typography') continue;
    const { fontFamily, fontWeight } = (token.value ?? {}) as TypographyValue;
    const family = Array.isArray(fontFamily) ? String(fontFamily[0]) : '';
    if (family === '' || typeof fontWeight !== 'number') continue;
    const weights = required.get(family) ?? new Set<number>();
    weights.add(fontWeight);
    required.set(family, weights);
  }
  return required;
}

/** The weights a Google Fonts URL loads, by family. A family with no `wght` loads its default. */
export function loadedFonts(css: string): Map<string, Set<number>> {
  const loaded = new Map<string, Set<number>>();
  for (const [, segment] of css.matchAll(/(?:^|[?&])family=([^&'")\s]+)/g)) {
    const [name = '', axes] = (segment ?? '').split(':');
    const family = decodeURIComponent(name).replaceAll('+', ' ');
    const weights = new Set<number>();
    // Only `wght` matters here. An axis range, `wght@300..700`, covers everything between.
    const wght = /(?:^|,)wght@([\d.;,]+)/.exec(axes ?? '')?.[1];
    for (const value of wght?.split(';') ?? []) {
      const [from, to] = value.split('..').map(Number);
      if (from === undefined || Number.isNaN(from)) continue;
      if (to === undefined || Number.isNaN(to)) weights.add(from);
      else for (let w = from; w <= to; w += 100) weights.add(w);
    }
    loaded.set(family, new Set([...(loaded.get(family) ?? []), ...weights]));
  }
  return loaded;
}

/**
 * What `css` fails to load of what the text styles use, as one line each. Extra weights are
 * fine: a weight no text style names is still reachable through the font.weight tokens, and
 * `<strong>` in running text asks the browser for bold.
 */
export function missingFonts(css: string, file: TokensFile): string[] {
  const loaded = loadedFonts(css);
  const problems: string[] = [];
  for (const [family, weights] of requiredFonts(file)) {
    const have = loaded.get(family);
    if (!have) {
      problems.push(`doesn't load ${family}, which the text styles use`);
      continue;
    }
    const missing = [...weights].filter((w) => !have.has(w)).sort();
    if (missing.length > 0)
      problems.push(
        `loads ${family} without weight ${missing.join(' and ')}, which the text styles set`,
      );
  }
  return problems;
}
