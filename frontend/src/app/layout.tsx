import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TokenRefreshProvider } from '@/components/TokenRefreshProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'JECRC Dating - Find Your Campus Connection',
  description: 'Connect with fellow JECRC students. Safe, verified, and fun dating for university students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TokenRefreshProvider>
          {children}
        </TokenRefreshProvider>
      </body>
    </html>
  );
}
