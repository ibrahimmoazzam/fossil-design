import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';
import { tokenPx } from '../../../.storybook/token-px.js';
import {
  ArrowOutwardIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  PauseIcon,
  PlayArrowIcon,
} from '../../generated/icons.js';
import { Stack } from '../Stack/Stack.js';
import { Text } from '../Text/Text.js';
import { Icon, iconVariants } from './Icon.js';

const meta = {
  title: 'Content/Icon',
  component: Icon,
  args: { icon: CloseIcon },
} satisfies Meta<typeof Icon>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Beside text, an icon is decorative: hidden from assistive technology, sized to the text. */
export const Decorative: Story = {
  tags: ['example'],
  render: () => (
    <Text>
      <Icon icon={CloseIcon} /> Close
    </Text>
  ),
  play: async ({ canvasElement }) => {
    const svg = canvasElement.querySelector('svg');
    await expect(svg).toHaveAttribute('aria-hidden', 'true');
    if (!svg) throw new Error('Icon did not render');
    await expect(getComputedStyle(svg).inlineSize).toBe(
      getComputedStyle(svg.parentElement ?? svg).fontSize,
    );
  },
};

/** An icon with no text beside it means something on its own, so its `label` names it. */
export const Labelled: Story = {
  tags: ['example'],
  args: { label: 'Close' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('img', { name: 'Close' })).toBeVisible();
  },
};

export const Sizes: Story = {
  render: (args) => (
    <Stack direction="row" gap="m" align="center">
      {iconVariants.size.map((size) => (
        <Icon key={size} {...args} size={size} />
      ))}
    </Stack>
  ),
  play: async ({ canvasElement }) => {
    const [s, m, l] = canvasElement.querySelectorAll('svg');
    if (!s || !m || !l) throw new Error('Icons did not render');
    await expect(getComputedStyle(s).inlineSize).toBe(
      tokenPx('--fossil-icon-size-s'),
    );
    await expect(getComputedStyle(m).inlineSize).toBe(
      tokenPx('--fossil-icon-size-m'),
    );
    await expect(getComputedStyle(l).inlineSize).toBe(
      tokenPx('--fossil-icon-size-l'),
    );
  },
};

export const Set: Story = {
  render: () => (
    <Stack direction="row" gap="m">
      {[
        ArrowOutwardIcon,
        ChevronLeftIcon,
        ChevronRightIcon,
        CloseIcon,
        PauseIcon,
        PlayArrowIcon,
      ].map((icon) => (
        <Icon
          key={icon.displayName}
          icon={icon}
          size="l"
          label={icon.displayName}
        />
      ))}
    </Stack>
  ),
};
