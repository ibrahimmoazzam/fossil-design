import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './Clip.stories.js';

const { CaptionHidden } = composeStories(stories);

test('Space on the toggle stops the clip, and again starts it', async () => {
  await CaptionHidden.run();
  const video = page.getByRole('figure').element().querySelector('video');
  if (!video) throw new Error('Clip did not render a video');
  await expect.poll(() => video.paused).toBe(false);

  focusStart();
  await userEvent.tab();
  await expect
    .element(page.getByRole('button', { name: 'Pause' }))
    .toHaveFocus();
  await userEvent.keyboard(' ');
  await expect.poll(() => video.paused).toBe(true);
  await expect
    .element(page.getByRole('button', { name: 'Play' }))
    .toHaveFocus();
  await userEvent.keyboard(' ');
  await expect.poll(() => video.paused).toBe(false);
});
