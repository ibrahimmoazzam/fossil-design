import { Markdown } from '@storybook/addon-docs/blocks';
import type { ComponentProps, ReactNode } from 'react';
import { slug } from './slug.ts';

// Storybook's headings hold a "Copy heading URL" link, which screen readers then read as
// part of every heading's name. These keep the id, for the contents and links, and drop it.
type HeadingProps = ComponentProps<'h1'>;

const H1 = (props: HeadingProps) => <h1 {...props} />;
const H2 = (props: HeadingProps) => <h2 {...props} />;
const H3 = (props: HeadingProps) => <h3 {...props} />;
const H4 = (props: HeadingProps) => <h4 {...props} />;
const H5 = (props: HeadingProps) => <h5 {...props} />;
const H6 = (props: HeadingProps) => <h6 {...props} />;

const headings = { h1: H1, h2: H2, h3: H3, h4: H4, h5: H5, h6: H6 };

function idOf(children: ReactNode): string | undefined {
  return typeof children === 'string' ? slug(children) : undefined;
}

/** The section headings on a component's docs page, such as "Stories". */
function Heading({ children }: { children: ReactNode }) {
  return <h2 id={idOf(children)}>{children}</h2>;
}

/** Each story's name on a component's docs page. */
function Subheading({ children }: { children: ReactNode }) {
  return <h3 id={idOf(children)}>{children}</h3>;
}

/** Markdown, from a repo file or a component's JSDoc, with the same headings. */
function MarkdownWithHeadings(props: ComponentProps<typeof Markdown>) {
  return (
    <Markdown
      {...props}
      options={{
        ...props.options,
        overrides: { ...headings, ...props.options?.overrides },
      }}
    />
  );
}

/** Replaces Storybook's docs headings, in MDX, in Markdown and on component pages. */
export const docsComponents = {
  ...headings,
  Heading,
  Subheading,
  Markdown: MarkdownWithHeadings,
};
