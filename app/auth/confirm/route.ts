import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' // Assuming server client is in utils

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/' // Default redirect to home

  if (token_hash && type) {
    const supabase = await createClient() // Added await back
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
      // redirectTo: // Not typically needed here as verifyOtp itself confirms and then we redirect
    })
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url).toString()) // Use new URL to construct absolute path
    }
  }

  // If token_hash or type is missing, or if verifyOtp fails, redirect to an error page or home
  console.error(
    'Auth confirmation error: Invalid token or type, or OTP verification failed.'
  )
  // It might be better to redirect to a specific error page e.g. /auth-error
  return NextResponse.redirect(
    new URL('/sign-in?error=confirmation_failed', request.url).toString()
  )
}
