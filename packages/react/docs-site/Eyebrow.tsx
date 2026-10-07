import { Unstyled } from '@storybook/addon-docs/blocks';
import { Text } from '../src/index.ts';
import styles from './Eyebrow.module.css';

/** The site section a page belongs to, in the label style above its title. */
export function Eyebrow({ children }: { children: string }) {
  return (
    <Unstyled>
      <Text variant="label" tone="muted" className={styles.eyebrow}>
        {children}
      </Text>
    </Unstyled>
  );
}
