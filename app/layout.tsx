import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Car Buying Assistant',
  description: 'Your AI-powered guide to buying the right car.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
