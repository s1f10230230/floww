import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/app/lib/supabase-server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  // Get current user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/?error=Not authenticated`)
  }

  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${origin}/api/auth/gmail/callback`
  )

  // Generate auth URL with Gmail scope
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email'
    ],
    prompt: 'consent',
    state: user.id // Pass user ID in state
  })

  return NextResponse.redirect(authUrl)
}