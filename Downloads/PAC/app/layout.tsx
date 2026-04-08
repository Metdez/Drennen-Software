import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { siteMetadata } from '@/lib/seo/metadata';
import { SkipToContent } from '@/components/ui/SkipToContent';
import './globals.css';

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata = siteMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${dmSans.variable} ${jetbrainsMono.variable}`}>
      <body>
        <SkipToContent />
        {children}
      </body>
    </html>
  );
}
