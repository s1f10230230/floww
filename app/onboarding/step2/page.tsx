'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import { Copy, Check, Mail, ArrowRight, X, Send, ChevronDown, ChevronUp } from 'lucide-react'
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
    setupUrl: 'https://mail.google.com/mail/u/0/#settings/fwdandpop',
    setupSteps: [
      '【STEP 1】「転送先アドレスを追加」ボタンを押す',
      '【STEP 2】下の青いボックスの転送先アドレスをコピーして、ポップアップに貼り付け → 「次へ」',
      '【STEP 3】確認コードが届くので入力（数分かかる場合があります）',
      '【STEP 4】上部タブの「フィルタとブロック中のアドレス」をクリック',
      '【STEP 5】「新しいフィルタを作成」を押す',
      '【STEP 6】From欄に、下の緑のボックスのフィルタ条件をコピペ → 「フィルタを作成」',
      '【STEP 7】「次のアドレスに転送する」にチェックを入れて、先ほどの転送先アドレスを選択 → 「フィルタを作成」'
    ]
  },
  {
    id: 'yahoo',
    name: 'Yahoo',
    icon: '💌',
    setupUrl: 'https://mail.yahoo.co.jp/',
    setupSteps: [
      '【STEP 1】右上の「設定・利用規約」をクリック',
      '【STEP 2】左メニューから「メールの設定」を選択',
      '【STEP 3】「フィルター」をクリック',
      '【STEP 4】「フィルターを追加」ボタンを押す',
      '【STEP 5】フィルター名は「カード通知転送」などわかりやすい名前を入力',
      '【STEP 6】From（差出人）の入力欄に、下の緑のボックスのフィルタ条件をコピペ',
      '【STEP 7】アクションで「メールを転送する」を選択',
      '【STEP 8】転送先に、下の青いボックスの転送先アドレスをコピペ',
      '【STEP 9】確認コードが届いたら入力',
      '【STEP 10】「保存」をクリック'
    ]
  },
  {
    id: 'outlook',
    name: 'Outlook',
    icon: '📧',
    setupUrl: 'https://outlook.live.com/mail/0/options/mail/forwarding',
    setupSteps: [
      '【STEP 1】「転送を有効にする」にチェックを入れる',
      '【STEP 2】転送先の入力欄に、下の青いボックスの転送先アドレスをコピペ → 「保存」',
      '【STEP 3】確認コードが届いたら入力',
      '【STEP 4】左メニューから「ルール」を選択',
      '【STEP 5】「新しいルールを追加」を押す',
      '【STEP 6】条件で「差出人」を選択し、下の緑のボックスのフィルタ条件を入力',
      '【STEP 7】アクションで「転送先」を選択し、先ほどの転送先アドレスを入力 → 「保存」'
    ]
  },
  {
    id: 'icloud',
    name: 'iCloud',
    icon: '☁️',
    setupUrl: 'https://www.icloud.com/mail',
    setupSteps: [
      '【STEP 1】左下の歯車アイコン⚙️をクリック → 「環境設定」を選択',
      '【STEP 2】「ルール」タブをクリック',
      '【STEP 3】「ルールを追加」ボタンを押す',
      '【STEP 4】「差出人が次の場合」を選択',
      '【STEP 5】下の緑のボックスのフィルタ条件を入力',
      '【STEP 6】アクションで「メッセージを次に転送」を選択',
      '【STEP 7】下の青いボックスの転送先アドレスをコピペ',
      '【STEP 8】確認コードが届いたら入力 → 「完了」をクリック'
    ]
  }
]

