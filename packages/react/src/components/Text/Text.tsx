import {
  createElement,
  forwardRef,
  type ComponentPropsWithRef,
  type ForwardedRef,
  type ReactElement,
} from 'react';
import { cx } from '../../responsive.js';
import styles from './Text.module.css';

export const textElements = [
  'p',
  'span',
  'div',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'strong',
  'em',
  'small',
  'label',
  'legend',
  'figcaption',
  'blockquote',
  'li',
  'dt',
  'dd',
] as const;

// The text styles, one per text token, and the text colours. A line comment, because
// react-docgen-typescript reads a JSDoc comment here as Text's own and then finds no props.
export const textVariants = {
  variant: [
    'body',
    'prose',
    'small',
    'caption',
    'fine',
    'label',
    'control',
    'heading-xs',
    'heading-s',
    'heading-m',
    'heading-l',
    'heading-xl',
  ],
  tone: ['default', 'muted', 'accent', 'highlight'],
} as const;

export type TextElement = (typeof textElements)[number];
export type TextVariant = (typeof textVariants.variant)[number];
export type HeadingVariant = Extract<TextVariant, `heading-${string}`>;
export type TextTone = (typeof textVariants.tone)[number];

interface TextOwnProps {
  /** The text colour. Omit it to inherit, which keeps a surface's paired text colour. */
  tone?: TextTone;
  /** Classes from the app's own stylesheet, added to Fossil's. */
  className?: string;
}

export type TextProps<E extends TextElement = 'p'> = TextOwnProps &
  Omit<ComponentPropsWithRef<E>, keyof TextOwnProps | 'as' | 'variant'> &
  (
    | {
        /** A heading style says nothing about the outline, so it needs an element. */
        variant: HeadingVariant;
        as: E;
      }
    | {
        /** The text style. Defaults to `body`. */
        variant?: Exclude<TextVariant, HeadingVariant>;
        /** The element to render. Defaults to `p`. */
        as?: E;
      }
  );

function TextRender(
  {
    as = 'p',
    variant = 'body',
    tone,
    className,
    ...rest
  }: TextProps<TextElement>,
  ref: ForwardedRef<HTMLElement>,
) {
  return createElement(as, {
    ...rest,
    ref,
    className: cx(
      styles.text,
      styles[variant],
      tone && styles[`tone-${tone}`],
      className,
    ),
  });
}

const TextWithRef = forwardRef(TextRender);
TextWithRef.displayName = 'Text';

/**
 * Text in one of the token text styles. The style sets size, weight and spacing; the element
 * sets meaning, so a heading style needs `as` to say which heading level it is.
 *
 * ## When to use
 *
 * - Any text: paragraphs, headings, labels and captions.
 * - A heading: choose the style for its size and `as` for its level, separately.
 * - Secondary or marked text: `tone="muted"`, `"accent"` or `"highlight"`.
 *
 * ## When not to use
 *
 * - Link text: use `Link`. A button's text goes inside `Button`, which sets the control style.
 * - Text for screen readers only: use `VisuallyHidden`.
 * - A card's title and body: `Card` sets both.
 *
 * ## States
 *
 * None: it isn't interactive.
 *
 * ## Accessibility
 *
 * ### Built in
 *
 * Every tone meets WCAG AA contrast on the page and surface backgrounds, in light and dark. Without
 * `tone`, text inherits its colour, so on a `Box` surface it keeps the colour paired with that
 * fill. The `label` style uppercases with CSS, so screen readers read the text as written.
 *
 * ### Up to you
 *
 * Choose `as` to fit the page outline: one `h1`, and no skipped levels. Leave `tone` off text on
 * an accent or highlight surface, so it keeps the surface's paired colour.
 */
export const Text = TextWithRef as <E extends TextElement = 'p'>(
  props: TextProps<E>,
) => ReactElement | null;
