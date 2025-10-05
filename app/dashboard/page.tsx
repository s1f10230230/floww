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
  Download,
  Mail,
  X,
  BookOpen
} from 'lucide-react'
import { Transaction, Subscription } from '@/app/types/database'
import { createClient } from '@/app/lib/supabase-client'
import { useRouter } from 'next/navigation'
import CategoryBreakdown from '@/app/components/CategoryBreakdown'
import CardBreakdown from '@/app/components/CardBreakdown'
import AppLayout from '@/app/components/AppLayout'
import { useToast, ToastContainer } from '@/app/components/Toast'
import AdBanner from '@/app/components/AdBanner'

export default function Dashboard() {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [userPlan, setUserPlan] = useState<any>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [syncing, setSyncing] = useState(false)
  const [incrementalSync, setIncrementalSync] = useState(true)
  const [maxResults, setMaxResults] = useState<number>(500)
  const [hasMore, setHasMore] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [syncSummary, setSyncSummary] = useState<{ totalEmails?: number, processedEmails?: number, transactions?: number } | null>(null)
  const [issuerNames, setIssuerNames] = useState<string[]>([])
  const [gmailConnected, setGmailConnected] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null)
  const [lastHistoryId, setLastHistoryId] = useState<string | null>(null)
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)
  const [emailDetails, setEmailDetails] = useState<any>(null)

  // Calculate monthly total
  const monthlyTotal = transactions
    .filter(t => {
      const displayDate = t.emails?.received_at || t.transaction_date
      const transactionDate = new Date(displayDate)
      return transactionDate >= startOfMonth(selectedMonth) &&
             transactionDate <= endOfMonth(selectedMonth)
    })
    .reduce((sum, t) => sum + t.amount, 0)

  // Calculate subscription total
  const subscriptionTotal = subscriptions
    .filter(s => s.status === 'active')
    .reduce((sum, s) => sum + s.amount, 0)

  const syncEmails = async (opts?: { useNextPage?: boolean }) => {
    setSyncing(true)
    try {
      const endpoint = process.env.NEXT_PUBLIC_USE_SYNC_V2 === 'true' ? '/api/sync-emails-v2' : '/api/sync-emails'
      const body: any = {}
      if (endpoint === '/api/sync-emails-v2') {
        body.maxResults = maxResults
        body.incrementalSync = incrementalSync
        if (opts?.useNextPage && nextPageToken) body.pageToken = nextPageToken
      }
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
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

        // Dev-only: show parse confidences if available
        const SHOW_CONF = process.env.NEXT_PUBLIC_SHOW_CONFIDENCE === 'true'
        if (SHOW_CONF && data.dev && Array.isArray(data.dev) && data.dev.length > 0) {
          message += `\n\n[DEV] 解析confidence（上位数件）:\n`
          data.dev.slice(0, 10).forEach((d: any, idx: number) => {
            const conf = Array.isArray(d.confidences) ? d.confidences.map((c: any) => Number(c).toFixed(2)).join(', ') : ''
            message += `#${idx + 1} [${d.parser}] tx:${d.txCount} conf:[${conf}]\n   ${d.from} | ${d.subject}\n`
          })
        }
        // Set summary + pagination state for v2
        if (endpoint === '/api/sync-emails-v2') {
          setSyncSummary({
            totalEmails: data.details?.totalEmails,
            processedEmails: data.details?.processedEmails,
            transactions: data.details?.transactions
          })
          setHasMore(!!data.data?.hasMore || !!data.hasMore)
          setNextPageToken(data.data?.nextPageToken || data.nextPageToken || null)
        }
        toast.success(message)
        // Reload transactions
        await loadTransactions()
      } else if (data.error) {
        toast.error(`エラー: ${data.error}`)
      }
    } catch (error) {
      console.error('Sync failed:', error)
      toast.error('メール同期に失敗しました')
    } finally {
      setSyncing(false)
    }
  }

  const loadTransactions = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      // Fetch transactions from database with email received_at
      const { data: transactionsData, error: transError } = await supabase
        .from('transactions')
        .select('*, emails(received_at)')
        .order('created_at', { ascending: false })
        .limit(200)  // Fetch more to filter client-side

      // Fetch merchant category mappings
      const { data: mappingsData } = await supabase
        .from('merchant_category_mappings')
        .select('merchant_name, category')

      // Fetch card issuers for mapping
      const { data: issuersData } = await supabase
        .from('card_issuers')
        .select('id, name')

      // Create issuer lookup map
      const issuerMap = new Map<string, string>()
      issuersData?.forEach(issuer => {
        issuerMap.set(issuer.id, issuer.name)
      })

      // Create a mapping lookup
      const categoryMap = new Map<string, string>()
      mappingsData?.forEach(m => {
        if (m.category) {
          categoryMap.set(m.merchant_name, m.category)
        }
      })

      if (transError) {
        console.error('Error fetching transactions:', transError)
      } else if (transactionsData) {
        // Sort by received_at date and apply category mappings
        const sorted = [...transactionsData].map(t => ({
          ...t,
          category: categoryMap.get(t.merchant) || t.category,
          card_issuer_name: t.issuer_id ? issuerMap.get(t.issuer_id) || '' : ''
        })).sort((a, b) => {
          const dateA = new Date((a as any).emails?.received_at || a.transaction_date)
          const dateB = new Date((b as any).emails?.received_at || b.transaction_date)
          return dateB.getTime() - dateA.getTime()
        })
        setTransactions(sorted)
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
    loadIssuerInfo()
    checkGmailConnected()
    loadSyncMeta()
  }, [])

  const checkUser = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      setUser(user)

      // Load user plan
      const { data: profile } = await supabase
        .from('profiles')
        .select('*, subscription_plans(*)')
        .eq('id', user.id)
        .single()

      setUserPlan(profile?.subscription_plans)
    } else {
      router.push('/')
    }
  }

  const loadIssuerInfo = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('user_card_issuers')
        .select('card_issuers(name)')
      const names = (data || []).map((row: any) => row.card_issuers?.name).filter(Boolean)
      setIssuerNames(names)
    } catch (e) {
      console.error('Failed to load issuers', e)
    }
  }

  const checkGmailConnected = async () => {
    const supabase = createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('gmail_refresh_token, last_sync_history_id')
      .maybeSingle()
    setGmailConnected(!!profile?.gmail_refresh_token)
    if ((profile as any)?.last_sync_history_id) setLastHistoryId((profile as any).last_sync_history_id)
  }

  const loadSyncMeta = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('emails')
        .select('received_at')
        .order('received_at', { ascending: false })
        .limit(1)
      if (data && data.length > 0) setLastSyncAt(new Date(data[0].received_at))
    } catch (e) {
      console.error('Failed to load last sync meta', e)
    }
  }

  const connectGmail = () => {
    window.location.href = '/api/auth/gmail'
  }

  const showEmailDetails = async (emailId: string | undefined) => {
    if (!emailId) {
      toast.info('このトランザクションにはメール情報がありません')
      return
    }

    setSelectedEmailId(emailId)

    const supabase = createClient()
    const { data, error } = await supabase
      .from('emails')
      .select('*')
      .eq('id', emailId)
      .single()

    if (error) {
      console.error('Error fetching email:', error)
      toast.error('メール詳細の取得に失敗しました')
    } else {
      setEmailDetails(data)
    }
  }

  const closeEmailModal = () => {
    setSelectedEmailId(null)
    setEmailDetails(null)
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <AppLayout user={user}>
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
              <button
                onClick={() => router.push('/guide')}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">使い方を見る</span>
              </button>
            </div>
            <input
              type="month"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <button
              onClick={connectGmail}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/>
              </svg>
              <span>Gmail連携</span>
            </button>
            <button
              onClick={() => syncEmails()}
              disabled={syncing}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? '同期中...' : 'メール同期'}</span>
            </button>
          </div>
        </div>

        {/* Sync controls */}
        <div className="bg-white p-4 rounded-xl shadow mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={incrementalSync}
                onChange={e => setIncrementalSync(e.target.checked)}
              />
              増分同期（履歴IDを使用）
            </label>
            <label className="flex items-center gap-2 text-sm">
              最大件数
              <input
                type="number"
                min={50}
                max={500}
                step={50}
                value={maxResults}
                onChange={e => setMaxResults(Number(e.target.value))}
                className="w-24 px-2 py-1 border rounded"
              />
            </label>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => syncEmails({ useNextPage: true })}
                disabled={!hasMore || syncing}
                className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50"
              >
                次のページを同期{hasMore ? '' : '（なし）'}
              </button>
              {nextPageToken && (
                <span className="text-xs text-gray-500">nextPageToken: {String(nextPageToken).slice(0, 12)}…</span>
              )}
            </div>
          </div>

          {/* Issuer + Gmail status */}
          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm">
            <span className={`px-2 py-1 rounded ${gmailConnected ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {gmailConnected ? 'Gmail連携済み' : 'Gmail未連携'}
            </span>
            {issuerNames.length > 0 && (
              <span className="text-gray-600">対象カード会社: {issuerNames.join('・')}</span>
            )}
            {syncSummary && (
              <span className="text-gray-600">
                取得:{syncSummary.totalEmails || 0} / 処理:{syncSummary.processedEmails || 0} / 取引:{syncSummary.transactions || 0}
              </span>
            )}
            {lastSyncAt && (
              <span className="text-gray-500">
                最終同期: {format(lastSyncAt, 'yyyy/MM/dd HH:mm', { locale: ja })}
              </span>
            )}
            {lastHistoryId && (
              <span className="text-xs text-gray-400">履歴ID: {String(lastHistoryId).slice(0, 12)}…</span>
            )}
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">今月の支出</p>
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold break-all">¥{monthlyTotal.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              {format(selectedMonth, 'yyyy年M月', { locale: ja })}
            </p>
          </div>

          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">継続支払合計</p>
              <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-blue-500 break-all">¥{subscriptionTotal.toLocaleString()}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">月額</p>
          </div>

          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">取引件数</p>
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{transactions.filter(t => {
              const displayDate = t.emails?.received_at || t.transaction_date
              const transactionDate = new Date(displayDate)
              return transactionDate >= startOfMonth(selectedMonth) &&
                     transactionDate <= endOfMonth(selectedMonth)
            }).length}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">{format(selectedMonth, 'M月', { locale: ja })}</p>
          </div>

          <div className="bg-white p-3 sm:p-4 lg:p-6 rounded-xl shadow">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs sm:text-sm lg:text-base text-gray-600">継続支払</p>
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <p className="text-lg sm:text-2xl lg:text-3xl font-bold text-amber-500">{subscriptions.length}</p>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">アクティブ</p>
          </div>
        </div>

        {/* Category and Card Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8">
          <CategoryBreakdown transactions={transactions.filter(t => {
            const displayDate = t.emails?.received_at || t.transaction_date
            const transactionDate = new Date(displayDate)
            return transactionDate >= startOfMonth(selectedMonth) &&
                   transactionDate <= endOfMonth(selectedMonth)
          })} />
          <CardBreakdown transactions={transactions.filter(t => {
            const displayDate = t.emails?.received_at || t.transaction_date
            const transactionDate = new Date(displayDate)
            return transactionDate >= startOfMonth(selectedMonth) &&
                   transactionDate <= endOfMonth(selectedMonth)
          })} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
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
                        onClick={() => syncEmails()}
                        disabled={syncing}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                      >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? '同期中...' : 'メールを同期'}
                      </button>
                    </div>
                  </div>
                ) : (
                  transactions
                    .filter(t => {
                      const displayDate = t.emails?.received_at || t.transaction_date
                      const transactionDate = new Date(displayDate)
                      return transactionDate >= startOfMonth(selectedMonth) &&
                             transactionDate <= endOfMonth(selectedMonth)
                    })
                    .slice(0, 50)  // Show latest 50 for selected month
                    .map((transaction) => (
                    <div key={transaction.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1">
                          <p className="font-medium">{transaction.merchant}</p>
                          {transaction.item_name && (
                            <p className="text-sm text-gray-600">{transaction.item_name}</p>
                          )}
                          <div className="flex gap-2 mt-1 flex-wrap">
                            {transaction.category && (
                              <span className="text-xs px-2 py-1 bg-gray-100 rounded">
                                {transaction.category}
                              </span>
                            )}
                            {transaction.card_brand && (
                              <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                                {transaction.card_brand}{transaction.card_last4 ? ` • ${transaction.card_last4}` : ''}
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              {format(new Date(transaction.emails?.received_at || transaction.transaction_date), 'M月d日', { locale: ja })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-semibold whitespace-nowrap">¥{transaction.amount.toLocaleString()}</p>
                          {transaction.email_id && (
                            <button
                              onClick={() => showEmailDetails(transaction.email_id)}
                              className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                              title="メール詳細を表示"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Ad Banner for Free users */}
          <AdBanner userPlan={userPlan} format="horizontal" className="my-6" />

          {/* Subscriptions */}
          <div>
            <div className="bg-white rounded-xl shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold">継続的な支払い</h2>
              </div>

              <div className="divide-y">
                {subscriptions.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    継続的な支払いが検出されていません
                  </div>
                ) : (
                  subscriptions.map((subscription) => (
                    <div key={subscription.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium">{subscription.service_name}</p>
                          <div className="flex gap-2 items-center mt-1">
                            {subscription.category && (
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                subscription.category === 'サブスク' ? 'bg-purple-100 text-purple-700' :
                                subscription.category === '海外利用' ? 'bg-blue-100 text-blue-700' :
                                subscription.category === '交通費' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {subscription.category}
                              </span>
                            )}
                            <p className="text-sm text-gray-600">
                              {subscription.billing_cycle === 'monthly' ? '月額' :
                               subscription.billing_cycle === 'yearly' ? '年額' : '週額'}
                            </p>
                          </div>
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
                        不要な継続支払いはありませんか？
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

        {/* Email Details Modal */}
        {selectedEmailId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b flex justify-between items-center">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  メール詳細
                </h3>
                <button
                  onClick={closeEmailModal}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                {emailDetails ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">送信者</p>
                      <p className="text-base">{emailDetails.sender}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">件名</p>
                      <p className="text-base">{emailDetails.subject || '(件名なし)'}</p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-500">受信日時</p>
                      <p className="text-base">
                        {format(new Date(emailDetails.received_at), 'yyyy年M月d日 HH:mm:ss', { locale: ja })}
                      </p>
                    </div>

                    {emailDetails.snippet && (
                      <div>
                        <p className="text-sm font-medium text-gray-500">スニペット</p>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{emailDetails.snippet}</p>
                      </div>
                    )}

                    {emailDetails.body_text && (
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">本文</p>
                        <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap max-h-96 overflow-y-auto">
                          {emailDetails.body_text}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <p className="text-xs text-gray-400">Gmail Message ID: {emailDetails.gmail_message_id}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    読み込み中...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </AppLayout>
    </>
  )
}
