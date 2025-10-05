'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  PieChart,
  BarChart3,
  LineChart,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'

export default function AnalyticsPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('6months') // 3months, 6months, 1year

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1', '#14B8A6']

  useEffect(() => {
    loadData()
  }, [timeRange])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    setUser(user)

    // Calculate date range
    const endDate = new Date()
    let startDate = new Date()
    if (timeRange === '3months') {
      startDate = subMonths(endDate, 3)
    } else if (timeRange === '6months') {
      startDate = subMonths(endDate, 6)
    } else {
      startDate = subMonths(endDate, 12)
    }

    // Load transactions with email received_at
    const { data: transactionsData } = await supabase
      .from('transactions')
      .select('*, emails(received_at)')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate.toISOString())
      .order('transaction_date', { ascending: true })

    setTransactions(transactionsData || [])
    setLoading(false)
  }

  // Calculate monthly spending trend
  const getMonthlyTrend = () => {
    const monthlyData: { [key: string]: number } = {}

    transactions.forEach(t => {
      const displayDate = (t as any).emails?.received_at || t.transaction_date
      const month = format(new Date(displayDate), 'yyyy-MM')
      monthlyData[month] = (monthlyData[month] || 0) + t.amount
    })

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, amount]) => ({
        month: format(new Date(month), 'M月', { locale: ja }),
        amount,
        fullMonth: month
      }))
  }

  // Calculate category breakdown
  const getCategoryBreakdown = () => {
    const categoryData: { [key: string]: number } = {}

    transactions.forEach(t => {
      const category = t.category || 'その他'
      categoryData[category] = (categoryData[category] || 0) + t.amount
    })

    return Object.entries(categoryData)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }))
  }

  // Calculate spending by day of week
  const getDayOfWeekBreakdown = () => {
    const days = ['日', '月', '火', '水', '木', '金', '土']
    const dayData: { [key: number]: { count: number; amount: number } } = {}

    transactions.forEach(t => {
      const displayDate = (t as any).emails?.received_at || t.transaction_date
      const day = new Date(displayDate).getDay()
      if (!dayData[day]) {
        dayData[day] = { count: 0, amount: 0 }
      }
      dayData[day].count++
      dayData[day].amount += t.amount
    })

    return days.map((name, index) => ({
      day: name,
      amount: dayData[index]?.amount || 0,
      count: dayData[index]?.count || 0,
      average: dayData[index] ? Math.round(dayData[index].amount / dayData[index].count) : 0
    }))
  }

  // Calculate top merchants
  const getTopMerchants = () => {
    const merchantData: { [key: string]: { count: number; amount: number } } = {}

    transactions.forEach(t => {
      const merchant = t.merchant
      if (!merchantData[merchant]) {
        merchantData[merchant] = { count: 0, amount: 0 }
      }
      merchantData[merchant].count++
      merchantData[merchant].amount += t.amount
    })

    return Object.entries(merchantData)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 10)
      .map(([name, data]) => ({
        name,
        amount: data.amount,
        count: data.count
      }))
  }

  const monthlyTrend = getMonthlyTrend()
  const categoryBreakdown = getCategoryBreakdown()
  const dayOfWeekData = getDayOfWeekBreakdown()
  const topMerchants = getTopMerchants()

  // Calculate statistics
  const currentMonth = monthlyTrend[monthlyTrend.length - 1]?.amount || 0
  const previousMonth = monthlyTrend[monthlyTrend.length - 2]?.amount || 0
  const monthChange = previousMonth ? ((currentMonth - previousMonth) / previousMonth) * 100 : 0

  const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0)
  const averageTransaction = transactions.length ? totalSpending / transactions.length : 0
  const maxTransaction = Math.max(...transactions.map(t => t.amount), 0)

  return (
    <AppLayout user={user}>
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">支出分析</h1>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="3months">過去3ヶ月</option>
            <option value="6months">過去6ヶ月</option>
            <option value="1year">過去1年</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">今月の支出</p>
                  <DollarSign className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold">¥{currentMonth.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-2">
                  {monthChange > 0 ? (
                    <>
                      <ArrowUp className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-red-500">+{monthChange.toFixed(1)}%</span>
                    </>
                  ) : (
                    <>
                      <ArrowDown className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-500">{monthChange.toFixed(1)}%</span>
                    </>
                  )}
                  <span className="text-xs text-gray-500">前月比</span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">期間合計</p>
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold">¥{totalSpending.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-2">{transactions.length}件の取引</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">平均支出</p>
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold">¥{Math.round(averageTransaction).toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-2">1取引あたり</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-gray-600">最大支出</p>
                  <LineChart className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-2xl font-bold">¥{maxTransaction.toLocaleString()}</p>
                <p className="text-sm text-gray-500 mt-2">単一取引</p>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid lg:grid-cols-2 gap-8 mb-8">
              {/* Monthly Trend */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4">月別支出推移</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrend}>
                    <defs>
                      <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#3B82F6"
                      fillOpacity={1}
                      fill="url(#colorAmount)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4">カテゴリ別支出</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={categoryBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Day of Week Analysis */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4">曜日別支出パターン</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dayOfWeekData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
                    <Bar dataKey="amount" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Top Merchants */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h2 className="text-lg font-semibold mb-4">支出先TOP10</h2>
                <div className="space-y-3">
                  {topMerchants.map((merchant, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500 w-6">
                          {index + 1}.
                        </span>
                        <div>
                          <p className="font-medium text-gray-900">{merchant.name}</p>
                          <p className="text-xs text-gray-500">{merchant.count}回の取引</p>
                        </div>
                      </div>
                      <p className="font-semibold text-gray-900">
                        ¥{merchant.amount.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  )
}