import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { Card } from '../Card/Card.js';
import { Carousel } from './Carousel.js';
import demo from './stories.module.css';

const cards = [
  'Tokens in git',
  'Typed components',
  'Figma variables',
  'Lint configs',
  'Agent docs',
  'Drift numbers',
].map((title) => (
  <Card key={title} title={title} titleAs="h3">
    One part of the pipeline, reviewed as code.
  </Card>
));

const meta = {
  title: 'Layout/Carousel',
  component: Carousel,
  args: { label: 'Pipeline', className: demo.demo, children: cards },
} satisfies Meta<typeof Carousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The controls appear once the cards overflow; backward starts unavailable, but focusable. */
export const Buttons: Story = {
  play: async ({ canvas, userEvent }) => {
    const back = await canvas.findByRole('button', {
      name: 'Scroll Pipeline backward',
    });
    const forward = canvas.getByRole('button', {
      name: 'Scroll Pipeline forward',
    });
    await expect(back).toHaveAttribute('aria-disabled', 'true');
    await expect(back).toBeEnabled();
    const track = canvas.getByRole('list', { name: 'Pipeline' });
    await userEvent.click(forward);
    await waitFor(() => expect(track.scrollLeft).toBeGreaterThan(0));
    await waitFor(() => expect(back).toHaveAttribute('aria-disabled', 'false'));
  },
};

export const Dots: Story = {
  args: { indicator: 'dots' },
  play: async ({ canvas, userEvent }) => {
    const third = await canvas.findByRole('button', {
      name: 'Pipeline: 3 of 6',
    });
    await expect(
      canvas.getByRole('button', { name: 'Pipeline: 1 of 6' }),
    ).toHaveAttribute('aria-current', 'true');
    await userEvent.click(third);
    await waitFor(() => expect(third).toHaveAttribute('aria-current', 'true'));
  },
};

/** Cards that fit need no controls. */
export const Fits: Story = {
  args: { children: cards.slice(0, 1) },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('button')).toBeNull();
    await expect(canvas.getByRole('list')).not.toHaveAttribute('tabindex');
  },
};

export const DotsDark: Story = {
  args: { indicator: 'dots' },
  globals: { theme: 'dark' },
};
