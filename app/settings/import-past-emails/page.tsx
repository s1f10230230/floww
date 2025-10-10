'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'

export default function ImportPastEmailsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const router = useRouter()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleUpload = async () => {
    if (!file) {
      toast.error('ファイルを選択してください')
      return
    }

    setUploading(true)
    try {
      // Step 1: Upload to Supabase Storage
      const { createClient } = await import('@/app/lib/supabase-client')
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('ログインが必要です')
      }

      const timestamp = Date.now()
      const filePath = `${user.id}/${timestamp}-${file.name}`

      toast.loading('ファイルをアップロード中...')

      const { error: uploadError } = await supabase.storage
        .from('email-imports')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error('アップロード失敗: ' + uploadError.message)
      }

      toast.dismiss()
      toast.loading('メールを処理中...')

      // Step 2: Process the uploaded file
      const response = await fetch('/api/import/mbox', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filePath })
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        throw new Error(`サーバーエラー: ${text.substring(0, 100)}`)
      }

      const data = await response.json()

      toast.dismiss()

      if (response.ok && data.success) {
        setResult(data)
        toast.success(`${data.emailsProcessed}件のメールを処理しました！`)
      } else {
        toast.error(data.error || 'アップロードに失敗しました')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.dismiss()
      toast.error('アップロードエラー: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <Toaster position="top-right" />

      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            過去メールの一括取込
          </h1>
          <p className="text-gray-600 mb-8">
            Gmail/Yahooからエクスポートしたメールファイルをアップロード
          </p>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
            <h2 className="font-semibold text-blue-900 mb-3">
              📋 メールエクスポート手順
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-blue-800 mb-2">Gmail の場合</h3>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>
                    <a
                      href="https://takeout.google.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-blue-900"
                    >
                      Google Takeout
                    </a> を開く
                  </li>
                  <li>「選択をすべて解除」→「メール」のみチェック</li>
                  <li>「次のステップ」→「エクスポートを作成」</li>
                  <li>ダウンロードしたZIPを解凍 → .mbox ファイルを取得</li>
                </ol>
              </div>

              <div>
                <h3 className="font-medium text-blue-800 mb-2">Yahoo の場合</h3>
                <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                  <li>対象メールを選択 → 「その他」→「ダウンロード」</li>
                  <li>.eml ファイルとして保存される</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center mb-6">
            <input
              type="file"
              id="file-upload"
              accept=".mbox,.eml"
              onChange={handleFileSelect}
              className="hidden"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center gap-4"
            >
              <Upload className="w-12 h-12 text-gray-400" />
              {file ? (
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
              ) : (
                <div>
                  <p className="text-gray-700 font-medium mb-1">
                    ファイルを選択
                  </p>
                  <p className="text-sm text-gray-500">
                    .mbox, .eml 形式（最大20MB）
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'アップロード中...' : 'アップロードして取込開始'}
          </button>

          {/* Result */}
          {result && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 mb-2">
                    取込完了！
                  </h3>
                  <div className="text-sm text-green-800 space-y-1">
                    <p>・処理メール数: {result.emailsProcessed}件</p>
                    <p>・新規取引: {result.newTransactions}件</p>
                    {result.duplicates > 0 && (
                      <p>・重複スキップ: {result.duplicates}件</p>
                    )}
                  </div>
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    ダッシュボードで確認
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">注意事項</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>最大20MBまで（約2000通のメール相当）</li>
                  <li>大きいファイルは分割してアップロードしてください</li>
                  <li>同じメールを重複して取り込むことはありません</li>
                  <li>カード会社からのメールのみ処理されます</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/settings/email-forward')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← メール転送設定に戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}