import type { ParserOptions } from 'react-docgen-typescript';

/**
 * react-docgen-typescript's options, shared by the bundled docs and Storybook's manifest so both
 * describe the same props. They're Storybook's defaults, except that an undocumented `children`
 * is kept, so the docs check can report it.
 */
export const docgenOptions = {
  shouldExtractLiteralValuesFromEnum: true,
  shouldRemoveUndefinedFromOptional: true,
  savePropValueAsString: true,
  skipChildrenPropWithoutDoc: false,
  // React's own props belong to the element, and the platform documents them.
  propFilter: (prop) =>
    prop.parent ? !prop.parent.fileName.includes('node_modules') : true,
} satisfies ParserOptions;
