'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  CreditCard,
  Settings,
  FileText,
  TrendingUp,
  LogOut,
  Menu,
  X,
  User,
  Crown,
  ChevronLeft,
  ChevronRight,
  Tag,
  BookOpen,
  MessageSquare
} from 'lucide-react'
import { createClient } from '@/app/lib/supabase-client'
import { FlowwWordmark, FlowwIcon } from './FlowwLogo'

interface AppLayoutProps {
  children: React.ReactNode
  user: any
}

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: 'カード管理', href: '/cards', icon: CreditCard },
  { name: 'カテゴリ設定', href: '/categories', icon: Tag },
  { name: '分析', href: '/analytics', icon: TrendingUp },
  { name: 'レポート', href: '/reports', icon: FileText },
  { name: 'フィードバック', href: '/feedback', icon: MessageSquare },
  { name: '使い方', href: '/guide', icon: BookOpen },
  { name: '設定', href: '/settings', icon: Settings },
]

export default function AppLayout({ children, user }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default to open on desktop
  const [isMobile, setIsMobile] = useState(true) // Default to true to prevent SSR issues
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024
      setIsMobile(mobile)
      // Auto-close on mobile
      if (mobile) {
        setSidebarOpen(false)
      }
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'
      } fixed lg:relative inset-y-0 left-0 z-50 bg-white shadow-xl transition-all duration-300 ease-in-out flex-shrink-0`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b">
            {sidebarOpen ? (
              <div className="flex items-center gap-2">
                <FlowwIcon size={32} shadow={false} />
                <FlowwWordmark size={28} />
              </div>
            ) : (
              <div className="lg:block hidden">
                <FlowwIcon size={32} shadow={false} />
              </div>
            )}
            <button
              className={`${isMobile ? '' : 'lg:block'} ${sidebarOpen ? '' : 'lg:ml-auto'}`}
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {isMobile ? (
                <X className="w-6 h-6" />
              ) : sidebarOpen ? (
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-600" />
              )}
            </button>
          </div>

          {/* User info */}
          <div className={`${sidebarOpen ? 'px-4' : 'px-2'} py-4 border-b`}>
            <div className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'}`}>
              <div className={`${sidebarOpen ? 'w-10 h-10' : 'w-8 h-8'} rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0`}>
                <User className={`${sidebarOpen ? 'w-6 h-6' : 'w-5 h-5'} text-white`} />
              </div>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Freeプラン
                  </p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <Link
                href="/upgrade"
                className="mt-3 block w-full text-center py-2 px-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
              >
                アップグレード
              </Link>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={!sidebarOpen ? item.name : undefined}
                  className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Bottom actions */}
          <div className={`${sidebarOpen ? 'p-4' : 'p-2'} border-t`}>
            <button
              onClick={handleSignOut}
              title={!sidebarOpen ? 'ログアウト' : undefined}
              className={`flex items-center ${sidebarOpen ? 'gap-3 w-full' : 'justify-center'} px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-colors`}
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span>ログアウト</span>}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b flex-shrink-0">
          <div className="flex items-center justify-between px-4 h-16">
            <div className="flex items-center gap-2">
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="p-2"
                >
                  <Menu className="w-6 h-6" />
                </button>
              )}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-4 ml-auto">
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 flex-shrink-0">
          <div className="px-6 py-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600">
              <span>© 2025 Floww</span>
              <div className="flex gap-4">
                <a href="/privacy" className="hover:text-gray-900 transition-colors">
                  プライバシーポリシー
                </a>
                <a href="/terms" className="hover:text-gray-900 transition-colors">
                  利用規約
                </a>
                <a href="/feedback" className="hover:text-gray-900 transition-colors">
                  お問い合わせ
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}