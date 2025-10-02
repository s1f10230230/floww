import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

interface CategoryBreakdownData {
  category: string
  totalAmount: number
  transactionCount: number
  percentage: number
  averageAmount: number
  cards: {
    cardLast4: string
    cardBrand: string
    amount: number
    count: number
  }[]
  merchants: {
    merchant: string
    amount: number
    count: number
  }[]
  trend: {
    month: string
    amount: number
    count: number
  }[]
}

/**
 * GET /api/analytics/category-breakdown
 *
 * カテゴリ別の支出統計を取得
 *
 * Query Parameters:
 * - startDate: 集計開始日 (YYYY-MM-DD)
 * - endDate: 集計終了日 (YYYY-MM-DD)
 * - category: フィルター用カテゴリ名 (optional)
 * - groupBy: 'category' | 'card' | 'month' (default: 'category')
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const endDate = searchParams.get('endDate') || new Date().toISOString().split('T')[0]
    const categoryFilter = searchParams.get('category')
    const groupBy = searchParams.get('groupBy') || 'category'

    // Fetch transactions
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })

    if (categoryFilter) {
      query = query.eq('category', categoryFilter)
    }

    const { data: transactions, error: txError } = await query

    if (txError) {
      console.error('Error fetching transactions:', txError)
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '取引データがありません'
      })
    }

    const totalAmount = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0)

    // Group by category
    const categoryGroups = transactions.reduce((acc, tx) => {
      const category = tx.category || 'その他'
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(tx)
      return acc
    }, {} as Record<string, typeof transactions>)

    // Calculate breakdown for each category
    const categoryBreakdowns: CategoryBreakdownData[] = Object.entries(categoryGroups).map(([category, categoryTxs]) => {
      const categoryTotal = categoryTxs.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0)

      // Card breakdown within category
      const cardMap = categoryTxs.reduce((acc, tx) => {
        const cardKey = tx.card_last4 || 'unknown'
        if (!acc[cardKey]) {
          acc[cardKey] = {
            cardBrand: tx.card_brand || '不明',
            amount: 0,
            count: 0
          }
        }
        acc[cardKey].amount += parseFloat(tx.amount.toString())
        acc[cardKey].count += 1
        return acc
      }, {} as Record<string, { cardBrand: string, amount: number, count: number }>)

      const cards = Object.entries(cardMap)
        .map(([cardLast4, data]) => ({
          cardLast4: cardLast4 !== 'unknown' ? cardLast4 : '',
          cardBrand: data.cardBrand,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount)

      // Merchant breakdown
      const merchantMap = categoryTxs.reduce((acc, tx) => {
        const merchant = tx.merchant
        if (!acc[merchant]) {
          acc[merchant] = { amount: 0, count: 0 }
        }
        acc[merchant].amount += parseFloat(tx.amount.toString())
        acc[merchant].count += 1
        return acc
      }, {} as Record<string, { amount: number, count: number }>)

      const merchants = Object.entries(merchantMap)
        .map(([merchant, data]) => ({
          merchant,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

      // Monthly trend
      const monthlyMap = categoryTxs.reduce((acc, tx) => {
        const month = tx.transaction_date.substring(0, 7)
        if (!acc[month]) {
          acc[month] = { amount: 0, count: 0 }
        }
        acc[month].amount += parseFloat(tx.amount.toString())
        acc[month].count += 1
        return acc
      }, {} as Record<string, { amount: number, count: number }>)

      const trend = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          month,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      return {
        category,
        totalAmount: categoryTotal,
        transactionCount: categoryTxs.length,
        percentage: (categoryTotal / totalAmount) * 100,
        averageAmount: categoryTotal / categoryTxs.length,
        cards,
        merchants,
        trend
      }
    })

    // Sort by total amount descending
    categoryBreakdowns.sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data: categoryBreakdowns,
      summary: {
        totalCategories: categoryBreakdowns.length,
        totalAmount,
        totalTransactions: transactions.length,
        period: { startDate, endDate }
      }
    })

  } catch (error: any) {
    console.error('Category breakdown error:', error)
    return NextResponse.json({
      error: 'Failed to generate category breakdown',
      details: error.message
    }, { status: 500 })
  }
}
