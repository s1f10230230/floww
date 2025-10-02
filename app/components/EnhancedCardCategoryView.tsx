'use client'

import { useState, useEffect } from 'react'
import { CreditCard, PieChart as PieChartIcon, TrendingUp, Calendar } from 'lucide-react'

interface CardData {
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

interface CategoryData {
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

const CARD_COLORS = [
  '#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#3B82F6', '#EC4899', '#14B8A6'
]

const CATEGORY_COLORS: { [key: string]: string } = {
  '食費': '#EF4444',
  '日用品': '#F59E0B',
  '衣類': '#10B981',
  '美容・健康': '#EC4899',
  '趣味・娯楽': '#8B5CF6',
  '書籍': '#3B82F6',
  '家電・ガジェット': '#6B7280',
  'サブスク': '#4F46E5',
  'コンビニ': '#F97316',
  'スーパー': '#84CC16',
  'ドラッグストア': '#06B6D4',
  '飲食店': '#F43F5E',
  'ガソリン': '#64748B',
  '交通': '#0EA5E9',
  'ネットショッピング': '#8B5CF6',
  '携帯・通信': '#14B8A6',
  'その他': '#9CA3AF'
}

export default function EnhancedCardCategoryView() {
  const [view, setView] = useState<'card' | 'category'>('card')
  const [cardData, setCardData] = useState<CardData[]>([])
  const [categoryData, setCategoryData] = useState<CategoryData[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  })
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [dateRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [cardRes, categoryRes] = await Promise.all([
        fetch(`/api/analytics/card-breakdown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        fetch(`/api/analytics/category-breakdown?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`)
      ])

      if (cardRes.ok) {
        const cardResult = await cardRes.json()
        setCardData(cardResult.data || [])
      }

      if (categoryRes.ok) {
        const categoryResult = await categoryRes.json()
        setCategoryData(categoryResult.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalAmount = view === 'card'
    ? cardData.reduce((sum, card) => sum + card.totalAmount, 0)
    : categoryData.reduce((sum, cat) => sum + cat.totalAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="bg-white p-6 rounded-xl shadow">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">支出分析</h2>
            <p className="text-gray-500 text-sm mt-1">カード別・カテゴリ別の詳細な分析</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setView('card')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'card'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              カード別
            </button>
            <button
              onClick={() => setView('category')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'category'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <PieChartIcon className="w-4 h-4 inline mr-2" />
              カテゴリ別
            </button>
          </div>
        </div>

        {/* Date Range Selector */}
        <div className="mt-4 flex gap-4 items-center">
          <Calendar className="w-5 h-5 text-gray-400" />
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
          <span className="text-gray-500">〜</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            className="px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-xl shadow text-white">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-indigo-100 text-sm">合計支出</p>
            <h3 className="text-3xl font-bold mt-1">¥{totalAmount.toLocaleString()}</h3>
          </div>
          <TrendingUp className="w-12 h-12 text-indigo-200" />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">データを読み込み中...</p>
        </div>
      ) : (
        <>
          {view === 'card' ? (
            <CardBreakdownView
              data={cardData}
              selectedCard={selectedCard}
              onSelectCard={setSelectedCard}
            />
          ) : (
            <CategoryBreakdownView
              data={categoryData}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}
        </>
      )}
    </div>
  )
}

function CardBreakdownView({
  data,
  selectedCard,
  onSelectCard
}: {
  data: CardData[]
  selectedCard: string | null
  onSelectCard: (cardId: string | null) => void
}) {
  const selected = data.find(card => card.cardId === selectedCard)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Card List */}
      <div className="lg:col-span-1 space-y-3">
        {data.map((card, index) => (
          <div
            key={card.cardId}
            onClick={() => onSelectCard(card.cardId === selectedCard ? null : card.cardId)}
            className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${
              selectedCard === card.cardId ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-1 h-16 rounded"
                style={{ backgroundColor: CARD_COLORS[index % CARD_COLORS.length] }}
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {card.cardName || `****${card.cardLast4}`}
                </p>
                <p className="text-xs text-gray-500">{card.cardBrand}</p>
                <p className="text-lg font-bold text-indigo-600 mt-1">
                  ¥{card.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">{card.transactionCount}件</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail View */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">カテゴリ内訳</h3>
              <div className="space-y-2">
                {selected.categories.slice(0, 8).map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-gray-600">
                        ¥{cat.amount.toLocaleString()} ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: CATEGORY_COLORS[cat.category] || '#9CA3AF'
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">よく使う店舗</h3>
              <div className="space-y-2">
                {selected.topMerchants.slice(0, 5).map((merchant) => (
                  <div key={merchant.merchant} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate max-w-[60%]">
                      {merchant.merchant}
                    </span>
                    <div className="text-right">
                      <p className="font-semibold">¥{merchant.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{merchant.count}回</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">月別推移</h3>
              <div className="space-y-2">
                {selected.monthlyTrend.map((month) => (
                  <div key={month.month} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{month.month}</span>
                    <div className="text-right">
                      <span className="font-semibold">¥{month.amount.toLocaleString()}</span>
                      <span className="text-gray-500 ml-2">({month.count}件)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">カードを選択して詳細を表示</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CategoryBreakdownView({
  data,
  selectedCategory,
  onSelectCategory
}: {
  data: CategoryData[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
}) {
  const selected = data.find(cat => cat.category === selectedCategory)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Category List */}
      <div className="lg:col-span-1 space-y-3">
        {data.map((category) => (
          <div
            key={category.category}
            onClick={() => onSelectCategory(category.category === selectedCategory ? null : category.category)}
            className={`bg-white p-4 rounded-lg shadow cursor-pointer transition-all ${
              selectedCategory === category.category ? 'ring-2 ring-indigo-500' : 'hover:shadow-md'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[category.category] || '#9CA3AF' }}
              />
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{category.category}</p>
                <p className="text-lg font-bold text-indigo-600 mt-1">
                  ¥{category.totalAmount.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">
                  {category.transactionCount}件 · 平均 ¥{Math.round(category.averageAmount).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detail View */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="bg-white p-6 rounded-lg shadow space-y-6">
            <div>
              <h3 className="text-lg font-bold mb-4">カード別内訳</h3>
              <div className="space-y-3">
                {selected.cards.map((card) => (
                  <div key={card.cardLast4 || 'unknown'} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {card.cardLast4 ? `****${card.cardLast4}` : '現金・その他'}
                      </p>
                      <p className="text-xs text-gray-500">{card.cardBrand}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">¥{card.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{card.count}件</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">よく使う店舗</h3>
              <div className="space-y-2">
                {selected.merchants.slice(0, 5).map((merchant) => (
                  <div key={merchant.merchant} className="flex justify-between items-center">
                    <span className="text-sm text-gray-700 truncate max-w-[60%]">
                      {merchant.merchant}
                    </span>
                    <div className="text-right">
                      <p className="font-semibold">¥{merchant.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{merchant.count}回</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-4">月別推移</h3>
              <div className="space-y-2">
                {selected.trend.map((month) => (
                  <div key={month.month} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{month.month}</span>
                    <div className="text-right">
                      <span className="font-semibold">¥{month.amount.toLocaleString()}</span>
                      <span className="text-gray-500 ml-2">({month.count}件)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-12 rounded-lg shadow text-center">
            <PieChartIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">カテゴリを選択して詳細を表示</p>
          </div>
        )}
      </div>
    </div>
  )
}
