import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // @logto/next stores session under cookie name `logto_${appId}`
  const cookies = request.cookies;
  const hasSession = Array.from(cookies.getAll()).some(
    (c) => c.name.startsWith('logto_')
  );

  // Protect dashboard routes - redirect to sign in if not authenticated
  if (pathname.startsWith('/dashboard') && !hasSession) {
    return NextResponse.redirect(new URL('/api/logto/sign-in', request.url));
  }

  // Redirect /create-organization to /dashboard (Logto doesn't use orgs the same way)
  if (pathname.startsWith('/create-organization')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/create-organization/:path*'],
};
