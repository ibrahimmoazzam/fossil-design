// Deliberately off-system. The smoke test copies this into each app and expects lint to fail on
// every line marked below; tests/off-system.test.ts expects the same of Fossil's own configs.
import styles from './off-system.module.css';

export function OffSystem() {
  // A raw layout element.
  return <div className={styles.card}>Off-system</div>;
}
