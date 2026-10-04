import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';
import { ArrowOutwardIcon, CloseIcon } from '../../generated/icons.js';
import { Stack } from '../Stack/Stack.js';
import { Button, buttonVariants } from './Button.js';

const meta = {
  title: 'Actions/Button',
  component: Button,
  args: { children: 'Save changes', onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Secondary: Story = {
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' });
    await expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Primary: Story = {
  args: { tone: 'primary' },
};

export const Small: Story = {
  args: { size: 's' },
};

export const WithIcon: Story = {
  args: { icon: ArrowOutwardIcon, children: 'Open the case study' },
};

/** An icon-only button is round, and named by its label. */
export const IconOnly: Story = {
  args: { icon: CloseIcon, label: 'Close', children: undefined },
  play: async ({ canvas }) => {
    const button = canvas.getByRole('button', { name: 'Close' });
    const style = getComputedStyle(button);
    await expect(style.inlineSize).toBe(style.blockSize);
    await expect(style.borderTopLeftRadius).not.toBe('0px');
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas, args, userEvent }) => {
    const button = canvas.getByRole('button', { name: 'Save changes' });
    await expect(button).toBeDisabled();
    await userEvent.click(button);
    await expect(args.onClick).not.toHaveBeenCalled();
  },
};

/** Size m is at least a 44px target, text or icon. */
export const TouchTarget: Story = {
  render: (args) => (
    <Stack direction="row" gap="m" align="center">
      <Button onClick={args.onClick}>Save changes</Button>
      <Button icon={CloseIcon} label="Close" />
    </Stack>
  ),
  play: async ({ canvas }) => {
    const rootSize = Number.parseFloat(
      getComputedStyle(document.documentElement).fontSize,
    );
    for (const button of canvas.getAllByRole('button')) {
      await expect(
        button.getBoundingClientRect().height,
      ).toBeGreaterThanOrEqual(2.75 * rootSize);
    }
  },
};

export const Tones: Story = {
  render: (args) => (
    <Stack direction="row" gap="m" align="center">
      {buttonVariants.tone.flatMap((tone) =>
        buttonVariants.size.map((size) => (
          <Button
            key={`${tone}-${size}`}
            onClick={args.onClick}
            tone={tone}
            size={size}
          >
            {`${tone} ${size}`}
          </Button>
        )),
      )}
    </Stack>
  ),
};

export const TonesDark: Story = {
  ...Tones,
  globals: { theme: 'dark' },
};
