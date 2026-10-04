import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './Tooltip.stories.js';

const { Default } = composeStories(stories);

test('hovering opens it, and Escape dismisses it without moving the pointer', async () => {
  await Default.run();
  await userEvent.hover(page.getByRole('button', { name: 'Close' }));
  const tooltip = page.getByRole('tooltip');
  await expect.element(tooltip).toHaveTextContent('Close the panel');
  await userEvent.keyboard('{Escape}');
  await expect.element(tooltip).not.toBeInTheDocument();
});

test('keyboard focus opens it, and leaving closes it', async () => {
  await Default.run();
  focusStart();
  await userEvent.tab();
  await expect.element(page.getByRole('tooltip')).toBeVisible();
  await userEvent.tab({ shift: true });
  await expect.element(page.getByRole('tooltip')).not.toBeInTheDocument();
});
