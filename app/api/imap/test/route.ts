import { NextResponse } from 'next/server'
import Imap from 'imap'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, host, port } = body

    if (!email || !password || !host) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Test IMAP connection
    const testResult = await testImapConnection(email, password, host, port || 993)

    if (testResult.success) {
      return NextResponse.json({ success: true, message: 'Connection successful' })
    } else {
      return NextResponse.json({ error: testResult.error }, { status: 400 })
    }

  } catch (error: any) {
    console.error('[imap/test] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function testImapConnection(
  user: string,
  password: string,
  host: string,
  port: number
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const imap = new Imap({
      user,
      password,
      host,
      port,
      tls: true,
      tlsOptions: { rejectUnauthorized: false }
    })

    const timeout = setTimeout(() => {
      imap.end()
      resolve({ success: false, error: 'Connection timeout' })
    }, 10000)

    imap.once('ready', () => {
      clearTimeout(timeout)
      imap.end()
      resolve({ success: true })
    })

    imap.once('error', (err: Error) => {
      clearTimeout(timeout)
      resolve({ success: false, error: err.message })
    })

    try {
      imap.connect()
    } catch (err: any) {
      clearTimeout(timeout)
      resolve({ success: false, error: err.message })
    }
  })
}
