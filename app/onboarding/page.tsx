'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import { CreditCard, Check, ChevronRight, AlertCircle } from 'lucide-react'

const CARD_ISSUERS = [
  { id: '1', name: '楽天カード', popular: true },
  { id: '2', name: '三井住友カード', popular: true },
  { id: '3', name: 'JCBカード', popular: true },
  { id: '4', name: 'イオンカード', popular: false },
  { id: '5', name: 'エポスカード', popular: false },
  { id: '6', name: 'dカード', popular: true },
  { id: '7', name: 'au PAYカード', popular: false },
  { id: '8', name: 'セゾンカード', popular: false },
  { id: '9', name: 'オリコカード', popular: false },
  { id: '10', name: 'ビューカード', popular: false },
  { id: '11', name: 'PayPayカード', popular: true },
  { id: '12', name: 'American Express', popular: false },
]

export default function Onboarding() {
  const router = useRouter()
  const [selectedIssuers, setSelectedIssuers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [userPlan, setUserPlan] = useState<any>(null)
  const [gmailConnected, setGmailConnected] = useState(false)

  useEffect(() => {
    checkUserPlan()
  }, [])

  const checkUserPlan = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    // Get user's plan and Gmail connection status
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, subscription_plans(*)')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_plans) {
      setUserPlan(profile.subscription_plans)
    } else {
      // Default to Free plan
      setUserPlan({ name: 'Free', max_cards: 2 })
    }

    // Check if Gmail is connected
    setGmailConnected(!!(profile?.gmail_refresh_token))
  }

  const toggleIssuer = (issuerId: string) => {
    setSelectedIssuers(prev => {
      if (prev.includes(issuerId)) {
        return prev.filter(id => id !== issuerId)
      }

      // Check plan limit
      if (userPlan && prev.length >= userPlan.max_cards) {
        alert(`${userPlan.name}プランでは最大${userPlan.max_cards}枚のカードまで登録できます。`)
        return prev
      }

      return [...prev, issuerId]
    })
  }

  const handleComplete = async () => {
    if (selectedIssuers.length === 0) {
      alert(`カード会社を選択してください（${userPlan?.name || 'Free'}プラン: 最大${userPlan?.max_cards || 2}社）`)
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return

    try {
      // Save selected issuers and create credit cards
      for (const issuerId of selectedIssuers) {
        const issuer = CARD_ISSUERS.find(i => i.id === issuerId)
        if (issuer) {
          // First, get the issuer from the database
          const { data: dbIssuer } = await supabase
            .from('card_issuers')
            .select('id, name')
            .eq('name', issuer.name)
            .single()

          if (dbIssuer) {
            console.log('Processing issuer:', dbIssuer.name, 'ID:', dbIssuer.id)

            // Save to user_card_issuers
            const { error: issuerError } = await supabase
              .from('user_card_issuers')
              .upsert({
                user_id: user.id,
                issuer_id: dbIssuer.id
              })

            if (issuerError) {
              console.error('Error saving issuer:', issuerError)
            }

            // Create a credit card entry
            const cardData = {
              user_id: user.id,
              issuer_id: dbIssuer.id,
              card_name: dbIssuer.name,
              is_active: true
            }

            console.log('Inserting card with data:', cardData)

            const { data: insertedCard, error: cardError } = await supabase
              .from('credit_cards')
              .insert(cardData)
              .select()

            if (cardError) {
              console.error('Error creating card:', {
                message: cardError.message,
                details: cardError.details,
                hint: cardError.hint,
                code: cardError.code
              })
            } else {
              console.log('Card created successfully:', insertedCard)
            }
          }
        }
      }

      // Assign Free plan if no plan exists
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('plan_id')
        .eq('id', user.id)
        .single()

      if (!currentProfile?.plan_id) {
        // Get Free plan ID
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('id')
          .eq('name', 'Free')
          .single()

        if (freePlan) {
          await supabase
            .from('profiles')
            .update({
              plan_id: freePlan.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id)
        }
      } else {
        // Just update timestamp
        await supabase
          .from('profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', user.id)
      }

      router.push('/dashboard')
    } catch (error) {
      console.error('Error saving card issuers:', error)
      alert('保存中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Gmail Connection Status */}
        {gmailConnected && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-800 font-medium">
                ✅ Gmail連携が完了しました！
              </p>
            </div>
            <p className="text-sm text-green-700 mt-1">
              購入通知メールから自動で支出を記録します
            </p>
          </div>
        )}

        {!gmailConnected && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <p className="text-amber-800 font-medium">
                Gmail連携が必要です
              </p>
            </div>
            <p className="text-sm text-amber-700 mt-1">
              メール自動取得のため、ダッシュボードで「Gmail連携」を行ってください
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-500 rounded-full mb-4">
            <CreditCard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            使用しているクレジットカードを選択
          </h1>
          <p className="text-gray-600">
            選択したカード会社のメールを自動で取得・解析します
          </p>
          {userPlan && (
            <p className="mt-2 text-sm">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {userPlan.name}プラン: 最大{userPlan.max_cards}枚まで
              </span>
            </p>
          )}
        </div>

        {/* Card selection grid */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            よく使われているカード
          </h2>
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            {CARD_ISSUERS.filter(i => i.popular).map((issuer) => (
              <button
                key={issuer.id}
                onClick={() => toggleIssuer(issuer.id)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  selectedIssuers.includes(issuer.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {selectedIssuers.includes(issuer.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <p className="font-medium text-gray-900">{issuer.name}</p>
              </button>
            ))}
          </div>

          <h2 className="text-lg font-semibold mb-4 text-gray-700">
            その他のカード
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {CARD_ISSUERS.filter(i => !i.popular).map((issuer) => (
              <button
                key={issuer.id}
                onClick={() => toggleIssuer(issuer.id)}
                className={`relative p-4 rounded-lg border-2 transition-all ${
                  selectedIssuers.includes(issuer.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {selectedIssuers.includes(issuer.id) && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                <p className="font-medium text-gray-900">{issuer.name}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected count */}
        <div className="text-center mb-6">
          <p className="text-gray-600">
            {selectedIssuers.length}枚選択中
            {userPlan && ` / 最大${userPlan.max_cards}枚`}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            スキップ
          </button>
          <button
            onClick={handleComplete}
            disabled={loading || selectedIssuers.length === 0}
            className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? '保存中...' : '完了'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Upgrade prompt */}
        {userPlan?.name === 'Free' && (
          <div className="mt-8 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              💡 より多くのカードを登録したい場合は、
              <button className="font-semibold underline ml-1">
                有料プランへアップグレード
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}