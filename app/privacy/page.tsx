import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">プライバシーポリシー</h1>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. はじめに</h2>
            <p className="text-gray-700 leading-relaxed">
              Floww（以下「当サービス」）は、ユーザーの皆様のプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、当サービスがどのような情報を収集し、どのように使用・管理するかを説明するものです。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 収集する情報</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.1 アカウント情報</h3>
                <p className="text-gray-700 leading-relaxed">
                  Google OAuth認証を通じて、以下の情報を収集します：
                </p>
                <ul className="list-disc list-inside text-gray-700 mt-2 ml-4">
                  <li>メールアドレス</li>
                  <li>名前</li>
                  <li>プロフィール画像</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.2 Gmail データ</h3>
                <p className="text-gray-700 leading-relaxed">
                  Gmail API を使用して、クレジットカードの取引明細メールを読み取ります。収集される情報：
                </p>
                <ul className="list-disc list-inside text-gray-700 mt-2 ml-4">
                  <li>メール件名</li>
                  <li>メール本文（取引情報の抽出のみ）</li>
                  <li>送信者情報</li>
                  <li>受信日時</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.3 取引情報</h3>
                <p className="text-gray-700 leading-relaxed">
                  メールから自動抽出される情報：
                </p>
                <ul className="list-disc list-inside text-gray-700 mt-2 ml-4">
                  <li>取引金額</li>
                  <li>取引日時</li>
                  <li>加盟店名</li>
                  <li>カード情報（下4桁のみ）</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2.4 使用状況データ</h3>
                <ul className="list-disc list-inside text-gray-700 ml-4">
                  <li>アクセス日時</li>
                  <li>IPアドレス</li>
                  <li>デバイス情報</li>
                  <li>ブラウザ情報</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 情報の利用目的</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              収集した情報は以下の目的で利用します：
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>サービスの提供・運営</li>
              <li>自動家計簿機能の提供</li>
              <li>サブスクリプション管理機能の提供</li>
              <li>ユーザーサポート</li>
              <li>サービスの改善・新機能の開発</li>
              <li>不正利用の防止</li>
              <li>利用規約違反の対応</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 情報の管理と保護</h2>
            <div className="space-y-3">
              <p className="text-gray-700 leading-relaxed">
                当サービスは、Supabase を使用してデータを安全に保管します。すべてのデータは暗号化され、適切なセキュリティ対策が施されています。
              </p>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">4.1 データ保持期間</h3>
                <ul className="list-disc list-inside text-gray-700 ml-4">
                  <li>Freeプラン：3ヶ月間</li>
                  <li>Standard/Premiumプラン：無制限</li>
                  <li>アカウント削除時：即座に削除</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 第三者サービス</h2>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">5.1 Google サービス</h3>
                <p className="text-gray-700 leading-relaxed">
                  認証とメール読み取りに Google OAuth と Gmail API を使用します。Google のプライバシーポリシーは{' '}
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    こちら
                  </a>
                  をご覧ください。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">5.2 Google AdSense（Freeプランのみ）</h3>
                <p className="text-gray-700 leading-relaxed">
                  Freeプランでは、Google AdSense による広告を表示します。AdSense は Cookie を使用して、関連性の高い広告を配信します。詳細は{' '}
                  <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    Google 広告のポリシー
                  </a>
                  をご確認ください。
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">5.3 Stripe</h3>
                <p className="text-gray-700 leading-relaxed">
                  決済処理に Stripe を使用します。クレジットカード情報は当サービスで保存せず、Stripe が安全に処理します。
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookie の使用</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、以下の目的で Cookie を使用します：
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 mt-2 space-y-1">
              <li>ログイン状態の維持</li>
              <li>ユーザー設定の保存</li>
              <li>サービスの利用状況分析</li>
              <li>広告の配信（Freeプランのみ）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 情報の第三者提供</h2>
            <p className="text-gray-700 leading-relaxed">
              当サービスは、以下の場合を除き、ユーザーの個人情報を第三者に提供しません：
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 mt-2 space-y-1">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく場合</li>
              <li>人の生命、身体または財産の保護のために必要な場合</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. ユーザーの権利</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              ユーザーは以下の権利を有します：
            </p>
            <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
              <li>個人情報の開示請求</li>
              <li>個人情報の訂正・削除</li>
              <li>サービスの利用停止</li>
              <li>アカウントの削除（設定ページから実行可能）</li>
              <li>Gmail へのアクセス許可の取り消し（Google アカウント設定から可能）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Gmail API の使用について</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed mb-2">
                Floww の Gmail API の使用は、{' '}
                <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                  Google API サービスのユーザーデータに関するポリシー
                </a>
                に準拠しています。
              </p>
              <ul className="list-disc list-inside text-gray-700 ml-4 mt-2 space-y-1">
                <li>クレジットカード取引メールの読み取りのみに使用</li>
                <li>メールの送信、削除、変更は行いません</li>
                <li>取引情報以外のメールは読み取りません</li>
                <li>収集したデータを第三者に販売しません</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. プライバシーポリシーの変更</h2>
            <p className="text-gray-700 leading-relaxed">
              本プライバシーポリシーは、法令の変更やサービスの改善に伴い、予告なく変更されることがあります。重要な変更がある場合は、サービス上で通知します。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. お問い合わせ</h2>
            <p className="text-gray-700 leading-relaxed">
              プライバシーに関するご質問やご要望は、
              <Link href="/feedback" className="text-blue-600 hover:underline">
                フィードバックページ
              </Link>
              からお問い合わせください。
            </p>
          </section>

          <section className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              最終更新日: 2024年10月7日
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
