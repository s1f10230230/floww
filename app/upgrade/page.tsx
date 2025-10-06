'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import toast, { Toaster } from 'react-hot-toast'
import {
  Check,
  X,
  Crown,
  Zap,
  Building,
  CreditCard,
  TrendingUp,
  FileText,
  Users,
  Shield,
  Star
} from 'lucide-react'

export default function UpgradePage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [currentPlan, setCurrentPlan] = useState<any>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('basic')
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  const plans = [
    {
      id: 'free',
      name: 'Free',
      icon: Users,
      monthlyPrice: 0,
      yearlyPrice: 0,
      description: 'お試しに最適',
      color: 'gray',
      features: [
        { name: '最大2枚のカード登録', included: true },
        { name: 'メール自動同期（1日1回）', included: true },
        { name: '基本的な支出分析', included: true },
        { name: 'サブスク検出（3件まで）', included: true },
        { name: 'データ保持3ヶ月', included: true },
        { name: '広告表示あり', included: false },
        { name: 'CSVエクスポート', included: false },
        { name: 'APIアクセス', included: false }
      ],
      limits: {
        maxCards: 2,
        syncFrequency: '1日1回',
        dataRetention: '3ヶ月'
      }
    },
    {
      id: 'standard',
      name: 'Standard',
      icon: Star,
      monthlyPrice: 480,
      yearlyPrice: 4800,
      description: '個人利用に最適',
      color: 'blue',
      popular: true,
      features: [
        { name: '最大5枚のカード登録', included: true },
        { name: 'メール自動同期（6時間ごと）', included: true },
        { name: '詳細な支出分析', included: true },
        { name: 'サブスク検出（無制限）', included: true },
        { name: 'データ無制限保持', included: true },
        { name: '広告なし', included: true },
        { name: 'CSVエクスポート', included: true },
        { name: 'APIアクセス', included: false }
      ],
      limits: {
        maxCards: 5,
        syncFrequency: '6時間ごと',
        dataRetention: '無制限'
      }
    },
    {
      id: 'premium',
      name: 'Premium',
      icon: Zap,
      monthlyPrice: 880,
      yearlyPrice: 8800,
      description: 'ヘビーユーザー向け',
      color: 'purple',
      features: [
        { name: '最大10枚のカード登録', included: true },
        { name: 'メール自動同期（リアルタイム）', included: true },
        { name: '高度な支出分析', included: true },
        { name: 'サブスク検出（無制限）', included: true },
        { name: 'データ無制限保持', included: true },
        { name: '広告なし', included: true },
        { name: 'CSVエクスポート', included: true },
        { name: 'APIアクセス', included: true }
      ],
      limits: {
        maxCards: 10,
        syncFrequency: 'リアルタイム',
        dataRetention: '無制限'
      }
    }
  ]

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

    // Load current plan
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, subscription_plans(*)')
      .eq('id', user.id)
      .single()

    if (profile?.subscription_plans) {
      setCurrentPlan(profile.subscription_plans)
    }
  }

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      // Free plan doesn't need payment
      const supabase = createClient()
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

        router.push('/dashboard')
      }
      return
    }

    setLoading(true)

    try {
      // Create Stripe Checkout session
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId,
          billingPeriod,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        toast.error(`エラー: ${error}`)
      } else if (url) {
        toast.success('Stripe Checkoutに移動します...')
        // Redirect to Stripe Checkout
        window.location.href = url
      }
    } catch (error: any) {
      toast.error(`エラーが発生しました: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const getPrice = (plan: any) => {
    return billingPeriod === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice
  }

  const getSavings = (plan: any) => {
    if (billingPeriod === 'yearly' && plan.monthlyPrice > 0) {
      const yearlyFromMonthly = plan.monthlyPrice * 12
      const savings = yearlyFromMonthly - plan.yearlyPrice
      return Math.round((savings / yearlyFromMonthly) * 100)
    }
    return 0
  }

  return (
    <AppLayout user={user}>
      <Toaster position="top-right" />
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">プランをアップグレード</h1>
          <p className="text-lg text-gray-600">
            より多くのカード管理と高度な分析機能をご利用いただけます
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingPeriod === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              月払い
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-2 rounded-md font-medium transition-colors ${
                billingPeriod === 'yearly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              年払い
              <span className="ml-2 text-xs text-green-600 font-semibold">最大20%お得</span>
            </button>
          </div>
        </div>

        {/* Current Plan Alert */}
        {currentPlan && (
          <div className="mb-8 p-4 bg-blue-50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">
                  現在のプラン: {currentPlan.name}
                </p>
                <p className="text-sm text-blue-700">
                  最大{currentPlan.max_cards}枚のカード登録が可能です
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const isCurrentPlan = currentPlan?.name === plan.name
            const savings = getSavings(plan)

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-xl shadow-lg overflow-hidden ${
                  plan.popular ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white px-3 py-1 text-xs font-semibold rounded-bl-lg">
                    人気
                  </div>
                )}

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 bg-${plan.color}-100 rounded-lg`}>
                        <plan.icon className={`w-6 h-6 text-${plan.color}-600`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-sm text-gray-500">{plan.description}</p>
                      </div>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold">
                        ¥{getPrice(plan).toLocaleString()}
                      </span>
                      <span className="text-gray-500">
                        /{billingPeriod === 'yearly' ? '年' : '月'}
                      </span>
                    </div>
                    {savings > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        年払いで{savings}%お得
                      </p>
                    )}
                  </div>

                  {/* Limits */}
                  <div className="mb-6 p-3 bg-gray-50 rounded-lg space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">カード登録</span>
                      <span className="font-medium">{plan.limits.maxCards}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">同期頻度</span>
                      <span className="font-medium">{plan.limits.syncFrequency}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">データ保持</span>
                      <span className="font-medium">{plan.limits.dataRetention}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        {feature.included ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
                        )}
                        <span className={`text-sm ${
                          feature.included ? 'text-gray-700' : 'text-gray-400'
                        }`}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* Action Button */}
                  {isCurrentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                    >
                      現在のプラン
                    </button>
                  ) : plan.id === 'free' && currentPlan ? (
                    <button
                      disabled
                      className="w-full py-3 bg-gray-100 text-gray-500 rounded-lg font-medium cursor-not-allowed"
                    >
                      ダウングレード不可
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={loading}
                      className={`w-full py-3 rounded-lg font-medium transition-colors ${
                        plan.popular
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {plan.id === 'free' ? '利用開始' : 'アップグレード'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Trust Badges */}
        <div className="bg-gray-50 rounded-xl p-8">
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-semibold mb-1">安全な決済</h4>
              <p className="text-sm text-gray-600">
                SSL暗号化による安全な決済処理
              </p>
            </div>
            <div>
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-semibold mb-1">いつでもキャンセル可能</h4>
              <p className="text-sm text-gray-600">
                契約期間の縛りはありません
              </p>
            </div>
            <div>
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h4 className="font-semibold mb-1">30日間返金保証</h4>
              <p className="text-sm text-gray-600">
                ご満足いただけない場合は全額返金
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}