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
  'その他': '#9CA3AF'
}

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
    <div className="bg-white p-6 rounded-xl shadow">
      <h3 className="text-lg font-semibold mb-4">カテゴリ別支出</h3>

      {data.length === 0 ? (
        <p className="text-gray-500 text-center py-8">データがありません</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} ${percentage}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS] || COLORS['その他']} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {data.sort((a, b) => b.value - a.value).map((category) => (
              <div key={category.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[category.name as keyof typeof COLORS] || COLORS['その他'] }}
                  />
                  <span className="text-sm">{category.name}</span>
                </div>
                <div className="text-sm text-right">
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