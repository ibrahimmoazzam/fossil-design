import '@fossil-design/react/style.css';
import type { ReactNode } from 'react';
import styles from './layout.module.css';

export const metadata = { title: 'Fossil smoke test' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={styles.body}>{children}</body>
    </html>
  );
}
