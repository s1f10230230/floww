'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            もう入力しない。
            <br />
            <span className="text-primary">Gmail連携だけで家計簿が続く</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            購入メールから自動で支出を記録。
            <br />
            さらに解約忘れのサブスクも発見します。
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-4 px-8 rounded-lg text-lg shadow-lg transition-all hover:shadow-xl disabled:opacity-50 flex items-center gap-3"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? '接続中...' : 'Gmail連携して始める（無料）'}
            </button>
            <p className="text-sm text-gray-500">
              ※ログインと同時にGmail連携が完了します
            </p>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">📧</div>
              <h3 className="font-bold text-lg mb-2">メール連携だけ</h3>
              <p className="text-gray-600">
                Gmail連携するだけ。あとは全自動で支出を記録します
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">💰</div>
              <h3 className="font-bold text-lg mb-2">主要ECサイト対応</h3>
              <p className="text-gray-600">
                Amazon、楽天、Yahoo!ショッピングの購入を自動取得
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="text-4xl mb-4">🔍</div>
              <h3 className="font-bold text-lg mb-2">サブスク検出</h3>
              <p className="text-gray-600">
                忘れているサブスクを自動検出してお知らせ
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
    </div>
  )
}