import type {Metadata} from 'next';
import {Nunito} from 'next/font/google';
import './globals.css';
import {AuthProvider} from '@/contexts/auth-context';
import {ThemeProvider} from '@/contexts/theme-context';
import {Inter} from "next/font/google"

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

const inter = Inter({subsets: ["latin"]})

export const metadata: Metadata = {
  title: 'Bilbul - Split Bills Fairly with AI',
  description: 'Upload a receipt and let our AI handle the rest. No more arguments about who owes what.',
  manifest: '/manifest.json',
  themeColor: [
    {media: '(prefers-color-scheme: light)', color: '#ffffff'},
    {media: '(prefers-color-scheme: dark)', color: '#000000'}
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Bilbul',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    shortcut: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
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
    <html lang="en" className={`${nunito.variable} ${switzer.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#ffffff" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} font-switzer bg-background text-foreground`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
