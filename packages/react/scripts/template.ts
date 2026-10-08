/** Fills `{{name}}` placeholders, and fails on one it doesn't know. */
export function fill(
  text: string,
  values: Readonly<Record<string, string>>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    const value = values[key];
    if (value === undefined)
      throw new Error(`The text has an unknown placeholder ${match}`);
    return value;
  });
}

/** Items joined as prose: `a`, `a and b`, `a, b and c`. */
export const list = (items: readonly string[]): string =>
  items.length < 2
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${String(items.at(-1))}`;
