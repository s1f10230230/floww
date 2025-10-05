'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import {
  User,
  Shield,
  ChevronRight
} from 'lucide-react'
import { useToast, ToastContainer } from '@/app/components/Toast'

export default function Settings() {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

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
      toast.success('プロフィールを更新しました')
    }
    setLoading(false)
  }

  const tabs = [
    { id: 'profile', name: 'プロフィール', icon: User },
    { id: 'privacy', name: 'プライバシー', icon: Shield },
  ]

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
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

            </div>
          </div>
        </div>
      </div>
      </AppLayout>
    </>
  )
}