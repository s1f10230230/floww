'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { FlowwWordmark, FlowwIcon } from './components/FlowwLogo'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
      setIsAuthenticated(true)
      router.push('/dashboard')
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // Redirect to Google OAuth
      window.location.href = '/api/auth/google'
    } catch (error) {
      console.error('Login error:', error)
      setLoading(false)
    }
  }

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Floww',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'JPY',
    },
    description: 'Gmailと連携するだけで自動的に支出を管理。クレジットカードの利用通知メールから自動で家計簿を作成し、解約忘れのサブスクも発見できます。',
    featureList: [
      'クレジットカード利用通知の自動読み取り',
      'カテゴリ別支出管理',
      'サブスクリプション検出',
      'データ自動分類',
    ],
    screenshot: 'https://floww-orpin.vercel.app/og-image.png',
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-8 sm:py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <FlowwIcon size={64} />
            <FlowwWordmark size={48} />
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            もう入力しない。
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Gmail連携だけで家計簿が続く
            </span>
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 px-4">
            購入メールから自動で支出を記録。
            <br />
            さらに解約忘れのサブスクも発見します。
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-3 px-4">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 sm:py-4 px-6 sm:px-8 rounded-lg text-base sm:text-lg shadow-lg transition-all hover:shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 border border-gray-200"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="currentColor">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="hidden sm:inline">{loading ? '接続中...' : 'Googleで続ける（無料）'}</span>
              <span className="sm:hidden">{loading ? '接続中...' : 'Googleで続ける'}</span>
            </button>
            <p className="text-xs sm:text-sm text-gray-500">
              ※カード利用通知メールを取得して自動で家計簿を作成します
            </p>
            <p className="text-xs text-gray-500 mt-2">
              ログインすることで、
              <a href="/terms" className="text-blue-600 hover:underline mx-1">利用規約</a>
              および
              <a href="/privacy" className="text-blue-600 hover:underline mx-1">プライバシーポリシー</a>
              に同意したものとみなされます
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8 mt-12 sm:mt-16">
            <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">💳</div>
              <h3 className="font-bold text-base sm:text-lg mb-2">カード利用通知を自動解析</h3>
              <p className="text-sm sm:text-base text-gray-600">
                楽天カード、JCBなど主要カード会社の利用通知メールから自動で取引を記録
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">📊</div>
              <h3 className="font-bold text-base sm:text-lg mb-2">カテゴリで支出を整理</h3>
              <p className="text-sm sm:text-base text-gray-600">
                利用先ごとにカテゴリを設定して、月次・カテゴリ別の支出を簡単に把握
              </p>
            </div>

            <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">🔍</div>
              <h3 className="font-bold text-base sm:text-lg mb-2">継続的な支払いを検出</h3>
              <p className="text-sm sm:text-base text-gray-600">
                サブスク、交通費、海外利用など定期的な支払いを自動で見つけて管理
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Preview (shown when authenticated) */}
      {isAuthenticated && (
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-xl shadow-xl p-8">
              <h2 className="text-2xl font-bold mb-6">今月の支出</h2>
              {/* TODO: Add expense list and charts */}
              <p className="text-gray-500">支出データを取得中...</p>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <FlowwIcon size={24} />
              <span className="text-sm text-gray-600">© 2024 Floww</span>
            </div>
            <div className="flex gap-6">
              <a href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                プライバシーポリシー
              </a>
              <a href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                利用規約
              </a>
              <a href="/feedback" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                お問い合わせ
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}