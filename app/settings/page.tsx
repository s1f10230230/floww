'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import {
  User,
  Mail,
  CreditCard,
  Bell,
  Shield,
  Palette,
  ChevronRight,
  Check
} from 'lucide-react'

export default function Settings() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailSummary: true,
    subscriptionAlert: true,
    unusualSpending: false,
    weeklyReport: false,
    monthlyReport: true
  })

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    setUser(user)

    // Load profile with plan info
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, subscription_plans(*)')
      .eq('id', user.id)
      .single()

    setProfile(profile)
  }

  const updateProfile = async () => {
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (!error) {
      alert('プロフィールを更新しました')
    }
    setLoading(false)
  }

  const tabs = [
    { id: 'profile', name: 'プロフィール', icon: User },
    { id: 'cards', name: 'カード設定', icon: CreditCard },
    { id: 'notifications', name: '通知', icon: Bell },
    { id: 'privacy', name: 'プライバシー', icon: Shield },
    { id: 'appearance', name: '表示設定', icon: Palette },
  ]

  return (
    <AppLayout user={user}>
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

        <div className="bg-white rounded-xl shadow-sm">
          <div className="grid lg:grid-cols-4">
            {/* Sidebar tabs */}
            <div className="lg:col-span-1 border-r">
              <nav className="p-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.name}
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                ))}
              </nav>
            </div>

            {/* Content area */}
            <div className="lg:col-span-3 p-6">
              {activeTab === 'profile' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">プロフィール設定</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        メールアドレス
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="w-full px-3 py-2 border rounded-lg bg-gray-50 text-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        名前
                      </label>
                      <input
                        type="text"
                        value={profile?.full_name || ''}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        現在のプラン
                      </label>
                      <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                        <div>
                          <p className="font-medium">{profile?.subscription_plans?.name || 'Free'}</p>
                          <p className="text-sm text-gray-500">
                            最大{profile?.subscription_plans?.max_cards || 2}枚のカード登録
                          </p>
                        </div>
                        <button
                          onClick={() => router.push('/upgrade')}
                          className="px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                        >
                          アップグレード
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={updateProfile}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      {loading ? '保存中...' : '保存'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'cards' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">カード設定</h2>

                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">登録カード会社</h3>
                    <div className="space-y-2">
                      {['楽天カード', '三井住友カード', 'JCBカード'].map((card) => (
                        <div key={card} className="flex items-center justify-between p-3 border rounded-lg">
                          <span>{card}</span>
                          <button className="text-red-500 text-sm hover:text-red-600">
                            削除
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => router.push('/cards')}
                      className="mt-4 px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50"
                    >
                      カード管理画面へ
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">通知設定</h2>

                  <div className="space-y-4">
                    {Object.entries({
                      emailSummary: 'メールサマリー',
                      subscriptionAlert: 'サブスク更新アラート',
                      unusualSpending: '異常な支出の通知',
                      weeklyReport: '週次レポート',
                      monthlyReport: '月次レポート'
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{label}</p>
                          <p className="text-sm text-gray-500">
                            {key === 'emailSummary' && '毎日の支出サマリーをメールで受け取る'}
                            {key === 'subscriptionAlert' && 'サブスクの更新前に通知を受け取る'}
                            {key === 'unusualSpending' && '通常と異なる支出パターンを検知したら通知'}
                            {key === 'weeklyReport' && '週間の支出レポートを受け取る'}
                            {key === 'monthlyReport' && '月間の支出レポートを受け取る'}
                          </p>
                        </div>
                        <button
                          onClick={() => setNotifications({
                            ...notifications,
                            [key]: !notifications[key as keyof typeof notifications]
                          })}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            notifications[key as keyof typeof notifications]
                              ? 'bg-blue-500'
                              : 'bg-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            notifications[key as keyof typeof notifications]
                              ? 'translate-x-6'
                              : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">プライバシー設定</h2>

                  <div className="space-y-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-900">データの安全性</p>
                          <p className="text-sm text-blue-700 mt-1">
                            あなたのデータは暗号化され、安全に保管されています。
                            メール内容は金額抽出のみに使用され、第三者と共有されることはありません。
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-3">データ管理</h3>
                      <div className="space-y-3">
                        <button className="w-full text-left p-3 border rounded-lg hover:bg-gray-50">
                          <p className="font-medium">データをエクスポート</p>
                          <p className="text-sm text-gray-500">すべてのデータをCSV形式でダウンロード</p>
                        </button>
                        <button className="w-full text-left p-3 border border-red-200 rounded-lg hover:bg-red-50">
                          <p className="font-medium text-red-600">アカウントを削除</p>
                          <p className="text-sm text-gray-500">すべてのデータを完全に削除します</p>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h2 className="text-lg font-semibold mb-4">表示設定</h2>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        テーマ
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {['ライト', 'ダーク', 'システム'].map((theme) => (
                          <button
                            key={theme}
                            className="p-3 border-2 rounded-lg hover:border-blue-500 transition-colors"
                          >
                            {theme}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        通貨表示
                      </label>
                      <select className="w-full px-3 py-2 border rounded-lg">
                        <option>円 (¥)</option>
                        <option>ドル ($)</option>
                        <option>ユーロ (€)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        日付形式
                      </label>
                      <select className="w-full px-3 py-2 border rounded-lg">
                        <option>YYYY/MM/DD</option>
                        <option>MM/DD/YYYY</option>
                        <option>DD/MM/YYYY</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}