import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const supabase = await createClient()

  // Supabase OAuth with Google + Gmail scope
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'email profile https://www.googleapis.com/auth/gmail.readonly',
      redirectTo: `${origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    return NextResponse.redirect(`${origin}?error=${error.message}`)
  }

  if (data.url) {
    return NextResponse.redirect(data.url)
  }

  return NextResponse.redirect(`${origin}?error=Failed to generate auth URL`)
}