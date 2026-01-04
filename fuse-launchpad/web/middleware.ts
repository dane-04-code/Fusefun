import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
    // Check for the "site-access" cookie
    const accessParams = request.cookies.get('site-access')
    const hasAccess = accessParams?.value === 'authenticated'

    // If user has access or is already on the password page, allow
    if (hasAccess || request.nextUrl.pathname.startsWith('/password') || request.nextUrl.pathname.startsWith('/api')) {
        return NextResponse.next()
    }

    // Otherwise, redirect to password page
    // Preserve the original URL they wanted to go to
    const url = request.nextUrl.clone()
    url.pathname = '/password'
    url.searchParams.set('from', request.nextUrl.pathname)
    return NextResponse.redirect(url)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
