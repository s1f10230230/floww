import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Floww - 自動家計簿＆サブスク管理',
  description: 'Gmailと連携するだけで自動的に支出を管理。解約忘れのサブスクも発見できます。',
  viewport: 'width=device-width, initial-scale=1',
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