import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@/app/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // User ID passed from auth request

  if (!code || !state) {
    return NextResponse.redirect(`${origin}/dashboard?error=Invalid callback`)
  }

  try {
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${origin}/api/auth/gmail/callback`
    )

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Save tokens to profile
    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: state, // User ID
        gmail_access_token: tokens.access_token,
        gmail_refresh_token: tokens.refresh_token,
        gmail_token_expiry: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        updated_at: new Date().toISOString()
      })

    if (error) {
      console.error('Error saving Gmail tokens:', error)
      return NextResponse.redirect(`${origin}/dashboard?error=Failed to save Gmail tokens`)
    }

    return NextResponse.redirect(`${origin}/dashboard?gmail=connected`)
  } catch (error) {
    console.error('Gmail OAuth error:', error)
    return NextResponse.redirect(`${origin}/dashboard?error=Gmail authentication failed`)
  }
}