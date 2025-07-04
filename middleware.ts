import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  try {
    console.log("Middleware running for path:", request.nextUrl.pathname);

    // Update user's auth session
    const response = await updateSession(request);

    // Get user authentication status
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // This is handled by updateSession
          },
        },
      },
    );

    const { data, error } = await supabase.auth.getUser();
    console.log(
      "Auth status:",
      data?.user ? "Authenticated" : "Not authenticated",
      error ? `Error: ${error.message}` : "",
    );

    const url = new URL(request.url);
    console.log("URL path:", url.pathname);

    // Handle routing based on authentication
    if (url.pathname === "/" || url.pathname === "") {
      console.log("Handling root path");
      if (data?.user) {
        console.log("User authenticated, allowing access to root");
        return response;
      } else {
        console.log("User not authenticated, redirecting to sign-in");
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }

    // For protected routes
    if (
      url.pathname.startsWith("/search-trip") ||
      url.pathname.startsWith("/search-history") ||
      url.pathname.startsWith("/protected")
    ) {
      console.log("Protected route detected");
      if (!data?.user) {
        console.log("User not authenticated, redirecting from protected route");
        return NextResponse.redirect(new URL("/sign-in", request.url));
      }
    }

    return response;
  } catch (error) {
    console.error("Middleware error:", error);
    // Fall back to redirecting to sign-in on error
    return NextResponse.redirect(new URL("/sign-in", request.url));
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
