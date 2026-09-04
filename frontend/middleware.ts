import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('swish_auth_token')?.value;
  const role = request.cookies.get('swish_user_role')?.value;

  if (pathname === '/') {
    if (token && role) {
      if (role === 'AGENT') return NextResponse.redirect(new URL('/agent', request.url));
      if (role === 'MANAGER') return NextResponse.redirect(new URL('/manager', request.url));
      if (role === 'CUSTOMER') return NextResponse.redirect(new URL('/customer', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (pathname === '/login') {
    if (token && role) {
      if (role === 'AGENT') return NextResponse.redirect(new URL('/agent', request.url));
      if (role === 'MANAGER') return NextResponse.redirect(new URL('/manager', request.url));
      if (role === 'CUSTOMER') return NextResponse.redirect(new URL('/customer', request.url));
    }
    return NextResponse.next();
  }

  const protectedRoutes = ['/agent', '/manager', '/customer'];
  const isProtected = protectedRoutes.some((route) => pathname.startsWith(route));

  if (!isProtected) {
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/agent') && role !== 'AGENT' && role !== 'MANAGER') {
    return NextResponse.redirect(new URL('/customer', request.url));
  }

  if (pathname.startsWith('/manager') && role !== 'MANAGER') {
    if (role === 'AGENT') {
      return NextResponse.redirect(new URL('/agent', request.url));
    }
    return NextResponse.redirect(new URL('/customer', request.url));
  }

  if (pathname.startsWith('/customer') && role !== 'CUSTOMER') {
    if (role === 'AGENT') {
      return NextResponse.redirect(new URL('/agent', request.url));
    }
    if (role === 'MANAGER') {
      return NextResponse.redirect(new URL('/manager', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/agent/:path*', '/manager/:path*', '/customer/:path*', '/login'],
};
