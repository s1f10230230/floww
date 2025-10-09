import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/app/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}?error=No authorization code`)
  }

  const clientId = process.env.YAHOO_CLIENT_ID
  const clientSecret = process.env.YAHOO_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${origin}?error=Yahoo OAuth not configured`)
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.login.yahoo.com/oauth2/get_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        redirect_uri: `${origin}/api/auth/yahoo/callback`,
        grant_type: 'authorization_code'
      })
    })

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text()
      console.error('Yahoo token exchange error:', error)
      return NextResponse.redirect(`${origin}?error=Failed to exchange token`)
    }

    const tokenData = await tokenResponse.json()

    // Get user info
    const userInfoResponse = await fetch('https://api.login.yahoo.com/openid/v1/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(`${origin}?error=Failed to get user info`)
    }

    const userInfo = await userInfoResponse.json()

    // Create or update user in Supabase
    const supabase = await createClient()
    const serviceClient = createServiceClient()

    // Try to find existing user by Yahoo email
    const { data: existingUser } = await serviceClient
      .from('profiles')
      .select('id')
      .eq('email', userInfo.email)
      .single()

    let userId = existingUser?.id

    if (!userId) {
      // Create new user with Supabase Auth (passwordless)
      const { data: authData, error: authError } = await supabase.auth.signInWithOtp({
        email: userInfo.email,
        options: {
          shouldCreateUser: true
        }
      })

      if (authError || !authData) {
        console.error('Supabase auth error:', authError)
        return NextResponse.redirect(`${origin}?error=Failed to create user`)
      }

      userId = authData.user?.id
    }

    if (!userId) {
      return NextResponse.redirect(`${origin}?error=Failed to create user`)
    }

    // Save Yahoo tokens to profile
    const { error: profileError } = await serviceClient
      .from('profiles')
      .upsert({
        id: userId,
        email: userInfo.email,
        full_name: userInfo.name,
        yahoo_access_token: tokenData.access_token,
        yahoo_refresh_token: tokenData.refresh_token,
        yahoo_token_expiry: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Profile upsert error:', profileError)
      return NextResponse.redirect(`${origin}?error=Failed to save tokens`)
    }

    // Check if user completed onboarding
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('plan_id')
      .eq('id', userId)
      .single()

    const redirectPath = profile?.plan_id ? '/dashboard' : '/onboarding'
    return NextResponse.redirect(`${origin}${redirectPath}`)

  } catch (error) {
    console.error('Yahoo OAuth callback error:', error)
    return NextResponse.redirect(`${origin}?error=Authentication failed`)
  }
}
