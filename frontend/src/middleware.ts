// frontend/src/middleware.ts

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/register', '/privacy', '/terms', '/refund']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith('/invite/')

  if (isPublic) return NextResponse.next()

  if (!pathname.startsWith('/dashboard')) return NextResponse.next()

  const token =
    request.cookies.get('ctx_token')?.value ||
    request.headers.get('x-auth-token')

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