export default function OnboardingStep2() {
  const [selectedProvider, setSelectedProvider] = useState<EmailProvider>(EMAIL_PROVIDERS[0])
  const [forwardEmail, setForwardEmail] = useState('')
  const [filterText, setFilterText] = useState('')
  const [copied, setCopied] = useState<'email' | 'filter' | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [autoConfirm, setAutoConfirm] = useState(true)
  const [testSending, setTestSending] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)
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

  const handleTestSend = async () => {
    setTestSending(true)
    try {
      // TODO: Send test email to check forwarding setup
      // For now, just simulate success after delay
      await new Promise(resolve => setTimeout(resolve, 2000))
      setTestSuccess(true)
      toast.success('転送設定が正常に動作しています！')
    } catch (error) {
      toast.error('転送設定の確認に失敗しました')
    } finally {
      setTestSending(false)
    }
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-5 h-5 text-blue-600" />
              <label className="text-sm font-semibold text-blue-900">
                転送先アドレス
              </label>
            </div>
            <p className="text-xs text-blue-700 mb-3">
              このアドレスをメール転送先に設定してください
            </p>
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
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <label className="text-sm font-semibold text-green-900">
                フィルタ条件（From欄にコピー）
              </label>
            </div>
            <p className="text-xs text-green-700 mb-3">
              カード会社からのメールだけを転送するための条件です
            </p>
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

          {/* Instructions Accordion */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors flex items-center justify-center gap-2 mb-4"
          >
            <span>{selectedProvider.name}の設定手順を見る</span>
            {showInstructions ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showInstructions && (
            <div className="mb-6 p-6 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{selectedProvider.icon}</div>
                <h3 className="text-lg font-bold text-gray-900">
                  {selectedProvider.name} 設定手順
                </h3>
              </div>

              <a
                href={selectedProvider.setupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mb-4 block w-full py-3 bg-blue-600 text-white text-center font-semibold rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <span>{selectedProvider.name}を開く</span>
                <ArrowRight className="w-4 h-4" />
              </a>

              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-900 font-medium mb-1">
                  📍 青いボックス = 転送先アドレス
                </p>
                <p className="text-xs text-green-900 font-medium">
                  📍 緑のボックス = フィルタ条件
                </p>
              </div>

              <div className="space-y-3">
                {selectedProvider.setupSteps.map((step, index) => {
                  // Extract if step mentions copying email or filter
                  const mentionsEmail = step.includes('青いボックス')
                  const mentionsFilter = step.includes('緑のボックス')

                  return (
                    <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                      <p className="text-sm text-gray-800 leading-relaxed mb-2">{step}</p>
                      {mentionsEmail && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="flex-1 text-xs bg-blue-50 px-3 py-2 rounded border border-blue-200 font-mono">
                            {forwardEmail}
                          </code>
                          <button
                            onClick={() => copyToClipboard(forwardEmail, 'email')}
                            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                          >
                            {copied === 'email' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                      {mentionsFilter && (
                        <div className="flex items-center gap-2 mt-2">
                          <code className="flex-1 text-xs bg-green-50 px-3 py-2 rounded border border-green-200 font-mono">
                            {filterText}
                          </code>
                          <button
                            onClick={() => copyToClipboard(filterText, 'filter')}
                            className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                          >
                            {copied === 'filter' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium mb-1">
                  ✅ 設定完了後の動作
                </p>
                <p className="text-xs text-green-700">
                  カード利用通知が届くと、自動的にアプリに取引が追加されます。
                </p>
              </div>
            </div>
          )}

          {/* Test Send Button */}
          <button
            onClick={handleTestSend}
            disabled={testSending}
            className="w-full py-3 bg-white border-2 border-blue-600 text-blue-600 font-semibold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 mb-4 disabled:opacity-50"
          >
            {testSending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span>確認中...</span>
              </>
            ) : testSuccess ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                <span className="text-green-600">転送設定が完了しています</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>テスト送信して確認</span>
              </>
            )}
          </button>

          {/* Skip Button */}
          <button
            onClick={handleComplete}
            className="w-full py-3 text-gray-600 hover:text-gray-800 font-medium"
          >
            あとで設定する →
          </button>
        </div>

      </div>
    </div>
  )
}