'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Transaction } from '@/app/types/database'

interface CategoryBreakdownProps {
  transactions: Transaction[]
}

const COLORS = {
  '食費': '#EF4444',
  '日用品': '#F59E0B',
  '衣類': '#10B981',
  '美容・健康': '#EC4899',
  '趣味・娯楽': '#8B5CF6',
  '書籍': '#3B82F6',
  '家電・ガジェット': '#6B7280',
  'サブスク': '#4F46E5',
  '交通費': '#14B8A6',
  '医療費': '#F43F5E',
  '光熱費': '#FB923C',
  '通信費': '#06B6D4',
  'その他': '#9CA3AF'
}

// Fallback colors for unknown categories
const FALLBACK_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#EC4899', '#8B5CF6',
  '#3B82F6', '#6B7280', '#4F46E5', '#14B8A6', '#F43F5E',
  '#FB923C', '#06B6D4', '#9CA3AF', '#A78BFA', '#34D399',
  '#FBBF24', '#F87171', '#60A5FA', '#C084FC', '#2DD4BF'
]

export default function CategoryBreakdown({ transactions }: CategoryBreakdownProps) {
  // Calculate category totals
  const categoryTotals = transactions.reduce((acc, t) => {
    const category = t.category || 'その他'
    acc[category] = (acc[category] || 0) + t.amount
    return acc
  }, {} as Record<string, number>)

  const data = Object.entries(categoryTotals).map(([name, value]) => ({
    name,
    value,
    percentage: (value / transactions.reduce((sum, t) => sum + t.amount, 0) * 100).toFixed(1)
  }))

  // Function to get color for a category
  const getColor = (categoryName: string, index: number) => {
    return COLORS[categoryName as keyof typeof COLORS] || FALLBACK_COLORS[index % FALLBACK_COLORS.length]
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload[0]) {
      return (
        <div className="bg-white p-2 rounded shadow-lg border">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">¥{payload[0].value.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{payload[0].payload.percentage}%</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white p-4 sm:p-6 rounded-xl shadow">
      <h3 className="text-base sm:text-lg font-semibold mb-4">カテゴリ別支出</h3>

      {data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">データがありません</p>
      ) : (
        <>
          <div className="w-full" style={{ aspectRatio: '1/1', maxHeight: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} ${percentage}%`}
                  outerRadius="70%"
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getColor(entry.name, index)} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 space-y-2">
            {data.sort((a, b) => b.value - a.value).map((category, index) => (
              <div key={category.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: getColor(category.name, index) }}
                  />
                  <span className="text-xs sm:text-sm truncate">{category.name}</span>
                </div>
                <div className="text-xs sm:text-sm text-right flex-shrink-0">
                  <span className="font-medium">¥{category.value.toLocaleString()}</span>
                  <span className="text-gray-500 ml-2">({category.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}