import type {Metadata} from 'next';
import {Nunito} from 'next/font/google';
import './globals.css';
import {AuthProvider} from '@/contexts/auth-context';

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
});

const switzer = {
  fontFamily: 'Switzer',
  src: `
    url('https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700&display=swap') format('woff2')
  `,
  variable: '--font-switzer',
};

export const metadata: Metadata = {
  title: 'Bilbul - Easily split your bill',
  description: 'Bilbul helps you split bills with friends and family easily. Upload a receipt, select items, and get a fair split in seconds.',
  keywords: 'bill splitter, receipt splitter, expense sharing, group expenses, bill sharing',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Bilbul - Easily split your bill',
    description: 'Split bills with friends and family easily. Upload a receipt, select items, and get a fair split in seconds.',
    type: 'website',
    images: [{
      url: '/logo.png',
      width: 800,
      height: 800,
      alt: 'Bilbul Logo'
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bilbul - Easily split your bill',
    description: 'Split bills with friends and family easily. Upload a receipt, select items, and get a fair split in seconds.',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${switzer.variable} dark`}>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className="font-switzer bg-background text-foreground">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
