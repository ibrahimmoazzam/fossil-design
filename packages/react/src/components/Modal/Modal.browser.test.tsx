import { composeStories } from '@storybook/react-vite';
import { expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import * as stories from './Modal.stories.js';

const { Default } = composeStories(stories);

async function openModal() {
  await Default.run();
  const trigger = page.getByRole('button', { name: 'Open details' });
  await userEvent.click(trigger);
  const dialog = page.getByRole('dialog', { name: 'Project details' });
  await expect.element(dialog).toBeVisible();
  return { trigger, dialog: dialog.element() as HTMLDialogElement };
}

test('Escape closes it, and focus returns to the trigger', async () => {
  const { trigger, dialog } = await openModal();
  await userEvent.keyboard('{Escape}');
  await expect.poll(() => dialog.open).toBe(false);
  await expect.element(trigger).toHaveFocus();
});

test('a click outside the panel closes it', async () => {
  const { dialog } = await openModal();
  // The dialog fills the viewport around the centred panel. A point above the panel is the
  // dialog element itself, which is what turns the click into a dismissal.
  const panel = page
    .getByRole('heading', { name: 'Project details' })
    .element();
  const top = panel.getBoundingClientRect().top;
  await userEvent.click(page.getByRole('dialog', { name: 'Project details' }), {
    position: { x: dialog.clientWidth / 2, y: top / 2 },
  });
  await expect.poll(() => dialog.open).toBe(false);
});

test('Tab never reaches the page behind it', async () => {
  const { trigger, dialog } = await openModal();
  for (let i = 0; i < 6; i += 1) {
    await userEvent.tab();
    expect(document.activeElement).not.toBe(trigger.element());
    if (document.activeElement !== document.body) {
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  }
});
