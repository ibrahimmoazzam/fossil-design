import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Figure } from './Figure.js';

const image = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><rect width="640" height="360" fill="#c6daec"/><circle cx="320" cy="180" r="90" fill="#0a6fbf"/></svg>',
)}`;

const meta = {
  title: 'Content/Figure',
  component: Figure,
  args: {
    caption:
      'The token pipeline, from DTCG source to CSS, TypeScript and Figma.',
    children: (
      <img
        src={image}
        alt="A blue circle on a pale blue field"
        width={640}
        height={360}
      />
    ),
  },
} satisfies Meta<typeof Figure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The caption is the figure's figcaption, which browsers use to name the figure. */
export const Captioned: Story = {
  play: async ({ canvas }) => {
    const figure = canvas.getByRole('figure');
    const caption = within(figure).getByText(
      'The token pipeline, from DTCG source to CSS, TypeScript and Figma.',
    );
    await expect(caption.tagName).toBe('FIGCAPTION');
    await expect(within(figure).getByRole('img')).toBeVisible();
  },
};

/** Without a caption, only the frame renders: no figure. */
export const Uncaptioned: Story = {
  args: { caption: undefined },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('figure')).toBeNull();
    await expect(canvas.getByRole('img')).toBeVisible();
  },
};

export const Dark: Story = {
  globals: { theme: 'dark' },
};
