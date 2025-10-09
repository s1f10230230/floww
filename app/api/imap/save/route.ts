import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'
import crypto from 'crypto'

// Simple encryption for storing app passwords
// In production, consider using a proper encryption library
const ENCRYPTION_KEY = process.env.IMAP_ENCRYPTION_KEY || 'your-32-char-secret-key-here!!'
const ALGORITHM = 'aes-256-cbc'

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { email, password, host, port } = body

    if (!email || !password || !host) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Encrypt the app password
    const encryptedPassword = encrypt(password)

    // Save to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        imap_email: email,
        imap_password_encrypted: encryptedPassword,
        imap_host: host,
        imap_port: port || 993,
        imap_enabled: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to save IMAP config:', updateError)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('[imap/save] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
