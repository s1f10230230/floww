'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import AppLayout from '@/app/components/AppLayout'
import { BookOpen, CreditCard, Tag, Mail, BarChart3, CheckCircle } from 'lucide-react'

export default function GuidePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)

  return (
    <AppLayout user={user}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3 mb-2">
            <BookOpen className="w-8 h-8" />
            Floww 使い方ガイド
          </h1>
          <p className="text-gray-600">
            Gmail連携で自動的に家計簿を作成。Flowwの使い方を順番に説明します。
          </p>
        </div>

        {/* Step 1: Gmail連携 */}
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
              1
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Gmail連携
              </h2>
              <p className="text-gray-700 mb-3">
                まずはGmailアカウントを連携して、カード利用通知メールを取得できるようにします。
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900 mb-2">手順:</p>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>ダッシュボードの「Gmail連携」ボタンをクリック</li>
                  <li>Googleアカウントでログイン</li>
                  <li>メール読み取り権限を許可</li>
                </ol>
              </div>
            </div>
          </div>
        </section>

        {/* Step 2: カード会社を選択 */}
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
              2
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                カード会社を選択
              </h2>
              <p className="text-gray-700 mb-3">
                使用しているクレジットカード会社を選択します。これにより、そのカード会社からの利用通知メールのみを取得します。
              </p>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-900 mb-2">手順:</p>
                <ol className="text-sm text-green-800 space-y-1 list-decimal list-inside">
                  <li>サイドバーから「カード設定」ページへ移動</li>
                  <li>使用中のカード会社（楽天カード、JCBカードなど）を選択</li>
                  <li>「選択」ボタンをクリックして登録</li>
                </ol>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <p className="font-medium">💡 対応カード会社:</p>
                <p>楽天カード、JCBカード、三井住友カード、エポスカード、セゾンカードなど</p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 3: メール同期 */}
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
              3
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                メール同期
              </h2>
              <p className="text-gray-700 mb-3">
                「メール同期」ボタンをクリックして、カード利用通知メールを取得します。
              </p>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-purple-900 mb-2">同期のポイント:</p>
                <ul className="text-sm text-purple-800 space-y-1 list-disc list-inside">
                  <li><strong>速報版メールは除外:</strong> 楽天カードの速報版は利用先が不明なため自動的にスキップされます</li>
                  <li><strong>確定版のみ処理:</strong> 利用先・金額・日付が全て記載された確定版メールのみ取引データとして登録されます</li>
                  <li><strong>増分同期:</strong> 前回同期以降の新しいメールのみを取得します</li>
                  <li><strong>最大件数:</strong> 一度に取得する件数を設定できます（デフォルト: 500件）</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Step 4: カテゴリ設定 */}
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
              4
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5" />
                カテゴリ設定（任意）
              </h2>
              <p className="text-gray-700 mb-3">
                利用先ごとにカテゴリを設定して、支出をグループ化できます。
              </p>
              <div className="bg-orange-50 p-4 rounded-lg mb-3">
                <p className="text-sm font-medium text-orange-900 mb-2">設定方法:</p>
                <ol className="text-sm text-orange-800 space-y-1 list-decimal list-inside">
                  <li>サイドバーから「カテゴリ設定」ページへ移動</li>
                  <li>各利用先（merchant）にカテゴリを入力</li>
                  <li>「すべて保存」ボタンで一括保存</li>
                </ol>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-2">カテゴリの使い方:</p>
                <p className="text-sm text-gray-700 mb-2">
                  同じカテゴリを複数の利用先に設定することで、グループ化できます。
                </p>
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>例1:</strong> 「ｾﾌﾞﾝｲﾚﾌﾞﾝ」「フアミリ-マ-ト」→ 両方に「コンビニ」</p>
                  <p><strong>例2:</strong> 「ﾓﾊﾞｲﾙﾊﾟｽﾓﾁﾔ-ｼﾞ」「モバイルパスモチヤ-ジ」→ 両方に「交通費」</p>
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-600">
                <p className="font-medium">💡 推奨カテゴリ:</p>
                <p>食費、コンビニ、交通費、サブスク、EC、医療費、光熱費、通信費など</p>
              </div>
            </div>
          </div>
        </section>

        {/* Step 5: ダッシュボードで確認 */}
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
              5
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                ダッシュボードで確認
              </h2>
              <p className="text-gray-700 mb-3">
                ダッシュボードで支出状況を確認できます。
              </p>
              <div className="bg-pink-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-pink-900 mb-2">表示される情報:</p>
                <ul className="text-sm text-pink-800 space-y-1 list-disc list-inside">
                  <li><strong>今月の支出:</strong> 選択した月の合計支出額</li>
                  <li><strong>継続的な支払い:</strong> サブスク・交通費・海外利用を自動検出</li>
                  <li><strong>カテゴリ別内訳:</strong> 設定したカテゴリごとの支出</li>
                  <li><strong>カード別利用状況:</strong> カード会社ごとの利用額と件数</li>
                  <li><strong>最近の取引:</strong> 取引履歴を時系列で表示</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* 継続的な支払いについて */}
        <section className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            継続的な支払いの自動検出
          </h2>
          <p className="text-gray-700 mb-3">
            Flowwは以下のパターンを自動的に「継続的な支払い」として検出します。
          </p>
          <div className="space-y-3">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-900 mb-1">🔁 サブスク（定期支払い）</p>
              <p className="text-sm text-purple-800">
                同じ利用先・同じ金額が定期的に（月次・年次・週次）発生している場合に検出
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-1">🚃 交通費チャージ</p>
              <p className="text-sm text-green-800">
                PASMO、Suica、ICOCAなどのチャージが2回以上検出された場合に登録
              </p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-1">🌍 海外利用</p>
              <p className="text-sm text-blue-800">
                海外利用の取引は1回でも検出されれば継続的な支払いとして登録（サブスクの可能性が高いため）
              </p>
            </div>
          </div>
        </section>

        {/* 注意事項 */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-3 text-amber-900">⚠️ 注意事項</h2>
          <ul className="text-sm text-amber-800 space-y-2 list-disc list-inside">
            <li>Gmailの読み取り権限は取引メールの解析のみに使用されます</li>
            <li>データはSupabaseに安全に保存され、他のユーザーには公開されません</li>
            <li>メール同期は手動で行う必要があります（自動同期はGmail規約上実装できません）</li>
            <li>楽天カードの速報版メールは利用先が不明なため、確定版メールのみ処理されます</li>
            <li>カテゴリは任意設定です。未設定でも取引データは正常に表示されます</li>
          </ul>
        </section>

        {/* フッター */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            ダッシュボードへ戻る
          </button>
        </div>
      </div>
    </AppLayout>
  )
}
