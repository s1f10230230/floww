import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Floww - 自動家計簿＆サブスク管理アプリ',
    template: '%s | Floww',
  },
  description: 'Gmailと連携するだけで自動的に支出を管理。クレジットカードの利用通知メールから自動で家計簿を作成し、解約忘れのサブスクも発見できます。完全無料プランあり。',
  keywords: ['家計簿', '自動家計簿', 'サブスク管理', 'Gmail連携', 'クレジットカード', '支出管理', '定期支払い', '楽天カード', 'JCB', '家計管理アプリ'],
  authors: [{ name: 'Floww' }],
  creator: 'Floww',
  publisher: 'Floww',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ja_JP',
    url: 'https://floww-app.dev',
    siteName: 'Floww',
    title: 'Floww - 自動家計簿＆サブスク管理アプリ',
    description: 'Gmailと連携するだけで自動的に支出を管理。クレジットカードの利用通知メールから自動で家計簿を作成し、解約忘れのサブスクも発見できます。',
    images: [
      {
        url: 'https://floww-app.dev/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Floww - 自動家計簿アプリ',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Floww - 自動家計簿＆サブスク管理アプリ',
    description: 'Gmailと連携するだけで自動的に支出を管理。解約忘れのサブスクも発見できます。',
    images: ['https://floww-app.dev/og-image.png'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  verification: {
    google: 'uUfAgZ9C3rzRE3euxEpu-FOMYDfmbIbdGwP41gZ9pJI',
  },
  alternates: {
    canonical: 'https://floww-app.dev',
  },
  other: {
    'google-adsense-account': 'ca-pub-6475316584558352',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ja">
      <head>
        <meta name="google-site-verification" content="DmV8aRaFymglZFe7rfVb_cUXJ0LjtXkCyIQQ5NnDPn8" />
      </head>
      <body className={inter.className}>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6475316584558352"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  )
}