'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, Crown, RefreshCw } from 'lucide-react'

interface AdBannerProps {
  userPlan?: any
  slot?: string // AdSense slot ID
  format?: 'horizontal' | 'vertical' | 'square'
  className?: string
}

export default function AdBanner({ userPlan, slot, format = 'horizontal', className = '' }: AdBannerProps) {
  // Temporarily hide ads - show subscription detection feature instead
  const showAds = false

  // Don't show anything for paid plans
  if (userPlan && userPlan.name !== 'Free') {
    return null
  }

  const dimensions = {
    horizontal: { width: '100%', height: '90px' },
    vertical: { width: '160px', height: '600px' },
    square: { width: '300px', height: '250px' }
  }

  // Show subscription detection feature instead of ads
  return (
    <div className={`relative bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 overflow-hidden ${className}`}>
      <div className="flex items-center justify-center p-4" style={dimensions[format]}>
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <RefreshCw className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-semibold text-gray-900">
              継続支払いを自動検出
            </p>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            サブスク、定期購入を見逃さず管理
          </p>
          <Link
            href="/upgrade"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors"
          >
            <Crown className="w-3 h-3" />
            無制限検出にアップグレード
          </Link>
        </div>
      </div>
    </div>
  )
}
