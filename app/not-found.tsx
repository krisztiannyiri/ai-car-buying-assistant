import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center gap-4 px-8 py-8 text-center">
      <h1 className="text-3xl font-bold text-[#172117]">Page not found</h1>
      <p className="text-base text-[#7c847b]">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link
        href="/"
        className="inline-flex min-h-[44px] items-center font-medium text-[#4caf50] no-underline hover:text-[#388e3c]"
      >
        Back to the chat
      </Link>
    </main>
  );
}
