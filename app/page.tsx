import type { Metadata } from 'next';
import ChatInterface from '@/components/ChatInterface/ChatInterface';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'AI Car Buying Assistant',
  description: 'Your AI-powered guide to buying the right car.',
};

export default function HomePage() {
  return (
    <main className={styles.main}>
      <ChatInterface />
    </main>
  );
}
