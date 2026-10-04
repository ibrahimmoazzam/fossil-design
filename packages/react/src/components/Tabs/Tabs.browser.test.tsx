import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './Tabs.stories.js';

const { AlignStart } = composeStories(stories);

test('arrow keys, Home and End move focus and selection together', async () => {
  await AlignStart.run();
  focusStart();
  // The panel comes first, and takes a tab stop while it holds nothing focusable.
  await userEvent.tab();
  await userEvent.tab();
  const web = page.getByRole('tab', { name: 'Web' });
  await expect.element(web).toHaveFocus();

  await userEvent.keyboard('{ArrowRight}');
  const figma = page.getByRole('tab', { name: 'Figma' });
  await expect.element(figma).toHaveFocus();
  await expect.element(figma).toHaveAttribute('aria-selected', 'true');

  await userEvent.keyboard('{End}');
  await expect.element(page.getByRole('tab', { name: 'Agents' })).toHaveFocus();
  await userEvent.keyboard('{Home}');
  await expect.element(web).toHaveFocus();
  await userEvent.keyboard('{ArrowLeft}');
  await expect.element(page.getByRole('tab', { name: 'Agents' })).toHaveFocus();
});

test('the list is one tab stop, and a panel with nothing focusable takes one', async () => {
  await AlignStart.run();
  focusStart();
  await userEvent.tab();
  await expect.element(page.getByRole('tabpanel')).toHaveFocus();
  await userEvent.tab();
  await expect.element(page.getByRole('tab', { name: 'Web' })).toHaveFocus();
  await userEvent.tab();
  expect(document.activeElement?.getAttribute('role')).not.toBe('tab');
});
