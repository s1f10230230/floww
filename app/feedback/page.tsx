'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase-client'
import AppLayout from '@/app/components/AppLayout'
import { useToast, ToastContainer } from '@/app/components/Toast'
import { MessageSquare, Plus, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

interface Feedback {
  id: string
  type: string
  title: string
  description: string
  status: string
  priority: string
  admin_notes?: string
  created_at: string
  updated_at: string
  resolved_at?: string
}

export default function FeedbackPage() {
  const router = useRouter()
  const toast = useToast()
  const [user, setUser] = useState<any>(null)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    type: 'feature_request',
    title: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

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

    // Load user's feedback
    const { data: feedbackData, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (!error && feedbackData) {
      setFeedbacks(feedbackData)
    }

    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('タイトルと内容を入力してください')
      return
    }

    setSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from('feedback')
      .insert({
        user_id: user.id,
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim()
      })

    if (error) {
      toast.error('送信に失敗しました: ' + error.message)
    } else {
      toast.success('フィードバックを送信しました')
      setFormData({ type: 'feature_request', title: '', description: '' })
      setShowModal(false)
      loadData()
    }

    setSubmitting(false)
  }

  const typeLabels: Record<string, string> = {
    feature_request: '機能要望',
    bug_report: 'バグ報告',
    inquiry: 'お問い合わせ',
    other: 'その他'
  }

  const statusLabels: Record<string, { label: string, icon: any, color: string }> = {
    open: { label: '受付中', icon: Clock, color: 'text-blue-600 bg-blue-50' },
    in_progress: { label: '対応中', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50' },
    resolved: { label: '解決済み', icon: CheckCircle, color: 'text-green-600 bg-green-50' },
    closed: { label: 'クローズ', icon: XCircle, color: 'text-gray-600 bg-gray-50' }
  }

  return (
    <>
      <ToastContainer toasts={toast.toasts} onRemove={toast.removeToast} />
      <AppLayout user={user}>
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare className="w-6 h-6" />
                フィードバック
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                ご要望やバグ報告、お問い合わせをお送りください
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              新規投稿
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-500">読み込み中...</div>
          ) : feedbacks.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 mb-4">まだフィードバックがありません</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                最初のフィードバックを送る
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => {
                const statusInfo = statusLabels[feedback.status]
                const StatusIcon = statusInfo.icon

                return (
                  <div key={feedback.id} className="bg-white rounded-xl shadow p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                            {typeLabels[feedback.type]}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${statusInfo.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusInfo.label}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg text-gray-900">{feedback.title}</h3>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(feedback.created_at).toLocaleDateString('ja-JP')}
                      </span>
                    </div>

                    <p className="text-gray-700 whitespace-pre-wrap mb-4">{feedback.description}</p>

                    {feedback.admin_notes && (
                      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-medium text-blue-900 mb-1">運営からの返信</p>
                        <p className="text-sm text-blue-800 whitespace-pre-wrap">{feedback.admin_notes}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-xl font-bold mb-4">新規フィードバック</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      種類
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="feature_request">機能要望</option>
                      <option value="bug_report">バグ報告</option>
                      <option value="inquiry">お問い合わせ</option>
                      <option value="other">その他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      タイトル
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="例: カテゴリの一括編集機能が欲しい"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      内容
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="詳細をご記入ください"
                      rows={6}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false)
                        setFormData({ type: 'feature_request', title: '', description: '' })
                      }}
                      className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                    >
                      {submitting ? '送信中...' : '送信'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    </>
  )
}
