import type { Element } from './code.ts';

export type PropertyType = 'TEXT' | 'BOOLEAN' | 'INSTANCE_SWAP' | 'SLOT';

/** An axis the variant map doesn't have: a class the component adds from other props. */
export interface DerivedAxis {
  /** The class it adds when on. */
  class: string;
  /** Says whether an element rendering this component turns it on. */
  of: (element: Element) => boolean;
  /** For the component's description in Figma, so a reader knows which props it stands for. */
  means: string;
}

/**
 * How one component becomes a Figma component. The spec reads everything else from code: names,
 * variants, defaults and every token binding. Every name here is checked against code, so a
 * rename can't leave this table behind.
 */
export interface LibraryComponent {
  /** The class on the element that becomes the Figma component. Defaults to the outermost element. */
  root?: string;
  /** Layers with token bindings that the component must have, by class or state selector. */
  layers?: string[];
  /** Layers with token bindings that Figma leaves out, and why. */
  skip?: Record<string, string>;
  /** Layers that exist only in some variants. */
  when?: Record<string, Record<string, string>>;
  derived?: Record<string, DerivedAxis>;
  /** A default where the code has none, such as Text's tone, which inherits when it's omitted. */
  defaults?: Record<string, string>;
  /** Component properties besides variants, by prop name. */
  properties?: Record<string, PropertyType>;
  /** A sentence for the component's description in Figma. */
  description: string;
}

/** Components that render nothing visible, and Box and Stack, which auto layout already covers. */
export const LEFT_OUT: Readonly<Record<string, string>> = {
  Box: "Figma's auto layout does its job: a frame bound to Fossil's variables maps onto Box props.",
  Stack:
    "Figma's auto layout does its job: a frame bound to Fossil's variables maps onto Stack props.",
  VisuallyHidden:
    'It renders nothing visible, so an instance would be an invisible layer.',
};

/** Elements that never appear on screen, with everything inside them. */
export const HIDDEN_ELEMENTS: readonly string[] = ['VisuallyHidden', 'video'];

export const COMPONENTS: Readonly<Record<string, LibraryComponent>> = {
  Button: {
    derived: {
      iconOnly: {
        class: 'iconOnly',
        of: (e) => e.renders.length === 0 && e.children.length === 0,
        means:
          'iconOnly=true is a Button with an icon and a label but no children.',
      },
    },
    properties: { children: 'TEXT', icon: 'BOOLEAN' },
    description:
      'A native button. Text, an icon and text, or an icon alone with a label. For navigation use Link.',
  },
  Card: {
    layers: ['title', 'body'],
    properties: { title: 'TEXT', children: 'TEXT' },
    description:
      'A surface for one of a set of parallel pieces of content, read as units.',
  },
  Carousel: {
    layers: [
      'track',
      'controls',
      'dots::before',
      'dot',
      'dot::before',
      "dot[aria-current='true']::before",
    ],
    when: {
      controls: { indicator: 'buttons' },
      dots: { indicator: 'dots' },
    },
    properties: { children: 'SLOT' },
    description:
      'A horizontally scrolling list of cards, with previous and next buttons or one dot per card.',
  },
  Clip: {
    layers: ['toggle'],
    // The caption is the nested Figure's; Figma can't link a property to a layer inside an instance.
    description:
      "A short, silent interface recording in a Figure, with its play and pause control. Its caption is the Figure's.",
  },
  Figure: {
    layers: ['frame', 'caption'],
    properties: { children: 'SLOT', caption: 'TEXT' },
    description:
      'An image or video in a hairline frame, with an optional caption.',
  },
  Icon: {
    // Without a size, an icon is 1em: s, at 18px, is the nearest beside 16px text.
    defaults: { size: 's' },
    properties: { icon: 'INSTANCE_SWAP' },
    description:
      "An icon: one of Fossil's, or the app's own. Decorative unless it has a label.",
  },
  Link: {
    properties: { children: 'TEXT', icon: 'BOOLEAN' },
    description:
      'A link with a dotted underline that fills in on hover and focus.',
  },
  Modal: {
    root: 'panel',
    layers: ['header', 'title', 'headerContent'],
    skip: {
      dialog:
        'The viewport-sized dialog element, which only positions the panel.',
      scrim: 'The page behind the panel; draw it with color/background/scrim.',
    },
    properties: { title: 'TEXT', headerContent: 'SLOT', children: 'SLOT' },
    description: 'A modal dialog: the panel, with its title and close button.',
  },
  Popover: {
    root: 'popover',
    layers: ['arrow'],
    properties: { content: 'SLOT', arrow: 'BOOLEAN' },
    description:
      'A click-triggered panel beside its trigger, for content that may be interactive.',
  },
  SkipLink: {
    description:
      'The first focusable element on the page, drawn as it appears once focused: it jumps past the navigation.',
    properties: { children: 'TEXT' },
  },
  Tabs: {
    layers: ['list', 'tab', "tab[aria-selected='true']", 'chip'],
    skip: {
      ghost:
        'An invisible bold copy of the label that keeps the tab as wide as its selected state.',
    },
    description:
      'Tabs as a segmented control: the panel, with the pill of tabs beneath it.',
  },
  Text: {
    defaults: { tone: 'default' },
    properties: { children: 'TEXT' },
    description:
      "Text in one of the token text styles. In code, Text without a tone inherits its surface's text colour; Figma can't inherit, so choose the tone that matches.",
  },
  Tooltip: {
    root: 'tooltip',
    layers: ['arrow'],
    properties: { content: 'TEXT', arrow: 'BOOLEAN' },
    description:
      "A short label for a control, shown on hover and focus. Nothing interactive: that's a Popover.",
  },
};
