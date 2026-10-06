import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComponentPropsWithoutRef } from 'react';
import { expect, fn } from 'storybook/test';
import { CloseIcon } from '../../generated/icons.js';
import { Text } from '../Text/Text.js';
import { Link } from './Link.js';

/** Your router's link component, such as `Link` from `next/link`. */
const RouterLink = (props: ComponentPropsWithoutRef<'a'>) => <a {...props} />;

const meta = {
  title: 'Actions/Link',
  component: Link,
  args: { href: '#work', children: 'Selected work' },
  render: (args) => (
    <Text>
      Read about the <Link {...args} /> from the last two years.
    </Text>
  ),
} satisfies Meta<typeof Link>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const link = canvas.getByRole('link', { name: 'Selected work' });
    await expect(link).toHaveAttribute('href', '#work');
    // Inherits the colour of the text around it.
    await expect(getComputedStyle(link).color).toBe(
      getComputedStyle(link.parentElement ?? link).color,
    );
  },
};

/** A link in running text takes `tone="accent"`, so it stands out from the words around it. */
export const Accent: Story = {
  tags: ['example'],
  args: { tone: 'accent' },
};

/** A new tab gets an outward arrow, and says so to screen readers. */
export const NewTab: Story = {
  tags: ['example'],
  args: {
    href: 'https://www.w3.org/TR/WCAG22/',
    target: '_blank',
    rel: 'noreferrer',
    children: 'WCAG 2.2',
  },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole('link', { name: 'WCAG 2.2 (opens in a new tab)' }),
    ).toBeVisible();
  },
};

/** With asChild, a router's link or a button takes the style and keeps its own element. */
export const AsChild: Story = {
  args: { asChild: true, icon: CloseIcon, children: undefined },
  render: (args) => (
    <Text>
      <Link {...args}>
        <button type="button" onClick={fn()}>
          Dismiss the banner
        </button>
      </Link>
    </Text>
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Dismiss the banner' });
    await expect(button.className).toMatch(/link/);
    await expect(button).toHaveAttribute('type', 'button');
  },
};

/**
 * A router's link takes the style through `asChild`, and keeps its own element and navigation.
 */
export const WithRouter: Story = {
  tags: ['example'],
  render: () => (
    <Text>
      Read about the{' '}
      <Link asChild tone="accent">
        <RouterLink href="#work">Selected work</RouterLink>
      </Link>{' '}
      from the last two years.
    </Text>
  ),
};

export const AccentDark: Story = {
  args: { tone: 'accent' },
  globals: { theme: 'dark' },
};
