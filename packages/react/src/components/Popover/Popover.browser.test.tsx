import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './Popover.stories.js';

const { Default } = composeStories(stories);

async function openPopover() {
  await Default.run();
  // Floating UI ignores presses on elements added after it opened, as injected by a browser
  // extension, so the outside target has to exist first.
  focusStart();
  const trigger = page.getByRole('button', { name: 'About' });
  await userEvent.click(trigger);
  const popover = page.getByRole('dialog', { name: 'About this project' });
  await expect.element(popover).toBeVisible();
  return { trigger, popover };
}

test('Escape closes it and returns focus to the trigger', async () => {
  const { trigger, popover } = await openPopover();
  await userEvent.keyboard('{Escape}');
  await expect.element(popover).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});

test('a click outside closes it', async () => {
  const { popover } = await openPopover();
  await userEvent.click(page.getByRole('button', { name: 'Start' }));
  await expect.element(popover).not.toBeInTheDocument();
});

test('it is not modal: focus moves in, and tabbing past its end closes it', async () => {
  const { popover } = await openPopover();
  await expect
    .element(page.getByRole('link', { name: 'Read the source' }))
    .toHaveFocus();
  await userEvent.tab();
  await expect.element(popover).not.toBeInTheDocument();
});
