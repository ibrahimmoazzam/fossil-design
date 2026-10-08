import { Unstyled } from '@storybook/addon-docs/blocks';
import type { ReactNode } from 'react';
import { Box, Icon, Stack, Text, VisuallyHidden } from '../src/index.ts';
import { InfoIcon, WarningIcon } from './icons.ts';
import styles from './Callout.module.css';

const tones = {
  warning: { icon: WarningIcon, label: 'Warning' },
  info: { icon: InfoIcon, label: 'Note' },
} as const;

/** A short note set apart from the page's text: a warning to heed, or information to know first. */
export function Callout({
  tone,
  flow = false,
  children,
}: {
  tone: keyof typeof tones;
  /** Set where it sits among Markdown's paragraphs, which space themselves with margins it lacks. */
  flow?: boolean;
  children: ReactNode;
}) {
  const { icon, label } = tones[tone];
  const callout = (
    <Stack
      direction="row"
      gap="s"
      padding="m"
      radius="surface"
      className={`${styles.callout} ${styles[`tone-${tone}`]}`}
    >
      <Icon icon={icon} size="m" className={styles.icon} />
      <Text variant="small">
        <VisuallyHidden>{label}: </VisuallyHidden>
        {children}
      </Text>
    </Stack>
  );
  // Unstyled replaces any class it's given, so the spacing goes on a box inside it.
  return (
    <Unstyled>
      {flow ? <Box className={styles.flow}>{callout}</Box> : callout}
    </Unstyled>
  );
}
