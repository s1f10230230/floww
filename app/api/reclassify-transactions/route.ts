import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import { classifyCategory } from '@/app/lib/category-classifier'

/**
 * Reclassify all existing transactions based on current merchant category mappings
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Load merchant category mappings
    const { data: merchantMappings } = await supabase
      .from('merchant_category_mappings')
      .select('merchant_name, category')
      .eq('user_id', user.id)

    const merchantCategoryMap = new Map<string, string>()
    merchantMappings?.forEach((m: any) => {
      merchantCategoryMap.set(m.merchant_name, m.category)
    })

    // Get all transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('id, merchant, item_name, category')
      .eq('user_id', user.id)

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No transactions to reclassify'
      })
    }

    // Reclassify each transaction
    let updatedCount = 0
    const batchSize = 100

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize)

      const updates = batch.map(t => {
        // Determine new category: user mapping > auto-classify > keep existing
        const newCategory = merchantCategoryMap.get(t.merchant)
          || classifyCategory(t.merchant, t.item_name)
          || t.category
          || 'その他'

        return {
          id: t.id,
          category: newCategory
        }
      })

      // Batch update
      for (const update of updates) {
        const { error } = await supabase
          .from('transactions')
          .update({ category: update.category })
          .eq('id', update.id)

        if (!error) {
          updatedCount++
        }
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: transactions.length,
      message: `${updatedCount}件の取引を再分類しました`
    })

  } catch (error: any) {
    console.error('Reclassify error:', error)
    return NextResponse.json({
      error: 'Failed to reclassify transactions',
      details: error.message
    }, { status: 500 })
  }
}
