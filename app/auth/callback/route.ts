import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server' // Assuming server client is in utils

export async function GET(request: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  if (code) {
    const supabase = await createClient() // Await the server client
    await supabase.auth.exchangeCodeForSession(code)
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`)
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/`)
}
