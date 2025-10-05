'use client'

import { useState } from 'react'
import { CreditCard, ChevronDown, ChevronUp } from 'lucide-react'
import { Transaction } from '@/app/types/database'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface CardBreakdownProps {
  transactions: Transaction[]
}

const ISSUER_COLORS: Record<string, string> = {
  '楽天カード': '#BF0000',
  'JCBカード': '#0066CC',
  '三井住友カード': '#00A040',
  'エポスカード': '#C80032',
  'セゾンカード': '#0068B7',
  'イオンカード': '#EC008C',
  'dカード': '#FF6600',
  'au PAYカード': '#FF6600',
  'PayPayカード': '#FF0000'
}

const FALLBACK_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#3B82F6', '#6B7280', '#14B8A6', '#F43F5E', '#FB923C',
  '#06B6D4', '#A78BFA', '#34D399', '#FBBF24', '#F87171'
]

export default function CardBreakdown({ transactions }: CardBreakdownProps) {
  const [expandedCard, setExpandedCard] = useState<string | null>(null)

  // Calculate card totals grouped by card issuer (not category)
  const cardTotals = transactions.reduce((acc, t) => {
    // Priority: card_issuer_name > card_brand + last4 > "現金・その他"
    let cardKey: string
    let issuerName: string

    if (t.card_issuer_name) {
      cardKey = t.card_issuer_name
      issuerName = t.card_issuer_name
    } else if (t.card_last4) {
      cardKey = `${t.card_brand || 'カード'} ****${t.card_last4}`
      issuerName = ''
    } else {
      cardKey = '現金・その他'
      issuerName = ''
    }

    if (!acc[cardKey]) {
      acc[cardKey] = {
        total: 0,
        count: 0,
        issuer: issuerName,
        transactions: []
      }
    }
    acc[cardKey].total += t.amount
    acc[cardKey].count += 1
    acc[cardKey].transactions.push(t)
    return acc
  }, {} as Record<string, { total: number; count: number; issuer: string; transactions: Transaction[] }>)

  const cards = Object.entries(cardTotals).sort((a, b) => b[1].total - a[1].total)

  // Function to get color for a card issuer
  const getColor = (issuerName: string, index: number) => {
    return ISSUER_COLORS[issuerName] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  }

  const toggleCard = (cardName: string) => {
    setExpandedCard(expandedCard === cardName ? null : cardName)
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow">
      <h3 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2">
        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
        カード別利用状況
      </h3>

      {cards.length === 0 ? (
        <p className="text-gray-500 text-center py-8">データがありません</p>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {cards.map(([cardName, data], index) => {
            const isExpanded = expandedCard === cardName
            // Sort transactions by date descending
            const sortedTransactions = [...data.transactions].sort((a, b) => {
              const dateA = new Date(a.emails?.received_at || a.transaction_date)
              const dateB = new Date(b.emails?.received_at || b.transaction_date)
              return dateB.getTime() - dateA.getTime()
            })

            return (
              <div key={cardName} className="border rounded-lg overflow-hidden">
                {/* Card Header - Always visible */}
                <div className="p-3 sm:p-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div
                        className="w-2 h-6 sm:h-8 rounded flex-shrink-0"
                        style={{ backgroundColor: getColor(data.issuer, index) }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm sm:text-base truncate">{cardName}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-base sm:text-lg">¥{data.total.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{data.count}件</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${(data.total / Math.max(...cards.map(c => c[1].total))) * 100}%`,
                        backgroundColor: getColor(data.issuer, index)
                      }}
                    />
                  </div>

                  {/* Recent transactions preview */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">最近の利用</p>
                    <div className="space-y-1">
                      {sortedTransactions.slice(0, 3).map((t) => (
                        <div key={t.id} className="flex justify-between text-xs gap-2">
                          <span className="text-gray-600 truncate flex-1 min-w-0">{t.merchant}</span>
                          <span className="font-medium flex-shrink-0">¥{t.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => toggleCard(cardName)}
                    className="mt-3 w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700 py-2 border-t"
                  >
                    {isExpanded ? (
                      <>
                        <span>閉じる</span>
                        <ChevronUp className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <span>全{data.count}件の取引を見る</span>
                        <ChevronDown className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded transactions list */}
                {isExpanded && (
                  <div className="border-t bg-gray-50 max-h-96 overflow-y-auto">
                    <div className="divide-y">
                      {sortedTransactions.map((t) => (
                        <div key={t.id} className="p-3 hover:bg-white transition-colors">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{t.merchant}</p>
                              {t.item_name && (
                                <p className="text-xs text-gray-600 truncate">{t.item_name}</p>
                              )}
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {t.category && (
                                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                                    {t.category}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {format(new Date(t.emails?.received_at || t.transaction_date), 'M月d日', { locale: ja })}
                                </span>
                              </div>
                            </div>
                            <p className="font-semibold text-sm flex-shrink-0">¥{t.amount.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Total summary */}
          <div className="border-t pt-3 sm:pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-sm sm:text-base">合計</span>
              <span className="text-lg sm:text-xl font-bold">
                ¥{cards.reduce((sum, [_, data]) => sum + data.total, 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}