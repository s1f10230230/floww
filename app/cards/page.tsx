'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import {
  CreditCard,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  AlertCircle
} from 'lucide-react'

export default function CardsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [cards, setCards] = useState<any[]>([])
  const [cardIssuers, setCardIssuers] = useState<any[]>([])
  const [userIssuers, setUserIssuers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingCard, setEditingCard] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    setUser(user)

    // Load user's plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, subscription_plans(*)')
      .eq('id', user.id)
      .single()

    setUserPlan(profile?.subscription_plans)

    // Load user's cards
    const { data: cardsData } = await supabase
      .from('credit_cards')
      .select('*, card_issuers(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    setCards(cardsData || [])

    // Load all card issuers
    const { data: issuersData } = await supabase
      .from('card_issuers')
      .select('*')
      .order('name')

    setCardIssuers(issuersData || [])

    // Load user's selected issuers
    const { data: userIssuersData } = await supabase
      .from('user_card_issuers')
      .select('*, card_issuers(*)')
      .eq('user_id', user.id)

    setUserIssuers(userIssuersData || [])

    setLoading(false)
  }

  const addCard = async (cardData: any) => {
    const supabase = createClient()

    // Validate user is logged in
    if (!user || !user.id) {
      alert('ユーザー情報が取得できません。再ログインしてください。')
      return
    }

    // Check card limit
    if (userPlan && cards.length >= userPlan.max_cards) {
      alert(`${userPlan.name}プランでは最大${userPlan.max_cards}枚までしか登録できません`)
      return
    }

    console.log('Attempting to add card:', cardData)
    console.log('User ID:', user.id)

    const { error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: user.id,
        ...cardData
      })

    if (error) {
      console.error('Card insertion error:', error)
      alert(`カード追加に失敗しました: ${error.message}`)
    } else {
      console.log('Card added successfully')
      alert('カードを追加しました！')
      loadData()
      setShowAddModal(false)
    }
  }

  const deleteCard = async (cardId: string) => {
    if (!confirm('このカードを削除しますか？')) return

    const supabase = createClient()
    const { error } = await supabase
      .from('credit_cards')
      .delete()
      .eq('id', cardId)

    if (!error) {
      loadData()
    }
  }

  const toggleIssuer = async (issuerId: string) => {
    const supabase = createClient()
    const existingIssuer = userIssuers.find(ui => ui.issuer_id === issuerId)

    if (existingIssuer) {
      // Remove issuer
      await supabase
        .from('user_card_issuers')
        .delete()
        .eq('id', existingIssuer.id)
    } else {
      // Check limit
      if (userPlan && userIssuers.length >= userPlan.max_cards) {
        alert(`${userPlan.name}プランでは最大${userPlan.max_cards}社まで登録できます`)
        return
      }

      // Add issuer
      await supabase
        .from('user_card_issuers')
        .insert({
          user_id: user.id,
          issuer_id: issuerId
        })
    }

    loadData()
  }

  return (
    <AppLayout user={user}>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">カード管理</h1>
          <button
            onClick={() => setShowAddModal(true)}
            disabled={userPlan && cards.length >= userPlan.max_cards}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            カードを追加
          </button>
        </div>

        {/* Plan info */}
        {userPlan && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600" />
                <p className="text-blue-900">
                  <span className="font-medium">{userPlan.name}プラン</span>
                  : {cards.length}/{userPlan.max_cards}枚使用中
                </p>
              </div>
              {cards.length >= userPlan.max_cards && (
                <button
                  onClick={() => router.push('/upgrade')}
                  className="px-4 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600"
                >
                  プランをアップグレード
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Registered Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">登録済みカード</h2>
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-8 text-gray-500">読み込み中...</div>
              ) : cards.length === 0 ? (
                <div className="bg-white p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                  <p className="text-gray-500">まだカードが登録されていません</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
                  >
                    最初のカードを追加
                  </button>
                </div>
              ) : (
                cards.map((card) => (
                  <div key={card.id} className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-gradient-to-r from-gray-700 to-gray-900 rounded flex items-center justify-center">
                          <CreditCard className="w-6 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {card.nickname || `****${card.card_last4}`}
                          </p>
                          <p className="text-sm text-gray-500">
                            {card.card_brand || card.card_issuers?.name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingCard(card)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCard(card.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Card Issuers */}
          <div>
            <h2 className="text-lg font-semibold mb-4">対応カード会社</h2>
            <div className="bg-white rounded-lg border p-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-900 mb-2">
                  <strong>💳 カード会社の選択</strong>
                </p>
                <p className="text-sm text-blue-800">
                  選択したカード会社からの利用通知メールを自動で取得します。
                  {userPlan && (
                    <span className="block mt-1 font-medium">
                      現在のプラン: 最大{userPlan.max_cards}社まで登録可能
                    </span>
                  )}
                </p>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cardIssuers.map((issuer) => {
                  const isSelected = userIssuers.some(ui => ui.issuer_id === issuer.id)
                  return (
                    <button
                      key={issuer.id}
                      onClick={() => toggleIssuer(issuer.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="font-medium">{issuer.name}</span>
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-600" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Add Card Modal */}
        {showAddModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={() => setShowAddModal(false)}
          >
            <div
              className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl animate-slideUp mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">カードを追加</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)

                  const card_last4 = formData.get('card_last4') as string
                  const nickname = formData.get('nickname') as string
                  const issuer_id = formData.get('issuer_id') as string

                  // Validate issuer_id
                  if (!issuer_id) {
                    alert('カード会社を選択してください')
                    return
                  }

                  // Build card data object
                  const cardData: any = {
                    issuer_id
                  }

                  // Only add optional fields if they have values
                  if (card_last4 && card_last4.trim()) {
                    cardData.card_last4 = card_last4.trim()
                  }
                  if (nickname && nickname.trim()) {
                    cardData.nickname = nickname.trim()
                  }

                  addCard(cardData)
                }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カード下4桁（任意）
                    </label>
                    <input
                      name="card_last4"
                      type="text"
                      maxLength={4}
                      pattern="\d{4}|"
                      title="4桁の数字を入力してください（任意）"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="1234"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      💡 カード下4桁を入力すると、メールから取引を抽出する精度が向上します
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ニックネーム（任意）
                    </label>
                    <input
                      name="nickname"
                      type="text"
                      maxLength={50}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="メインカード"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      カード会社
                    </label>
                    <select
                      name="issuer_id"
                      required
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">選択してください</option>
                      {cardIssuers.map((issuer) => (
                        <option key={issuer.id} value={issuer.id}>
                          {issuer.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  >
                    追加
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}