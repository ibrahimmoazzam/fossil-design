import { composeStories } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { focusStart } from '../../../.storybook/focus-start.js';
import * as stories from './Button.stories.js';

const { Secondary } = composeStories(stories);

test('the keyboard shows the focus ring, and a click does not', async () => {
  await Secondary.run();
  const button = page.getByRole('button', { name: 'Save changes' });

  focusStart();
  await userEvent.click(button);
  await expect.element(button).toHaveFocus();
  expect(button.element().matches(':focus-visible')).toBe(false);
  expect(getComputedStyle(button.element()).outlineStyle).toBe('none');

  focusStart();
  await userEvent.tab();
  await expect.element(button).toHaveFocus();
  expect(button.element().matches(':focus-visible')).toBe(true);
  expect(getComputedStyle(button.element()).outlineStyle).toBe('solid');
});

test('Enter and Space activate it', async () => {
  const onClick = fn();
  await Secondary.run({ args: { ...Secondary.args, onClick } });
  onClick.mockClear();
  const button = page.getByRole('button', { name: 'Save changes' });

  focusStart();
  await userEvent.tab();
  await expect.element(button).toHaveFocus();
  await userEvent.keyboard('{Enter}');
  await userEvent.keyboard(' ');
  expect(onClick).toHaveBeenCalledTimes(2);
});
