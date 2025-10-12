// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function rid(n=32){ return Array.from({length:n},()=>Math.random().toString(36).slice(2)).join('').slice(0,n); }

export function middleware(req: NextRequest){
  if (!req.cookies.get('csrf')?.value){
    const res = NextResponse.next();
    res.cookies.set('csrf', rid(32), { httpOnly:false, sameSite:'lax', secure: process.env.NODE_ENV==='production', path:'/' });
    return res;
  }
  const p = req.nextUrl.pathname;
  const needsAuth = p.startsWith('/admin') || (p.startsWith('/api/admin') && !p.startsWith('/api/admin/login') && !p.startsWith('/api/admin/logout'));
  if (!needsAuth) return NextResponse.next();

  const ok = req.cookies.get('admin_auth')?.value === '1';
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('redirect', p);
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*'] };
