import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './Carousel.stories.js';

const { Buttons } = composeStories(stories);

test('the track is a tab stop, and the arrow keys scroll it', async () => {
  await Buttons.run();
  const track = page.getByRole('list', { name: 'Pipeline' });
  const before = (track.element() as HTMLElement).scrollLeft;
  focusStart();
  await userEvent.tab();
  await expect.element(track).toHaveFocus();
  await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}');
  await expect
    .poll(() => (track.element() as HTMLElement).scrollLeft)
    .toBeGreaterThan(before);
});

test('the backward button keeps focus when it runs out of cards', async () => {
  await Buttons.run();
  const back = page.getByRole('button', { name: 'Scroll Pipeline backward' });
  await userEvent.click(back);
  await expect
    .poll(() => back.element().getAttribute('aria-disabled'))
    .toBe('true');
  await expect.element(back).toHaveFocus();
});
