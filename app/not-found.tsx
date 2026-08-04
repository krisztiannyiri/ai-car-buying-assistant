import Link from 'next/link';

export default function NotFound() {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 64px)',
        padding: 'var(--spacing-8)',
        textAlign: 'center',
        gap: 'var(--spacing-4)',
      }}
    >
      <h1
        style={{
          fontSize: 'var(--font-size-3xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--color-text-primary)',
        }}
      >
        Page not found
      </h1>
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        style={{
          color: 'var(--color-accent)',
          fontWeight: 'var(--font-weight-medium)',
          textDecoration: 'none',
          minHeight: '44px',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        Back to the chat
      </Link>
    </main>
  );
}
