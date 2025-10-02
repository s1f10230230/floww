'use client'

import { CreditCard } from 'lucide-react'
import { Transaction } from '@/app/types/database'

interface CardBreakdownProps {
  transactions: Transaction[]
}

const CARD_COLORS = [
  '#4F46E5', // Indigo
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#3B82F6', // Blue
]

export default function CardBreakdown({ transactions }: CardBreakdownProps) {
  // Calculate card totals
  const cardTotals = transactions.reduce((acc, t) => {
    const cardKey = t.card_last4 ? `****${t.card_last4}` : '現金・その他'
    if (!acc[cardKey]) {
      acc[cardKey] = {
        total: 0,
        count: 0,
        brand: t.card_brand || '',
        transactions: []
      }
    }
    acc[cardKey].total += t.amount
    acc[cardKey].count += 1
    acc[cardKey].transactions.push(t)
    return acc
  }, {} as Record<string, { total: number; count: number; brand: string; transactions: Transaction[] }>)

  const cards = Object.entries(cardTotals).sort((a, b) => b[1].total - a[1].total)

  return (
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <CreditCard className="w-5 h-5" />
        カード別利用状況
      </h3>

      {cards.length === 0 ? (
        <p className="text-gray-500 text-center py-8">データがありません</p>
      ) : (
        <div className="space-y-4">
          {cards.map(([cardNumber, data], index) => (
            <div key={cardNumber} className="border rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-8 rounded"
                    style={{ backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }}
                  />
                  <div>
                    <p className="font-medium">{cardNumber}</p>
                    {data.brand && (
                      <p className="text-xs text-gray-500">{data.brand}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-lg">¥{data.total.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{data.count}件</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${(data.total / Math.max(...cards.map(c => c[1].total))) * 100}%`,
                    backgroundColor: CARD_COLORS[index % CARD_COLORS.length]
                  }}
                />
              </div>

              {/* Recent transactions */}
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">最近の利用</p>
                <div className="space-y-1">
                  {data.transactions.slice(0, 3).map((t) => (
                    <div key={t.id} className="flex justify-between text-xs">
                      <span className="text-gray-600 truncate max-w-[60%]">{t.merchant}</span>
                      <span className="font-medium">¥{t.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Total summary */}
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">合計</span>
              <span className="text-xl font-bold">
                ¥{cards.reduce((sum, [_, data]) => sum + data.total, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}