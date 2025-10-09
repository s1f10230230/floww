'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { Mail, Copy, CheckCircle, ArrowRight } from 'lucide-react'

export default function EmailForwardSettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [forwardEmail, setForwardEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUser(user)
      // Generate unique forward email
      setForwardEmail(`user-${user.id}@parse.floww-app.dev`)
    } else {
      router.push('/')
    }
  }

  const copyEmail = () => {
    navigator.clipboard.writeText(forwardEmail)
    setCopied(true)
    toast.success('コピーしました！')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <Toaster position="top-right" />

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            メール転送設定（CASA回避版）
          </h1>
          <p className="text-gray-600 mb-8">
            Gmail/Yahoo/Outlookの自動転送を使って、審査なしでメールを連携します
          </p>

          {/* Step 1: Your Forward Email */}
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-blue-900 mb-4">
                📮 あなた専用の転送先アドレス
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={forwardEmail}
                  readOnly
                  className="flex-1 px-4 py-3 bg-white border border-blue-300 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={copyEmail}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  {copied ? 'コピー済み' : 'コピー'}
                </button>
              </div>
            </div>
          </div>

          {/* Step 2: Setup Instructions */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">
              設定方法（プロバイダー別）
            </h2>

            {/* Gmail */}
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#EA4335">
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
                </svg>
                Gmail の設定
              </h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Gmail を開き、右上の歯車 → 「すべての設定を表示」</li>
                <li>2. 「フィルタとブロック中のアドレス」タブを選択</li>
                <li>3. 「新しいフィルタを作成」をクリック</li>
                <li>4. From欄に「楽天カード OR 三井住友 OR JCB」等を入力</li>
                <li>5. 「フィルタを作成」→「次のアドレスに転送」にチェック</li>
                <li>6. 上記の転送先アドレスを入力して保存</li>
              </ol>
              <a
                href="https://mail.google.com/mail/u/0/#settings/filters"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                Gmail フィルタ設定を開く <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Yahoo */}
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                💌 Yahoo!メール の設定
              </h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Yahoo!メールを開き、右上の「設定・利用規約」</li>
                <li>2. 「メールの設定」→「フィルター」を選択</li>
                <li>3. 「フィルターを追加」をクリック</li>
                <li>4. Fromに「カード会社のメールアドレス」を入力</li>
                <li>5. 「移動先フォルダー」で「転送」を選択</li>
                <li>6. 上記の転送先アドレスを入力して保存</li>
              </ol>
              <a
                href="https://mail.yahoo.co.jp/config/general"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-purple-600 hover:text-purple-700 font-medium"
              >
                Yahoo!メール設定を開く <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Outlook */}
            <div className="border border-gray-200 rounded-xl p-6">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                📧 Outlook の設定
              </h3>
              <ol className="space-y-2 text-sm text-gray-700">
                <li>1. Outlook.comを開き、右上の歯車 → 「Outlookのすべての設定を表示」</li>
                <li>2. 「メール」→「ルール」を選択</li>
                <li>3. 「新しいルールを追加」をクリック</li>
                <li>4. 条件で「差出人」を選択し、カード会社のアドレスを入力</li>
                <li>5. アクションで「転送」を選択</li>
                <li>6. 上記の転送先アドレスを入力して保存</li>
              </ol>
              <a
                href="https://outlook.live.com/mail/0/options/mail/rules"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 mt-3 text-blue-600 hover:text-blue-700 font-medium"
              >
                Outlook ルール設定を開く <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Benefits */}
          <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
            <h3 className="font-semibold text-green-900 mb-3">
              ✨ このメソッドのメリット
            </h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li>✓ Google CASA 評価不要（$75,000 節約）</li>
              <li>✓ リアルタイム受信（Webhook なので即座に処理）</li>
              <li>✓ 全メールプロバイダー対応</li>
              <li>✓ Vercel のタイムアウト問題なし</li>
              <li>✓ アプリパスワード不要（セキュア）</li>
            </ul>
          </div>

          {/* Optional: Import Past Emails */}
          <div className="mt-8 bg-purple-50 border border-purple-200 rounded-xl p-6">
            <h3 className="font-semibold text-purple-900 mb-2">
              📦 過去のメールも取り込みたい方へ（オプション）
            </h3>
            <p className="text-sm text-purple-800 mb-4">
              過去3ヶ月分のカード利用通知を一括で取り込むことができます
            </p>
            <button
              onClick={() => router.push('/settings/import-past-emails')}
              className="px-6 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors"
            >
              過去メールを取り込む
            </button>
          </div>

          {/* Complete Button */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              設定完了！ダッシュボードへ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}