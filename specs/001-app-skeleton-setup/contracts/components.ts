/**
 * Component prop interfaces for the App Skeleton.
 * This file is the authoritative contract; implementations must satisfy these types.
 * No runtime usage — design/planning artifact only.
 */

import type { ReactNode } from 'react';

// app/layout.tsx
export interface RootLayoutProps {
  children: ReactNode;
}

// components/Header/Header.tsx
// No external props — the header is self-contained.
// Active-state detection is handled internally via usePathname().
export type HeaderProps = Record<string, never>;

// components/ChatInterface/ChatInterface.tsx
// No external props in the skeleton.
// Future features will extend this with message state and event handlers.
export type ChatInterfaceProps = Record<string, never>;

// app/not-found.tsx
// No props — Next.js renders this component automatically with no arguments.
export type NotFoundPageProps = Record<string, never>;
