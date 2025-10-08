import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'

  const supabase = await createClient()

  // Supabase OAuth with Microsoft + Mail.Read scope
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'azure',
    options: {
      scopes: 'email profile openid offline_access Mail.Read',
      redirectTo: `${origin}/api/auth/callback`,
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
