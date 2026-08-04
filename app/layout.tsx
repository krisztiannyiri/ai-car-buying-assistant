import type { Metadata } from 'next';
import Header from '@/components/Header/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Car Buying Assistant',
  description: 'Your AI-powered guide to buying the right car.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Header />
        {children}
      </body>
    </html>
  );
}
