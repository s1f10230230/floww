'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Onboarding() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to new 3-step onboarding
    router.push('/onboarding/step1')
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">リダイレクト中...</p>
      </div>
    </div>
  )
}