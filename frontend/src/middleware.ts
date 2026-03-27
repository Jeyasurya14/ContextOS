// frontend/src/middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/privacy', '/terms', '/refund']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token =
    request.cookies.get('ctx_token')?.value ||
    request.headers.get('x-auth-token')

  // Redirect authenticated users away from landing/auth pages
  if (token && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/invite/')

  if (isPublic) return NextResponse.next()

  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
