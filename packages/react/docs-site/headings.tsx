import { Markdown } from '@storybook/addon-docs/blocks';
import type { ComponentProps, ReactNode } from 'react';
import { autolink } from './autolink.ts';
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

// A wide table scrolls within the text column, so keyboard users need to reach it to scroll.
const Table = (props: ComponentProps<'table'>) => (
  <table tabIndex={0} {...props} />
);

const elements = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  table: Table,
};

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

/** The docs page showing, such as `actions-button`, from the preview frame's URL. */
function currentPage(): string | undefined {
  return new URLSearchParams(window.location.search)
    .get('id')
    ?.replace(/--docs$/, '');
}

/**
 * Markdown, from a repo file or a component's JSDoc, with the same headings and tables, and with the
 * first mention of each known name in a section linked.
 */
function MarkdownWithHeadings({
  children,
  ...props
}: ComponentProps<typeof Markdown>) {
  return (
    <Markdown
      {...props}
      options={{
        ...props.options,
        overrides: { ...elements, ...props.options?.overrides },
      }}
    >
      {autolink(children, currentPage())}
    </Markdown>
  );
}

/** Replaces Storybook's docs headings, tables and Markdown, in MDX, in repo files and on component pages. */
export const docsComponents = {
  ...elements,
  Heading,
  Subheading,
  Markdown: MarkdownWithHeadings,
};
