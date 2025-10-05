'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import {
  FileText,
  Download,
  Calendar,
  Filter,
  Printer,
  Share2,
  TrendingUp,
  CreditCard,
  DollarSign,
  PieChart
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function ReportsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [reportType, setReportType] = useState('monthly') // monthly, category, subscription

  useEffect(() => {
    loadData()
  }, [selectedMonth])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    setUser(user)

    // Load transactions for selected month
    const startDate = startOfMonth(selectedMonth)
    const endDate = endOfMonth(selectedMonth)

    // First get all transactions with emails
    const { data: allTransactionsData } = await supabase
      .from('transactions')
      .select('*, emails(received_at)')
      .eq('user_id', user.id)

    // Filter by received_at date on client side
    const transactionsData = allTransactionsData?.filter(t => {
      const displayDate = (t as any).emails?.received_at || t.transaction_date
      const date = new Date(displayDate)
      return date >= startDate && date <= endDate
    }).sort((a, b) => {
      const dateA = new Date((a as any).emails?.received_at || a.transaction_date)
      const dateB = new Date((b as any).emails?.received_at || b.transaction_date)
      return dateB.getTime() - dateA.getTime()
    })

    setTransactions(transactionsData || [])

    // Load subscriptions
    const { data: subscriptionsData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('amount', { ascending: false })

    setSubscriptions(subscriptionsData || [])
    setLoading(false)
  }

  // Generate report data
  const generateMonthlyReport = () => {
    const categoryTotals: { [key: string]: number } = {}
    let totalAmount = 0

    transactions.forEach(t => {
      const category = t.category || 'その他'
      categoryTotals[category] = (categoryTotals[category] || 0) + t.amount
      totalAmount += t.amount
    })

    return {
      month: format(selectedMonth, 'yyyy年M月', { locale: ja }),
      totalAmount,
      transactionCount: transactions.length,
      categories: Object.entries(categoryTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: (amount / totalAmount) * 100
        })),
      averagePerDay: totalAmount / new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate(),
      topExpenses: transactions
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)
    }
  }

  const exportCSV = () => {
    const report = generateMonthlyReport()
    let csv = 'Date,Merchant,Category,Amount,Item\n'

    transactions.forEach(t => {
      const displayDate = (t as any).emails?.received_at || t.transaction_date
      csv += `"${format(new Date(displayDate), 'yyyy-MM-dd')}","${t.merchant}","${t.category || ''}","${t.amount}","${t.item_name || ''}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `floww_report_${format(selectedMonth, 'yyyy-MM')}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const report = generateMonthlyReport()

  // Calculate previous month comparison
  const previousMonthTotal = 50000 // Placeholder - would calculate from previous month data
  const monthChange = ((report.totalAmount - previousMonthTotal) / previousMonthTotal) * 100

  return (
    <AppLayout user={user}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">レポート</h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="month"
              value={format(selectedMonth, 'yyyy-MM')}
              onChange={(e) => setSelectedMonth(new Date(e.target.value))}
              className="w-full sm:w-auto px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={exportCSV}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 w-full sm:w-auto"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">CSVダウンロード</span>
              <span className="sm:hidden">CSV</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : (
          <>
            {/* Report Tabs */}
            <div className="bg-white rounded-xl shadow mb-6">
              <div className="border-b overflow-x-auto">
                <div className="flex min-w-max">
                  <button
                    onClick={() => setReportType('monthly')}
                    className={`px-4 sm:px-6 py-3 font-medium border-b-2 transition-colors text-sm sm:text-base ${
                      reportType === 'monthly'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    月次レポート
                  </button>
                  <button
                    onClick={() => setReportType('category')}
                    className={`px-4 sm:px-6 py-3 font-medium border-b-2 transition-colors text-sm sm:text-base ${
                      reportType === 'category'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    カテゴリ分析
                  </button>
                  <button
                    onClick={() => setReportType('subscription')}
                    className={`px-4 sm:px-6 py-3 font-medium border-b-2 transition-colors text-sm sm:text-base ${
                      reportType === 'subscription'
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    サブスク管理
                  </button>
                </div>
              </div>

              <div className="p-6">
                {reportType === 'monthly' && (
                  <div>
                    {/* Monthly Summary */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-8">
                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          <p className="text-xs sm:text-sm text-gray-600">月間支出合計</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold">¥{report.totalAmount.toLocaleString()}</p>
                        <p className={`text-xs sm:text-sm mt-1 ${monthChange > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          前月比 {monthChange > 0 ? '+' : ''}{monthChange.toFixed(1)}%
                        </p>
                      </div>

                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                          <p className="text-xs sm:text-sm text-gray-600">取引件数</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold">{report.transactionCount}件</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">
                          平均 ¥{Math.round(report.totalAmount / report.transactionCount).toLocaleString()}
                        </p>
                      </div>

                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                          <p className="text-xs sm:text-sm text-gray-600">1日平均</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold">¥{Math.round(report.averagePerDay).toLocaleString()}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">日額支出</p>
                      </div>

                      <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                          <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                          <p className="text-xs sm:text-sm text-gray-600">カテゴリ数</p>
                        </div>
                        <p className="text-lg sm:text-2xl font-bold">{report.categories.length}</p>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1">支出カテゴリ</p>
                      </div>
                    </div>

                    {/* Top Expenses */}
                    <div className="mb-8">
                      <h3 className="text-base sm:text-lg font-semibold mb-4">高額支出TOP5</h3>
                      <div className="space-y-3">
                        {report.topExpenses.map((expense, index) => (
                          <div key={expense.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg gap-3">
                            <div className="flex items-center gap-3 sm:gap-4">
                              <span className="text-xl sm:text-2xl font-bold text-gray-400">#{index + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{expense.merchant}</p>
                                <p className="text-xs sm:text-sm text-gray-500">
                                  {expense.item_name || expense.category} • {format(new Date(expense.emails?.received_at || expense.transaction_date), 'M月d日', { locale: ja })}
                                </p>
                              </div>
                            </div>
                            <p className="text-base sm:text-lg font-semibold ml-10 sm:ml-0">¥{expense.amount.toLocaleString()}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {reportType === 'category' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">カテゴリ別支出分析</h3>
                    <div className="space-y-4">
                      {report.categories.map((cat, index) => (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-medium">{cat.category}</p>
                            <p className="font-semibold">¥{cat.amount.toLocaleString()}</p>
                          </div>
                          <div className="relative h-2 bg-gray-200 rounded">
                            <div
                              className="absolute h-2 bg-blue-500 rounded"
                              style={{ width: `${cat.percentage}%` }}
                            />
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{cat.percentage.toFixed(1)}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportType === 'subscription' && (
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold mb-4">サブスクリプション管理</h3>

                    {/* Subscription Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 mb-6">
                      <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-blue-600 mb-1">月額合計</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-900">
                          ¥{subscriptions
                            .filter(s => s.status === 'active' && s.billing_cycle === 'monthly')
                            .reduce((sum, s) => sum + s.amount, 0)
                            .toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 bg-green-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-green-600 mb-1">年額換算</p>
                        <p className="text-xl sm:text-2xl font-bold text-green-900">
                          ¥{(subscriptions
                            .filter(s => s.status === 'active' && s.billing_cycle === 'monthly')
                            .reduce((sum, s) => sum + s.amount * 12, 0))
                            .toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 sm:p-4 bg-amber-50 rounded-lg">
                        <p className="text-xs sm:text-sm text-amber-600 mb-1">アクティブ数</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-900">
                          {subscriptions.filter(s => s.status === 'active').length}件
                        </p>
                      </div>
                    </div>

                    {/* Subscription List */}
                    <div className="space-y-3">
                      {subscriptions.map((sub) => (
                        <div key={sub.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg gap-3">
                          <div className="flex-1">
                            <p className="font-medium">{sub.service_name}</p>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
                              <span className={`text-xs px-2 py-1 rounded ${
                                sub.status === 'active'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}>
                                {sub.status === 'active' ? 'アクティブ' : 'キャンセル済み'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {sub.billing_cycle === 'monthly' ? '月額' : '年額'} • {sub.transaction_count}回検出
                              </span>
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="font-semibold">¥{sub.amount.toLocaleString()}</p>
                            {sub.billing_cycle === 'monthly' && (
                              <p className="text-xs text-gray-500">年間 ¥{(sub.amount * 12).toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Export Options */}
            <div className="bg-white rounded-xl shadow p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold mb-4">エクスポート設定</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <button className="flex items-center gap-3 p-3 sm:p-4 border-2 border-dashed rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
                  <Download className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-sm sm:text-base">PDF形式</p>
                    <p className="text-xs sm:text-sm text-gray-500">印刷用フォーマット</p>
                  </div>
                </button>
                <button onClick={exportCSV} className="flex items-center gap-3 p-3 sm:p-4 border-2 border-dashed rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
                  <FileText className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-sm sm:text-base">CSV形式</p>
                    <p className="text-xs sm:text-sm text-gray-500">表計算ソフト用</p>
                  </div>
                </button>
                <button className="flex items-center gap-3 p-3 sm:p-4 border-2 border-dashed rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
                  <Share2 className="w-5 h-5 text-gray-600 flex-shrink-0" />
                  <div className="text-left">
                    <p className="font-medium text-sm sm:text-base">共有リンク</p>
                    <p className="text-xs sm:text-sm text-gray-500">URLで共有</p>
                  </div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}