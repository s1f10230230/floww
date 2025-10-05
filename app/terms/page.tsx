import Link from 'next/link'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700">
            ← ホームに戻る
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-8">利用規約</h1>

        <div className="bg-white rounded-lg shadow-md p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第1条（適用）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>本規約は、Floww（以下「本サービス」）の利用に関する条件を定めるものです。</li>
              <li>ユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。</li>
              <li>本規約に同意できない場合、本サービスをご利用いただけません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第2条（定義）</h2>
            <div className="space-y-2 ml-4">
              <p className="text-gray-700">本規約において使用する用語の定義は以下の通りです。</p>
              <dl className="space-y-2">
                <dt className="font-medium text-gray-900">1. 「本サービス」</dt>
                <dd className="text-gray-700 ml-4">Floww が提供する自動家計簿およびサブスクリプション管理サービス</dd>

                <dt className="font-medium text-gray-900">2. 「ユーザー」</dt>
                <dd className="text-gray-700 ml-4">本サービスを利用する全ての個人</dd>

                <dt className="font-medium text-gray-900">3. 「登録情報」</dt>
                <dd className="text-gray-700 ml-4">ユーザーが本サービスに登録した情報</dd>

                <dt className="font-medium text-gray-900">4. 「取引情報」</dt>
                <dd className="text-gray-700 ml-4">Gmail から自動収集されるクレジットカード取引データ</dd>
              </dl>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第3条（アカウント登録）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>ユーザーは、Google アカウントを使用して本サービスに登録できます。</li>
              <li>登録には、Gmail へのアクセス許可が必要です。</li>
              <li>ユーザーは、登録情報を正確かつ最新の状態に保つ責任を負います。</li>
              <li>アカウント情報の管理責任はユーザーにあり、第三者による不正利用について当サービスは責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第4条（プラン）</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">1. Free プラン</h3>
                <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                  <li>料金: 無料</li>
                  <li>最大2枚のカード登録</li>
                  <li>データ保持期間: 3ヶ月</li>
                  <li>広告表示あり</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">2. Standard プラン</h3>
                <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                  <li>料金: 月額¥480（年払い¥4,800）</li>
                  <li>最大5枚のカード登録</li>
                  <li>データ無制限保持</li>
                  <li>広告なし</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">3. Premium プラン</h3>
                <ul className="list-disc list-inside text-gray-700 ml-4 space-y-1">
                  <li>料金: 月額¥880（年払い¥8,800）</li>
                  <li>最大10枚のカード登録</li>
                  <li>APIアクセス</li>
                  <li>その他Standardプランの全機能</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第5条（支払い）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>有料プランの料金は、Stripe を通じて決済されます。</li>
              <li>月額プランは毎月自動更新されます。</li>
              <li>年額プランは毎年自動更新されます。</li>
              <li>支払いに失敗した場合、サービスへのアクセスが制限される場合があります。</li>
              <li>料金の返金は、理由の如何を問わず行いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第6条（解約）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>ユーザーは、いつでもプランを解約できます。</li>
              <li>解約は、設定ページまたは Stripe カスタマーポータルから行えます。</li>
              <li>解約後も、現在の請求期間終了まではサービスを利用できます。</li>
              <li>Free プランへのダウングレードは即座に反映されます。</li>
              <li>Free プランのデータ保持期間（3ヶ月）を超えたデータは自動削除されます。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第7条（禁止事項）</h2>
            <p className="text-gray-700 mb-2">ユーザーは、以下の行為を行ってはなりません。</p>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>他のユーザーまたは第三者の権利を侵害する行為</li>
              <li>虚偽の情報を登録する行為</li>
              <li>本サービスのシステムに不正にアクセスする行為</li>
              <li>本サービスのリバースエンジニアリング、逆コンパイル、逆アセンブル</li>
              <li>API の不正利用（Premium プラン契約者を除く）</li>
              <li>複数アカウントの作成による不正利用</li>
              <li>その他、当サービスが不適切と判断する行為</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第8条（サービスの変更・停止）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>当サービスは、ユーザーへの事前通知なく、本サービスの内容を変更または停止することができます。</li>
              <li>以下の場合、サービスを一時的に停止することがあります：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>システムの保守・点検</li>
                  <li>システム障害の発生</li>
                  <li>天災地変等の不可抗力</li>
                </ul>
              </li>
              <li>サービスの変更・停止により生じた損害について、当サービスは責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第9条（知的財産権）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>本サービスに関する知的財産権は、当サービスに帰属します。</li>
              <li>ユーザーの取引情報は、ユーザーに帰属します。</li>
              <li>ユーザーは、本サービスの利用に必要な範囲で、取引情報の使用を当サービスに許諾するものとします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第10条（免責事項）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>本サービスは「現状有姿」で提供され、明示または黙示を問わず、いかなる保証も行いません。</li>
              <li>当サービスは、以下について保証しません：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>本サービスの完全性、正確性、有用性</li>
                  <li>取引情報の自動抽出の正確性</li>
                  <li>サービスの中断・エラーが発生しないこと</li>
                </ul>
              </li>
              <li>ユーザーは、自己の責任において本サービスを利用するものとします。</li>
              <li>本サービスの利用により生じた損害について、当サービスは一切の責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第11条（データのバックアップ）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>当サービスは、データの保存に努めますが、データの損失を完全に防ぐことは保証しません。</li>
              <li>ユーザーは、必要に応じて自己の責任でデータのバックアップを行ってください。</li>
              <li>データ損失により生じた損害について、当サービスは責任を負いません。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第12条（アカウントの削除・停止）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>ユーザーは、設定ページからいつでもアカウントを削除できます。</li>
              <li>アカウント削除により、全てのデータが即座に削除されます。</li>
              <li>当サービスは、以下の場合にアカウントを停止または削除できます：
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                  <li>本規約に違反した場合</li>
                  <li>長期間の未使用（1年以上）</li>
                  <li>料金の未払いが続く場合</li>
                </ul>
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第13条（プライバシー）</h2>
            <p className="text-gray-700">
              個人情報の取扱いについては、
              <Link href="/privacy" className="text-blue-600 hover:underline">
                プライバシーポリシー
              </Link>
              をご確認ください。
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第14条（規約の変更）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>当サービスは、本規約を随時変更できるものとします。</li>
              <li>重要な変更がある場合は、サービス上で通知します。</li>
              <li>変更後も本サービスを継続利用した場合、変更に同意したものとみなされます。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第15条（準拠法・管轄裁判所）</h2>
            <ol className="list-decimal list-inside text-gray-700 space-y-2 ml-4">
              <li>本規約は、日本法に準拠します。</li>
              <li>本サービスに関する紛争については、東京地方裁判所を第一審の専属的合意管轄裁判所とします。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">第16条（お問い合わせ）</h2>
            <p className="text-gray-700">
              本規約に関するご質問は、
              <Link href="/feedback" className="text-blue-600 hover:underline">
                フィードバックページ
              </Link>
              からお問い合わせください。
            </p>
          </section>

          <section className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              制定日: 2024年10月7日<br />
              最終更新日: 2024年10月7日
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
