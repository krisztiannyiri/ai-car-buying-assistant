'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Header.module.css';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className={styles.header}>
      <Link href="/" className={`${styles.appName} ${pathname === '/' ? styles.active : ''}`}>
        <span>AI Car Buying Assistant</span>
      </Link>
    </header>
  );
}
