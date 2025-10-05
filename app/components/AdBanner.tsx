'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, Crown } from 'lucide-react'

interface AdBannerProps {
  userPlan?: any
  slot?: string // AdSense slot ID
  format?: 'horizontal' | 'vertical' | 'square'
  className?: string
}

export default function AdBanner({ userPlan, slot, format = 'horizontal', className = '' }: AdBannerProps) {
  // Don't show ads for paid plans
  if (userPlan && userPlan.name !== 'Free') {
    return null
  }

  useEffect(() => {
    // Load AdSense ads
    try {
      if (typeof window !== 'undefined' && (window as any).adsbygoogle && slot) {
        const adElements = document.querySelectorAll('.adsbygoogle')
        const lastAd = adElements[adElements.length - 1]

        // Only push if this ad hasn't been loaded yet
        if (lastAd && !lastAd.getAttribute('data-adsbygoogle-status')) {
          ;((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({})
        }
      }
    } catch (error) {
      console.error('AdSense error:', error)
    }
  }, [slot])

  const dimensions = {
    horizontal: { width: '100%', height: '90px' },
    vertical: { width: '160px', height: '600px' },
    square: { width: '300px', height: '250px' }
  }

  return (
    <div className={`relative bg-gray-50 rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Upgrade prompt */}
      <div className="absolute top-2 right-2 z-10">
        <Link
          href="/upgrade"
          className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full hover:bg-blue-600 transition-colors shadow-sm"
        >
          <Crown className="w-3 h-3" />
          広告を非表示
        </Link>
      </div>

      {/* AdSense Ad */}
      <div className="flex items-center justify-center p-4" style={dimensions[format]}>
        {slot ? (
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', height: '100%' }}
            data-ad-client="ca-pub-6475316584558352"
            data-ad-slot={slot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        ) : (
          // Fallback promotional banner
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">
              広告を非表示にして、さらに多くの機能を利用しませんか？
            </p>
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-colors"
            >
              <Crown className="w-4 h-4" />
              Standardプランにアップグレード
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
