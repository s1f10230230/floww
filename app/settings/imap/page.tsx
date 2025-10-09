'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'

interface ImapProvider {
  name: string
  host: string
  port: number
  setupUrl: string
  icon: string
}

const IMAP_PROVIDERS: ImapProvider[] = [
  {
    name: 'Gmail',
    host: 'imap.gmail.com',
    port: 993,
    setupUrl: 'https://myaccount.google.com/apppasswords',
    icon: '📧'
  },
  {
    name: 'Yahoo',
    host: 'imap.mail.yahoo.com',
    port: 993,
    setupUrl: 'https://login.yahoo.com/account/security',
    icon: '💌'
  },
  {
    name: 'Outlook',
    host: 'outlook.office365.com',
    port: 993,
    setupUrl: 'https://account.microsoft.com/security',
    icon: '📮'
  },
  {
    name: 'iCloud',
    host: 'imap.mail.me.com',
    port: 993,
    setupUrl: 'https://appleid.apple.com/account/manage',
    icon: '☁️'
  }
]

export default function ImapSettingsPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<ImapProvider>(IMAP_PROVIDERS[0])
  const [loading, setLoading] = useState(false)
  const [testing, setTesting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadExistingConfig()
  }, [])

  const loadExistingConfig = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('imap_email, imap_host, imap_port')
      .eq('id', user.id)
      .single()

    if (profile?.imap_email) {
      setEmail(profile.imap_email)
      const provider = IMAP_PROVIDERS.find(p => p.host === profile.imap_host)
      if (provider) setSelectedProvider(provider)
    }
  }

  const testConnection = async () => {
    if (!email || !password) {
      toast.error('メールアドレスとパスワードを入力してください')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/imap/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          host: selectedProvider.host,
          port: selectedProvider.port
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('接続テスト成功！')
      } else {
        toast.error(data.error || '接続に失敗しました')
      }
    } catch (error: any) {
      toast.error('接続エラー: ' + error.message)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!email || !password) {
      toast.error('メールアドレスとパスワードを入力してください')
      return
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const response = await fetch('/api/imap/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          host: selectedProvider.host,
          port: selectedProvider.port
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || '保存に失敗しました')
      }

      toast.success('IMAP 設定を保存しました！')
      setTimeout(() => router.push('/dashboard'), 1500)

    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <Toaster position="top-right" />

      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">メール連携設定</h1>
          <p className="text-gray-600 mb-8">
            アプリ専用パスワードを使用して、メールを安全に同期します
          </p>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              メールプロバイダー
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {IMAP_PROVIDERS.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() => setSelectedProvider(provider)}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    selectedProvider.name === provider.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-3xl mb-2">{provider.icon}</div>
                  <div className="text-sm font-medium">{provider.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* App Password Guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              📋 アプリ専用パスワードの取得方法
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>下のリンクから {selectedProvider.name} のセキュリティ設定を開く</li>
              <li>「アプリパスワード」または「App-Specific Password」を生成</li>
              <li>生成されたパスワードをコピーして、下の欄に貼り付け</li>
            </ol>
            <a
              href={selectedProvider.setupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedProvider.name} セキュリティ設定を開く →
            </a>
          </div>

          {/* Email Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              アプリ専用パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="xxxx-xxxx-xxxx-xxxx"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-2">
              ※ 通常のパスワードではなく、アプリ専用パスワードを使用してください
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={testConnection}
              disabled={testing}
              className="flex-1 px-6 py-3 border-2 border-blue-500 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors disabled:opacity-50"
            >
              {testing ? '接続テスト中...' : '接続テスト'}
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存して完了'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
