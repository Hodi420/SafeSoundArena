import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Protect dev environment with a simple token gate
export function middleware(req: NextRequest) {
  // Allow public assets and API routes to pass
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/public') ||
    pathname === '/dev-login'
  ) {
    return NextResponse.next();
  }

  // Only gate in development unless FORCE_DEV_GATE provided
  const isDev = process.env.NODE_ENV !== 'production' || process.env.FORCE_DEV_GATE === 'true';
  if (!isDev) return NextResponse.next();

  const cookie = req.cookies.get('dev_access')?.value;
  const secret = process.env.DEV_ACCESS_TOKEN;
  if (cookie && secret && cookie === secret) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/dev-login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
