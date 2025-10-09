import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { origin } = new URL(request.url)

  const clientId = process.env.YAHOO_CLIENT_ID

  if (!clientId) {
    return NextResponse.redirect(`${origin}?error=Yahoo OAuth not configured`)
  }

  // Yahoo OAuth 2.0 authorization URL
  const authUrl = new URL('https://api.login.yahoo.com/oauth2/request_auth')

  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', `${origin}/api/auth/yahoo/callback`)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', 'openid email profile mail-r') // mail-r = read mail

  return NextResponse.redirect(authUrl.toString())
}
