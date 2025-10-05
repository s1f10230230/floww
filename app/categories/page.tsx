'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import { Tag, Save, BookOpen } from 'lucide-react'
import { useToast, ToastContainer } from '@/app/components/Toast'

interface MerchantSummary {
  merchant: string
  count: number
  total_amount: number
  current_category?: string
}

const DEFAULT_CATEGORIES = [
  '食費',
  'コンビニ',
  '日用品',
  '衣類',
  '美容・健康',
  '趣味・娯楽',
  '書籍',
  '家電・ガジェット',
  'サブスク',
  '交通費',
  '医療費',
  '光熱費',
  '通信費',
  'EC',
  '海外利用',
  'その他'
]

export default function CategoriesPage() {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [merchants, setMerchants] = useState<MerchantSummary[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [allCategories, setAllCategories] = useState<string[]>(DEFAULT_CATEGORIES)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/')
      return
    }

    setUser(user)

    // Get all transactions grouped by merchant
    const { data: transactions } = await supabase
      .from('transactions')
      .select('merchant, amount, category')
      .eq('user_id', user.id)

    // Group by merchant
    const merchantMap = new Map<string, MerchantSummary>()
    transactions?.forEach(t => {
      const existing = merchantMap.get(t.merchant)
      if (existing) {
        existing.count++
        existing.total_amount += t.amount
      } else {
        merchantMap.set(t.merchant, {
          merchant: t.merchant,
          count: 1,
          total_amount: t.amount,
          current_category: t.category
        })
      }
    })

    const merchantList = Array.from(merchantMap.values())
      .sort((a, b) => b.count - a.count)

    setMerchants(merchantList)

    // Load existing mappings
    const { data: existingMappings } = await supabase
      .from('merchant_category_mappings')
      .select('*')
      .eq('user_id', user.id)

    const mappingObj: Record<string, string> = {}
    existingMappings?.forEach(m => {
      mappingObj[m.merchant_name] = m.category
    })

    setMappings(mappingObj)

    // Get unique categories from transactions and mappings
    const categoriesSet = new Set(DEFAULT_CATEGORIES)
    transactions?.forEach(t => {
      if (t.category) categoriesSet.add(t.category)
    })
    existingMappings?.forEach(m => {
      categoriesSet.add(m.category)
    })

    setAllCategories(Array.from(categoriesSet).sort())
    setLoading(false)
  }

  const handleCategoryChange = (merchant: string, category: string) => {
    setMappings(prev => ({
      ...prev,
      [merchant]: category
    }))
  }

  const saveAllMappings = async () => {
    setSaving(true)
    const supabase = createClient()

    try {
      // Prepare all mappings for upsert
      const mappingsToSave = Object.entries(mappings).map(([merchant, category]) => ({
        user_id: user.id,
        merchant_name: merchant,
        category: category?.trim() || null
      }))

      const { error } = await supabase
        .from('merchant_category_mappings')
        .upsert(mappingsToSave, {
          onConflict: 'user_id,merchant_name'
        })

      if (error) {
        toast.error('保存に失敗しました: ' + error.message)
      } else {
        toast.success(`${mappingsToSave.length}件のカテゴリを保存しました`)
        // Reload to reflect changes
        await loadData()
      }
    } catch (error) {
      console.error('Save all error:', error)
      toast.error('保存中にエラーが発生しました')
    } finally {
      setSaving(false)
    }
  }


  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <AppLayout user={user}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-6 h-6" />
                カテゴリ設定
              </h1>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2 flex-wrap">
                各利用先のカテゴリを設定して、支出をグループ化できます
                <button
                  onClick={() => router.push('/guide')}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <BookOpen className="w-4 h-4" />
                  詳しい使い方
                </button>
              </p>
            </div>
            <button
              onClick={saveAllMappings}
              disabled={saving || Object.keys(mappings).length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 w-full sm:w-auto"
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : 'すべて保存'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">読み込み中...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {/* Desktop table view */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      マーチャント名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      取引件数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      合計金額
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      カテゴリ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {merchants.map((m, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="font-medium text-gray-900">{m.merchant}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {m.count}件
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        ¥{m.total_amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          list={`categories-${idx}`}
                          value={mappings[m.merchant] !== undefined ? mappings[m.merchant] : (m.current_category || '')}
                          onChange={(e) => handleCategoryChange(m.merchant, e.target.value)}
                          placeholder="カテゴリなし（空欄可）"
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <datalist id={`categories-${idx}`}>
                          {allCategories.map(cat => (
                            <option key={cat} value={cat} />
                          ))}
                        </datalist>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card view */}
            <div className="md:hidden divide-y divide-gray-200">
              {merchants.map((m, idx) => (
                <div key={idx} className="p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900">{m.merchant}</p>
                      <div className="flex gap-3 mt-1 text-sm text-gray-600">
                        <span>{m.count}件</span>
                        <span>¥{m.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      list={`categories-mobile-${idx}`}
                      value={mappings[m.merchant] !== undefined ? mappings[m.merchant] : (m.current_category || '')}
                      onChange={(e) => handleCategoryChange(m.merchant, e.target.value)}
                      placeholder="カテゴリなし（空欄可）"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <datalist id={`categories-mobile-${idx}`}>
                      {allCategories.map(cat => (
                        <option key={cat} value={cat} />
                      ))}
                    </datalist>
                  </div>
                </div>
              ))}
            </div>

            {merchants.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <Tag className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p>まだ取引データがありません</p>
                <p className="text-sm mt-2">メールを同期すると、マーチャントが表示されます</p>
              </div>
            )}
          </div>
        )}
      </div>
      </AppLayout>
    </>
  )
}
