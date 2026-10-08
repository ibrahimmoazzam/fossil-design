const colorValue = /^#([0-9a-f]{6})(?: at (\d+)%)?$/;

function swatch(value: string): string {
  const match = colorValue.exec(value);
  if (!match) return value;
  const [, hex = '', percent] = match;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const alpha = percent === undefined ? 1 : Number(percent) / 100;
  const fill = `rgb(${String(r)} ${String(g)} ${String(b)} / ${String(alpha)})`;
  // The value stays outside the HTML: Markdown inside an element starts a new block, where
  // a leading # reads as a heading.
  return `<span class="token-swatch" aria-hidden="true" style="color: ${fill}"></span> ${value}`;
}

/**
 * Puts a swatch before each value in the token reference's colour table, light and dark alike.
 * tokens.md stays plain for agents; the swatches are the site's.
 */
export function withSwatches(reference: string): string {
  let inColor = false;
  return reference
    .split('\n')
    .map((line) => {
      if (line.startsWith('## ')) inColor = line === '## color';
      if (!inColor || !line.startsWith('| `')) return line;
      return line
        .split('|')
        .map((cell, index) =>
          index === 3 || index === 4 ? ` ${swatch(cell.trim())} ` : cell,
        )
        .join('|');
    })
    .join('\n');
}
