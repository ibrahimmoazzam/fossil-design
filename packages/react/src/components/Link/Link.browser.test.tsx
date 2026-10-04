import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './Link.stories.js';

const { Default } = composeStories(stories);

/** The width of the dotted fill under the link's text, against the text's own width. */
function fill(link: HTMLElement) {
  const text = link.querySelector('span');
  if (!text) throw new Error('Link has no text span');
  return (
    Number.parseFloat(getComputedStyle(text, '::before').width) /
    text.getBoundingClientRect().width
  );
}

test('hovering fills the dots', async () => {
  await Default.run();
  const link = page.getByRole('link', { name: 'Selected work' });
  expect(fill(link.element() as HTMLElement)).toBe(0);

  await userEvent.hover(link);
  await expect.poll(() => fill(link.element() as HTMLElement)).toBeCloseTo(1);
});

test('the keyboard shows the focus ring and fills the dots', async () => {
  await Default.run();
  const link = page.getByRole('link', { name: 'Selected work' });

  focusStart();
  await userEvent.tab();
  await expect.element(link).toHaveFocus();
  expect(link.element().matches(':focus-visible')).toBe(true);
  expect(getComputedStyle(link.element()).outlineStyle).toBe('solid');
  await expect.poll(() => fill(link.element() as HTMLElement)).toBeCloseTo(1);
});
