import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { recordClip } from '../../../.storybook/record-clip.js';
import { Clip } from './Clip.js';

// The stories record a clip in the browser instead, so the repository holds no video files.
/** The URL of your video. */
const video = '';

const meta = {
  title: 'Content/Clip',
  component: Clip,
  args: {
    src: video,
    caption:
      'A dot slides from the left edge of the frame to the right, then starts again.',
  },
  loaders: [async () => ({ src: await recordClip() })],
  render: (args, { loaded }) => (
    <Clip {...args} src={(loaded as { src: string }).src} />
  ),
} satisfies Meta<typeof Clip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** It plays on its own, and the toggle, named for what it will do, stops it. */
export const Default: Story = {
  tags: ['example'],
  play: async ({ canvas, userEvent }) => {
    const video = canvas.getByRole('figure').querySelector('video');
    if (!video) throw new Error('Clip did not render a video');
    const pause = await canvas.findByRole('button', { name: 'Pause' });
    await waitFor(() => expect(video.paused).toBe(false));
    await userEvent.click(pause);
    await expect(
      await canvas.findByRole('button', { name: 'Play' }),
    ).toBeVisible();
    await expect(video.paused).toBe(true);
  },
};

/** The caption stays for assistive technology, off the screen. */
export const CaptionHidden: Story = {
  args: { captionHidden: true },
  play: async ({ canvas }) => {
    const caption = canvas.getByText(/A dot slides/);
    await expect(caption.tagName).toBe('FIGCAPTION');
    const box = caption.getBoundingClientRect();
    await expect(box.width * box.height).toBeLessThanOrEqual(1);
  },
};

export const Dark: Story = {
  globals: { theme: 'dark' },
};
