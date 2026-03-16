import type { Metadata } from 'next';
import { JetBrains_Mono, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import './globals.css';

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-mono',
  display: 'swap',
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Glasswing Deal Research',
  description: 'AI-powered VC deal research powered by Firecrawl and Claude',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${jetbrainsMono.variable} ${ibmPlexMono.variable} ${ibmPlexSans.variable}`}
        style={{ fontFamily: 'var(--font-ibm-sans), system-ui, sans-serif' }}
      >
        {children}
      </body>
    </html>
  );
}
