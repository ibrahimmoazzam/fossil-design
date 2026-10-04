/** A token's length as the page resolves it, in pixels: rem tokens scale with the root font size. */
export function tokenPx(name: `--${string}`): string {
  const root = getComputedStyle(document.documentElement);
  const value = root.getPropertyValue(name).trim();
  const number = Number.parseFloat(value);
  if (Number.isNaN(number))
    throw new Error(`${name} is not a length: "${value}"`);
  if (value.endsWith('rem'))
    return `${String(number * Number.parseFloat(root.fontSize))}px`;
  if (value.endsWith('px')) return value;
  throw new Error(`${name} has a unit tokenPx doesn't convert: "${value}"`);
}
