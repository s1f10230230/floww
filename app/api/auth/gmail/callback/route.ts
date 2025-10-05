import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient, createServiceClient } from '@/app/lib/supabase-server'

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

    // Save tokens to profile using service client (bypass RLS on insert)
    const serviceClient = createServiceClient()

    // Ensure email is provided to satisfy NOT NULL constraint
    let email: string | null = null
    try {
      const { data: existingProfile } = await serviceClient
        .from('profiles')
        .select('email')
        .eq('id', state)
        .maybeSingle()
      email = existingProfile?.email || null
    } catch {}

    if (!email) {
      // Fallback: read from current session user via standard client
      const supabase = await createClient()
      const { data: { user: sessUser } } = await supabase.auth.getUser()
      email = sessUser?.email || null
    }

    const { error } = await serviceClient
      .from('profiles')
      .upsert({
        id: state, // User ID
        email: email || undefined,
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
