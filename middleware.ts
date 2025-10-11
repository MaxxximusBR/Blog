import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function randomId(n=32){ return Array.from({length:n},()=>Math.random().toString(36).slice(2)).join('').slice(0,n); }

export function middleware(req: NextRequest) {
  // injeta CSRF se faltar
  const csrf = req.cookies.get('csrf')?.value;
  if (!csrf) {
    const res = NextResponse.next();
    res.cookies.set('csrf', randomId(32), { httpOnly:false, sameSite:'lax', secure: process.env.NODE_ENV==='production', path:'/' });
    return res;
  }

  const p = req.nextUrl.pathname;
  const isProtected =
  p.startsWith('/admin') ||
  p.startsWith('/api/upload') ||
  (p.startsWith('/api/admin') &&
    !p.startsWith('/api/admin/login') &&    // ← manter esta exceção
    !p.startsWith('/api/admin/logout'));

  if (!isProtected) return NextResponse.next();

  const cookie = req.cookies.get('admin_auth')?.value;
  if (cookie === '1') return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/:path*'] };
