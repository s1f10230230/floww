import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/app/lib/supabase-server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/onboarding'

  if (code) {
    const supabase = await createClient()
    const { error, data } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Get the user
      const user = data.session.user

      console.log('Session data:', {
        provider_token: data.session.provider_token ? 'exists' : 'missing',
        provider_refresh_token: data.session.provider_refresh_token ? 'exists' : 'missing'
      })

      // Save/update the profile with Gmail tokens using service client (bypasses RLS)
      if (user) {
        const serviceClient = createServiceClient()

        const profileData: any = {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
          updated_at: new Date().toISOString()
        }

        // Determine provider type
        const provider = user.app_metadata?.provider || 'google'

        // Add provider-specific tokens
        if (data.session.provider_token) {
          if (provider === 'azure' || provider === 'microsoft') {
            profileData.microsoft_access_token = data.session.provider_token
          } else {
            profileData.gmail_access_token = data.session.provider_token
          }
        }
        if (data.session.provider_refresh_token) {
          if (provider === 'azure' || provider === 'microsoft') {
            profileData.microsoft_refresh_token = data.session.provider_refresh_token
            profileData.microsoft_token_expiry = new Date(Date.now() + 3600 * 1000).toISOString()
          } else {
            profileData.gmail_refresh_token = data.session.provider_refresh_token
            profileData.gmail_token_expiry = new Date(Date.now() + 3600 * 1000).toISOString()
          }
        }

        const { error: profileError } = await serviceClient
          .from('profiles')
          .upsert(profileData)

        if (profileError) {
          console.error('Profile upsert error:', profileError)
        } else {
          console.log('Profile created/updated successfully')
        }

        // Check if user already completed onboarding and IMAP setup
        const { data: profile } = await serviceClient
          .from('profiles')
          .select('plan_id, imap_enabled')
          .eq('id', user.id)
          .single()

        // Redirect based on user status
        let redirectPath = '/onboarding'
        if (profile?.plan_id) {
          // User has completed onboarding, check IMAP setup
          redirectPath = profile.imap_enabled ? '/dashboard' : '/settings/imap'
        }
        return NextResponse.redirect(`${origin}${redirectPath}`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}