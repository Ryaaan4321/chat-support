import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'SwishQ — Live Agent Chat Queue & Concurrency Engine',
  description: 'High-concurrency BPO live agent queue system with atomic Postgres locks and Socket.io real-time layer.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#0C0E11] text-[#F3F4F6]`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
