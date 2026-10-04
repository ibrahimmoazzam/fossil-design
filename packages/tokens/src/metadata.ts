/** A token path, or for a composite the path each part references. */
export type Alias =
  string | readonly Alias[] | { readonly [part: string]: Alias };

/** One token in `tokens.json`. */
export interface TokenMetadata {
  tier: 'primitive' | 'semantic';
  /** The DTCG type, such as `color`, `dimension` or `typography`. */
  type: string;
  /** The custom property, such as `--fossil-color-text-muted`. A typography token has one per part. */
  cssVar: string | Readonly<Record<string, string>>;
  /** The DTCG value, with every reference resolved. */
  value: unknown;
  /** What the value references. Only semantic tokens have it. */
  aliasOf?: Alias;
  /** The value in dark mode, when it differs. */
  dark?: { value: unknown; aliasOf: Alias };
  description?: string;
  /** `true`, or the reason the token is deprecated. */
  deprecated?: true | string;
  /** The path of the token that replaces it. */
  replacedBy?: string;
  /** The version that deprecated it. */
  since?: string;
  /** The colours it must stand out against, and the WCAG contrast ratio it must reach on each, in every mode. */
  contrast?: { against: readonly string[]; minimum: number };
}

/** The contents of `tokens.json`. */
export interface TokensFile {
  /** Every token, keyed by its path, such as `color.text.muted`. */
  tokens: Readonly<Record<string, TokenMetadata>>;
}

/** The contents of `lint.json`, for the Stylelint config. */
export interface LintLists {
  /** Every custom property that holds a primitive token. Only an app's site tokens may use them. */
  primitive: readonly string[];
  /** Each deprecated custom property, with the one that replaces it and the reason, when the token gives them. */
  deprecated: Readonly<
    Record<string, { replacedBy?: string; reason?: string }>
  >;
}
