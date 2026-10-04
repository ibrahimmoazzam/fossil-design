import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './SkipLink.stories.js';

const { Default } = composeStories(stories);

test('the first Tab brings the skip link into view, and Enter moves focus to main', async () => {
  await Default.run();
  const link = page.getByRole('link', { name: 'Skip to content' });

  focusStart();
  await userEvent.tab();
  await expect.element(link).toHaveFocus();
  await expect
    .poll(() => getComputedStyle(link.element()).transform)
    .toBe('none');

  await userEvent.keyboard('{Enter}');
  await expect.element(page.getByRole('main')).toHaveFocus();
});
