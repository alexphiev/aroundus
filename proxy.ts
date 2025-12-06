import { updateSession } from '@/utils/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
  try {
    // Update user's auth session
    const response = await updateSession(request)

    // Get user authentication status
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // This is handled by updateSession
          },
        },
      }
    )

    const { data } = await supabase.auth.getUser()

    const url = new URL(request.url)

    // Handle routing based on authentication
    if (url.pathname === '/' || url.pathname === '') {
      if (data?.user) {
        return response
      } else {
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }
    }

    // For protected routes
    if (url.pathname.startsWith('/past-places')) {
      if (!data?.user) {
        return NextResponse.redirect(new URL('/sign-in', request.url))
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    // Fall back to redirecting to sign-in on error
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
