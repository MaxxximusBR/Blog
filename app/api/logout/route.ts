
import { NextResponse } from 'next/server';
export async function POST(){
  const res = NextResponse.redirect(new URL('/login', process.env.SITE_URL || 'http://localhost:3000'));
  res.cookies.set('admin_auth','',{ httpOnly:true, secure:false, sameSite:'lax', path:'/', expires: new Date(0) });
  return res;
}
