'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import { Copy, Check, Mail, ArrowRight, X } from 'lucide-react'
import toast, { Toaster } from 'react-hot-toast'

interface EmailProvider {
  id: string
  name: string
  icon: string
  setupSteps: string[]
  setupUrl: string
}

const EMAIL_PROVIDERS: EmailProvider[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    icon: '📧',
    setupUrl: 'https://mail.google.com/mail/u/0/#settings/filters',
    setupSteps: [
      '設定 → フィルタとブロック中のアドレス',
      '新しいフィルタを作成',
      'From欄に下記をコピペ → フィルタを作成',
      '次のアドレスに転送 → 下記アドレスをコピペ'
    ]
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    icon: '💌',
    setupUrl: 'https://mail.yahoo.co.jp/config/general',
    setupSteps: [
      '設定・利用規約 → メールの設定',
      'フィルター → フィルターを追加',
      'Fromに下記をコピペ',
      '転送先に下記アドレスをコピペ'
    ]
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: '📧',
    setupUrl: 'https://outlook.live.com/mail/0/options/mail/rules',
    setupSteps: [
      '設定 → ルール',
      '新しいルールを追加',
      '差出人に下記をコピペ',
      '転送先に下記アドレスをコピペ'
    ]
  }
]

export default function OnboardingStep2() {
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider>(EMAIL_PROVIDERS[0])
  const [forwardEmail, setForwardEmail] = useState('')
  const [filterText, setFilterText] = useState('')
  const [copied, setCopied] = useState<'email' | 'filter' | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [autoConfirm, setAutoConfirm] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setForwardEmail(`user-${user.id}@parse.floww-app.dev`)
    }

    // Load filter templates from step 1
    const templates = sessionStorage.getItem('selected_card_filters')
    if (templates) {
      const filters = JSON.parse(templates)
      const fromFilters = filters
        .map((f: any) => f.from)
        .filter(Boolean)
        .join(' OR ')
      setFilterText(fromFilters || 'カード会社のメール')
    }
  }

  const copyToClipboard = (text: string, type: 'email' | 'filter') => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    toast.success('コピーしました！')
    setTimeout(() => setCopied(null), 3000)
  }

  const handleComplete = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Mark email forwarding as configured
    await supabase
      .from('profiles')
      .update({ imap_enabled: true }) // Reuse this flag for forwarding
      .eq('id', user.id)

    router.push('/onboarding/step3')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <Toaster position="top-right" />

      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">✓</div>
            <div className="w-16 h-1 bg-blue-600"></div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">2</div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-8 h-8 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center font-semibold">3</div>
          </div>
          <p className="text-center text-sm text-gray-600">STEP 2 / 3</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            メール転送を設定（1回だけ）
          </h1>
          <p className="text-gray-600 mb-8">
            以降は完全自動。数分で終わります
          </p>

          {/* Provider Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              メールプロバイダーを選択
            </label>
            <div className="grid grid-cols-3 gap-3">
              {EMAIL_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider)}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    selectedProvider.id === provider.id
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

          {/* Forward Email */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
            <label className="block text-sm font-semibold text-blue-900 mb-3">
              転送先アドレス
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={forwardEmail}
                readOnly
                className="flex-1 px-4 py-3 bg-white border border-blue-300 rounded-lg font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(forwardEmail, 'email')}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                {copied === 'email' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Filter Text */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
            <label className="block text-sm font-semibold text-green-900 mb-3">
              フィルタ条件（From欄にコピー）
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={filterText}
                readOnly
                className="flex-1 px-4 py-3 bg-white border border-green-300 rounded-lg font-mono text-sm"
              />
              <button
                onClick={() => copyToClipboard(filterText, 'filter')}
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                {copied === 'filter' ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Auto Confirm Checkbox */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={autoConfirm}
                onChange={(e) => setAutoConfirm(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span>確認コードは自動で処理します</span>
            </label>
          </div>

          {/* Setup Button */}
          <button
            onClick={() => setShowModal(true)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <span>{selectedProvider.name}で設定する</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Skip Button */}
          <button
            onClick={handleComplete}
            className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
          >
            あとで設定する →
          </button>
        </div>

        {/* Setup Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedProvider.name} 設定手順
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <ol className="space-y-3 mb-6">
                {selectedProvider.setupSteps.map((step, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <p className="text-sm text-gray-700">{step}</p>
                  </li>
                ))}
              </ol>

              <a
                href={selectedProvider.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleComplete}
                className="block w-full py-3 bg-blue-600 text-white text-center font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                {selectedProvider.name}を開いて設定する
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}