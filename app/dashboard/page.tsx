'use client'

import { useState, useEffect } from 'react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Calendar,
  CreditCard,
  Package,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react'
import { Transaction, Subscription } from '@/app/types/database'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'
import CategoryBreakdown from '@/app/components/CategoryBreakdown'
import CardBreakdown from '@/app/components/CardBreakdown'
import AppLayout from '@/app/components/AppLayout'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [syncing, setSyncing] = useState(false)

  // Calculate monthly total
  const monthlyTotal = transactions
    .filter(t => {
      const transactionDate = new Date(t.transaction_date)
      return transactionDate >= startOfMonth(selectedMonth) &&
             transactionDate <= endOfMonth(selectedMonth)
    })
    .reduce((sum, t) => sum + t.amount, 0)

  // Calculate subscription total
  const subscriptionTotal = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.amount, 0)

  const syncEmails = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/sync-emails', { method: 'POST' })
      const data = await response.json()

      if (response.ok && data.success) {
        // Show success message with details
        let message = `✅ ${data.message}`
        if (data.details) {
          message += `\n\n詳細:\n`
          message += `・取得メール数: ${data.details.totalEmails}件\n`
          message += `・処理済み: ${data.details.processedEmails}件\n`
          message += `・取引検出: ${data.details.transactions}件`

          if (data.details.samples && data.details.samples.length > 0) {
            message += `\n\nサンプル（最初の5件）:\n`
            data.details.samples.forEach((email: any) => {
              message += `・${email.from}: ${email.subject}\n`
            })
          }
        }
        alert(message)
        // Reload transactions
        await loadTransactions()
      } else if (data.error) {
        alert(`❌ エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
      alert('メール同期に失敗しました')
    } finally {
      setSyncing(false)
    }
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch transactions from database
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false })
        .limit(50)

      if (transError) {
        console.error('Error fetching transactions:', transError)
      } else if (transactionsData) {
        setTransactions(transactionsData)
      }

      // Fetch subscriptions from database
      const { data: subscriptionsData, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .order('amount', { ascending: false })

      if (subError) {
        console.error('Error fetching subscriptions:', subError)
      } else if (subscriptionsData) {
        setSubscriptions(subscriptionsData)
      }

      // If no data yet, set mock data for demo
      if (!transactionsData || transactionsData.length === 0) {
        setTransactions([
          {
            id: '1',
            user_id: user?.id || 'demo',
            merchant: 'サンプル: Amazon',
            amount: 3980,
            currency: 'JPY',
            category: '家電・ガジェット',
            item_name: 'USB-Cケーブル',
            transaction_date: format(new Date(), 'yyyy-MM-dd'),
            is_subscription: false,
            created_at: new Date().toISOString()
          }
        ])
      }
    } catch (error) {
      console.error('Error loading transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkUser()
    loadTransactions()
  }, [])

  const checkUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      setUser(user)
    } else {
      router.push('/')
    }
  }

  const connectGmail = () => {
    window.location.href = '/api/auth/gmail'
  }

  return (
    <AppLayout user={user}>
      <div className="max-w-7xl mx-auto">
        {/* Action buttons */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={connectGmail}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              Gmail連携
            </button>
            <button
              onClick={syncEmails}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? '同期中...' : 'メール同期'}
            </button>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">今月の支出</p>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">¥{monthlyTotal.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">
              {format(selectedMonth, 'yyyy年M月', { locale: ja })}
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">サブスク合計</p>
              <CreditCard className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-blue-500">¥{subscriptionTotal.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">月額</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">取引件数</p>
              <Package className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold">{transactions.length}</p>
            <p className="text-sm text-gray-500 mt-1">今月</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600">検出サブスク</p>
              <AlertCircle className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-amber-500">{subscriptions.length}</p>
            <p className="text-sm text-gray-500 mt-1">アクティブ</p>
          </div>
        </div>

        {/* Category and Card Breakdown */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <CategoryBreakdown transactions={transactions} />
          <CardBreakdown transactions={transactions} />
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Transactions List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">最近の取引</h2>
                  <button className="text-blue-500 hover:text-blue-600">
                    <Filter className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="divide-y">
                {loading ? (
                  <div className="p-8 text-center text-gray-500">
                    読み込み中...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                      まだ取引データがありません
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      まずは以下の手順で始めましょう
                    </p>
                    <div className="max-w-md mx-auto text-left space-y-3 mb-6">
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">カード会社を選択</p>
                          <p className="text-xs text-gray-600">/cards ページで使用中のカード会社を選択</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          2
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">メールを同期</p>
                          <p className="text-xs text-gray-600">「同期」ボタンでカード利用通知を取得</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                        <div className="flex-shrink-0 w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                          3
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">支出を確認</p>
                          <p className="text-xs text-gray-600">自動で取引データが表示されます</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={() => router.push('/cards')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                      >
                        <CreditCard className="w-4 h-4" />
                        カード会社を選択
                      </button>
                      <button
                        onClick={syncEmails}
                        disabled={syncing}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? '同期中...' : 'メールを同期'}
                      </button>
                    </div>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{transaction.merchant}</p>
                          {transaction.item_name && (
                            <p className="text-sm text-gray-600">{transaction.item_name}</p>
                          )}
                          <div className="flex gap-2 mt-1">
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                              {transaction.category}
                            </span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(transaction.transaction_date), 'M月d日', { locale: ja })}
                            </span>
                          </div>
                        </div>
                        <p className="font-semibold">¥{transaction.amount.toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Subscriptions */}
          <div>
            <div className="bg-white rounded-xl shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">検出されたサブスク</h2>
              </div>

              <div className="divide-y">
                {subscriptions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    サブスクリプションが検出されていません
                  </div>
                ) : (
                  subscriptions.map((subscription) => (
                    <div key={subscription.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{subscription.service_name}</p>
                          <p className="text-sm text-gray-600">
                            {subscription.billing_cycle === 'monthly' ? '月額' :
                             subscription.billing_cycle === 'yearly' ? '年額' : '週額'}
                          </p>
                        </div>
                        <p className="font-semibold text-blue-500">
                          ¥{subscription.amount.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs px-2 py-1 rounded ${
                          subscription.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {subscription.status === 'active' ? 'アクティブ' : 'キャンセル済み'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {subscription.transaction_count}回検出
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {subscriptions.length > 0 && (
                <div className="p-4 border-t bg-yellow-50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">
                        不要なサブスクはありませんか？
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        使っていないサービスの解約で月額¥{Math.floor(subscriptionTotal * 0.3).toLocaleString()}節約できるかも
                      </p>
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