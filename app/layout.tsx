'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { LanguageProvider } from '../lib/i18n';
import { AuthProvider } from '../lib/auth-context';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <head>
        <title>AXON Decision Engine</title>
        <meta name="description" content="Operational security and policy governance decision engine." />
      </head>
      <body className="antialiased min-h-screen bg-[#08090C] text-[#F3F4F6]">
        <AuthProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
