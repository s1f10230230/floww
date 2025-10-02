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
  Bell,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { createClient } from '@/app/lib/supabase-client'

interface AppLayoutProps {
  children: React.ReactNode
  user: any
}

const navigation = [
  { name: 'ダッシュボード', href: '/dashboard', icon: LayoutDashboard },
  { name: 'カード管理', href: '/cards', icon: CreditCard },
  { name: '分析', href: '/analytics', icon: TrendingUp },
  { name: 'レポート', href: '/reports', icon: FileText },
  { name: '設定', href: '/settings', icon: Settings },
]

export default function AppLayout({ children, user }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true) // Default to open on desktop
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
      // Auto-close on mobile
      if (window.innerWidth < 1024) {
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
      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`${
        sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-16'
      } fixed lg:relative inset-y-0 left-0 z-50 bg-white shadow-xl transition-all duration-300 ease-in-out flex-shrink-0`}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 h-16 border-b">
            {sidebarOpen ? (
              <h1 className="text-2xl font-bold text-blue-600">Floww</h1>
            ) : (
              <span className="text-2xl font-bold text-blue-600 lg:block hidden">F</span>
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
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}