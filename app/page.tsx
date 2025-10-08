'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'
import { FlowwWordmark, FlowwIcon } from './components/FlowwLogo'

export default function Home() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (session) {
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
    screenshot: 'https://floww-app.dev/og-image.png',
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100/60 via-purple-100/50 to-pink-100/60"></div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-300/40 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-300/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-300/40 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 bg-indigo-300/40 rounded-full blur-3xl"></div>
      </div>

      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12 sm:py-20 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3 mb-12 sm:mb-16">
            <FlowwIcon size={72} />
            <FlowwWordmark size={52} />
          </div>

          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              もう入力しない。
              <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Gmail連携だけで
                <br className="sm:hidden" />
                家計簿が続く
              </span>
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              購入メールから自動で支出を記録。
              <br />
              解約忘れのサブスクも発見します。
            </p>
          </div>

          {/* CTA Card */}
          <div className="max-w-md mx-auto mb-16">
            <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-100">
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-4 px-8 rounded-xl text-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-4"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>接続中...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path fill="white" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="white" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="white" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="white" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Googleで無料で始める</span>
                  </>
                )}
              </button>

              <div className="space-y-2 text-center">
                <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  クレジットカード不要・無料プランあり
                </p>
                <p className="text-sm text-gray-600 flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  メールは読み取り専用・安全です
                </p>
                <p className="text-xs text-gray-500 mt-4 leading-relaxed">
                  ログインすることで、
                  <a href="/terms" className="text-blue-600 hover:underline font-medium mx-1">利用規約</a>
                  および
                  <a href="/privacy" className="text-blue-600 hover:underline font-medium mx-1">プライバシーポリシー</a>
                  に同意したものとみなされます
                </p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="group bg-white/60 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-3 text-gray-900">自動メール解析</h3>
              <p className="text-gray-600 leading-relaxed">
                楽天カード、JCBなど主要カード会社の利用通知メールから自動で取引を記録
              </p>
            </div>

            <div className="group bg-white/60 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-3 text-gray-900">カテゴリ分類</h3>
              <p className="text-gray-600 leading-relaxed">
                利用先ごとにカテゴリを設定して、月次・カテゴリ別の支出を簡単に把握
              </p>
            </div>

            <div className="group bg-white/60 backdrop-blur-sm p-6 sm:p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-200">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-lg sm:text-xl mb-3 text-gray-900">サブスク検出</h3>
              <p className="text-gray-600 leading-relaxed">
                定期的な支払いを自動で見つけて、解約忘れを防止します
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <FlowwIcon size={24} />
              <span className="text-sm text-gray-600">© 2025 Floww</span>
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