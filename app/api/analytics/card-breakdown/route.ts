import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

interface Transaction {
  id: string
  card_last4: string | null
  amount: number
  category: string | null
  merchant_name: string | null
  transaction_date: string
  [key: string]: any
}

interface CardBreakdownData {
  cardId: string
  cardLast4: string
  cardBrand: string
  cardName?: string
  totalAmount: number
  transactionCount: number
  categories: {
    category: string
    amount: number
    count: number
    percentage: number
  }[]
  monthlyTrend: {
    month: string
    amount: number
    count: number
  }[]
  topMerchants: {
    merchant: string
    amount: number
    count: number
  }[]
}

/**
 * GET /api/analytics/card-breakdown
 *
 * クレジットカード別の利用統計を取得
 *
 * Query Parameters:
 * - startDate: 集計開始日 (YYYY-MM-DD)
 * - endDate: 集計終了日 (YYYY-MM-DD)
 * - cardLast4: フィルター用カード下4桁 (optional)
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
    const cardFilter = searchParams.get('cardLast4')

    // Fetch transactions with card information
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate)
      .order('transaction_date', { ascending: false })

    if (cardFilter) {
      query = query.eq('card_last4', cardFilter)
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

    // Fetch user's registered cards for additional info
    const { data: userCards } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', user.id)

    const cardRegistry = new Map(
      userCards?.map(card => [`${card.card_last4}`, card]) || []
    )

    // Group transactions by card
    const cardGroups = transactions.reduce((acc, tx) => {
      const cardKey = tx.card_last4 || 'unknown'
      if (!acc[cardKey]) {
        acc[cardKey] = []
      }
      acc[cardKey].push(tx)
      return acc
    }, {} as Record<string, Transaction[]>)

    // Calculate breakdown for each card
    const cardBreakdowns: CardBreakdownData[] = (Object.entries(cardGroups) as [string, Transaction[]][]).map(([cardLast4, cardTxs]) => {
      const cardInfo = cardRegistry.get(cardLast4)
      const totalAmount = cardTxs.reduce((sum, tx) => sum + parseFloat(tx.amount.toString()), 0)

      // Category breakdown
      const categoryMap = cardTxs.reduce((acc, tx) => {
        const category = tx.category || 'その他'
        if (!acc[category]) {
          acc[category] = { amount: 0, count: 0 }
        }
        acc[category].amount += parseFloat(tx.amount.toString())
        acc[category].count += 1
        return acc
      }, {} as Record<string, { amount: number, count: number }>)

      const categories = Object.entries(categoryMap)
        .map(([category, data]) => ({
          category,
          amount: data.amount,
          count: data.count,
          percentage: (data.amount / totalAmount) * 100
        }))
        .sort((a, b) => b.amount - a.amount)

      // Monthly trend
      const monthlyMap = cardTxs.reduce((acc, tx) => {
        const month = tx.transaction_date.substring(0, 7) // YYYY-MM
        if (!acc[month]) {
          acc[month] = { amount: 0, count: 0 }
        }
        acc[month].amount += parseFloat(tx.amount.toString())
        acc[month].count += 1
        return acc
      }, {} as Record<string, { amount: number, count: number }>)

      const monthlyTrend = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          month,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => a.month.localeCompare(b.month))

      // Top merchants
      const merchantMap = cardTxs.reduce((acc, tx) => {
        const merchant = tx.merchant
        if (!acc[merchant]) {
          acc[merchant] = { amount: 0, count: 0 }
        }
        acc[merchant].amount += parseFloat(tx.amount.toString())
        acc[merchant].count += 1
        return acc
      }, {} as Record<string, { amount: number, count: number }>)

      const topMerchants = Object.entries(merchantMap)
        .map(([merchant, data]) => ({
          merchant,
          amount: data.amount,
          count: data.count
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)

      return {
        cardId: cardInfo?.id || cardLast4,
        cardLast4: cardLast4 !== 'unknown' ? cardLast4 : '',
        cardBrand: cardTxs[0]?.card_brand || cardInfo?.card_brand || '不明',
        cardName: cardInfo?.card_name,
        totalAmount,
        transactionCount: cardTxs.length,
        categories,
        monthlyTrend,
        topMerchants
      }
    })

    // Sort by total amount descending
    cardBreakdowns.sort((a, b) => b.totalAmount - a.totalAmount)

    return NextResponse.json({
      success: true,
      data: cardBreakdowns,
      summary: {
        totalCards: cardBreakdowns.length,
        totalAmount: cardBreakdowns.reduce((sum, card) => sum + card.totalAmount, 0),
        totalTransactions: transactions.length,
        period: { startDate, endDate }
      }
    })

  } catch (error: any) {
    console.error('Card breakdown error:', error)
    return NextResponse.json({
      error: 'Failed to generate card breakdown',
      details: error.message
    }, { status: 500 })
  }
}
