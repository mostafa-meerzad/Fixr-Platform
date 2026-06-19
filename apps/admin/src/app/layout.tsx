import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fixr Admin',
  description: 'Fixr Platform Administration Panel',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
