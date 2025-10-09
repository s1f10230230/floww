'use client'

import { useRouter } from 'next/navigation'
import { Package, Sparkles, ArrowRight } from 'lucide-react'

export default function OnboardingStep3() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">✓</div>
            <div className="w-16 h-1 bg-blue-600"></div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">✓</div>
            <div className="w-16 h-1 bg-blue-600"></div>
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">3</div>
          </div>
          <p className="text-center text-sm text-gray-600">STEP 3 / 3</p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
              <Package className="w-12 h-12 text-purple-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              過去3か月も取り込みますか？
            </h1>
            <p className="text-gray-600">
              オプション：既存のメールから取引を抽出できます
            </p>
          </div>

          {/* Option Cards */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            {/* Import Now */}
            <button
              onClick={() => router.push('/settings/import-past-emails')}
              className="p-6 border-2 border-purple-300 bg-purple-50 rounded-2xl hover:border-purple-500 transition-all text-left group"
            >
              <Sparkles className="w-8 h-8 text-purple-600 mb-3" />
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                今すぐ取り込む
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Gmail/Yahoo からエクスポートしたファイルをアップロード
              </p>
              <div className="flex items-center text-purple-600 font-medium">
                <span>MBOXファイルをアップロード</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Skip */}
            <button
              onClick={async () => {
                // Mark onboarding complete
                const { createClient } = await import('@/app/lib/supabase-client')
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                  await supabase
                    .from('profiles')
                    .update({ plan_id: 'free' }) // Mark as completed onboarding
                    .eq('id', user.id)
                }
                router.push('/dashboard')
              }}
              className="p-6 border-2 border-gray-200 bg-white rounded-2xl hover:border-gray-300 transition-all text-left group"
            >
              <ArrowRight className="w-8 h-8 text-gray-400 mb-3" />
              <h3 className="font-bold text-lg text-gray-900 mb-2">
                あとで
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                今後のメールだけ自動取得（いつでも設定可能）
              </p>
              <div className="flex items-center text-gray-600 font-medium">
                <span>ダッシュボードへ</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>
          </div>

          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="font-semibold text-green-900">
                  セットアップ完了！
                </p>
                <p className="text-sm text-green-700">
                  メールが届き次第、自動的に取引に追加されます
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}