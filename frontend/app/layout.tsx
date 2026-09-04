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
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#F8FAFC] text-[#0F172A]`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-[#0F172A] selection:bg-[#2563EB]/15 selection:text-[#2563EB]">
        {children}
      </body>
    </html>
  );
}
