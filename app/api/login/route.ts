import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';

// rate limit bem simples (evita brute-force)
const buckets = new Map<string,{c:number,t:number}>();
function rateLimit(key:string, ip:string, limit=5, windowMs=60_000){
  const k = `${key}:${ip}`; const now = Date.now();
  const b = buckets.get(k) || {c:0,t:now};
  if (now - b.t > windowMs) { b.c = 0; b.t = now; }
  b.c++; buckets.set(k,b);
  return b.c <= limit;
}
function getIp(req:Request){
  const xf = req.headers.get('x-forwarded-for');
  return (xf?.split(',')[0] || '0.0.0.0').trim();
}

export async function POST(req: Request){
  const ip = getIp(req);
  if (!rateLimit('login', ip, 5, 60_000)) {
    return NextResponse.json({ ok:false, msg:'Muitas tentativas' }, { status: 429 });
  }

  // Aceita tanto application/json quanto form POST
  let password = '', code = '', redirect = '/admin';
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    const body = await req.json().catch(()=>({}));
    password = String(body.password || '');
    code = String(body.code || '');
    redirect = String(body.redirect || '/admin');
  } else {
    const fd = await req.formData();
    password = String(fd.get('password') || '');
    code = String(fd.get('code') || '');
    redirect = String(fd.get('redirect') || '/admin');
  }

  const pass = process.env.ADMIN_PASSWORD;
  const totp = process.env.ADMIN_TOTP_SECRET;

  if (!pass) {
    return NextResponse.json({ ok:false, msg:'ADMIN_PASSWORD ausente no ambiente' }, { status: 500 });
  }
  if (password !== pass) {
    return NextResponse.json({ ok:false, msg:'Senha inválida' }, { status: 401 });
  }
  // 2FA obrigatório se houver segredo configurado
  if (totp) {
    if (!code || !authenticator.check(code, totp)) {
      return NextResponse.json({ ok:false, msg:'Código 2FA inválido' }, { status: 401 });
    }
  }

  // SUCESSO → define cookie e redireciona do servidor
  const res = NextResponse.redirect(new URL(redirect, req.url), { status: 303 });
  res.cookies.set('admin_auth', '1', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,          // 8h
    sameSite: 'lax'               // IMPORTANTE: mais compatível para pós-POST redirect
  });
  return res;
}
