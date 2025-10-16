
import { NextResponse } from 'next/server';
import { authenticator } from 'otplib';
import { readFile } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

function demoHash(pw:string){ return crypto.createHash('sha256').update('demo_salt::'+pw).digest('hex'); }
function getIp(req:Request){ const xf = req.headers.get('x-forwarded-for'); return (xf?.split(',')[0] || '0.0.0.0').trim(); }
const buckets = new Map<string,{c:number,t:number}>();
function rateLimit(key:string, ip:string, limit=8, windowMs=60_000){
  const k = `${key}:${ip}`; const now = Date.now();
  const b = buckets.get(k) || {c:0,t:now};
  if (now - b.t > windowMs) { b.c = 0; b.t = now; }
  b.c++; buckets.set(k,b);
  return b.c <= limit;
}

async function loadCreds(){
  try{
    const file = path.join(process.cwd(), 'data', 'credentials.json');
    const raw = await readFile(file, 'utf-8');
    const j = JSON.parse(raw);
    if(j?.passwordHash && j?.totpSecret) return j;
  }catch{}
  const envPass = process.env.ADMIN_PASSWORD || '';
  const envTotp = process.env.ADMIN_TOTP_SECRET || '';
  if(envPass && envTotp) return { passwordHash: envPass, totpSecret: envTotp, envPlain: true };
  return { passwordHash: demoHash('@ufo12345@'), scheme:'DEMO_SHA256', totpSecret: 'JBSWY3DPEHPK3PXP', fallback:true };
}

export async function POST(req: Request){
  const ip = getIp(req);
  if (!rateLimit('login', ip, 8, 60_000)) return NextResponse.json({ok:false,msg:'Muitas tentativas'}, {status:429});

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

  const creds:any = await loadCreds();
  let passOK = false;
  if (creds.envPlain) { passOK = (password === creds.passwordHash); }
  else if (creds.scheme === 'DEMO_SHA256') { passOK = (demoHash(password) === creds.passwordHash); }
  else { passOK = false; }

  if (!passOK) return NextResponse.json({ ok:false, msg:'Senha inválida' }, { status: 401 });
  if (!code || !authenticator.check(String(code), String(creds.totpSecret))) {
    return NextResponse.json({ ok:false, msg:'Código 2FA inválido' }, { status: 401 });
  }

  const res = NextResponse.redirect(new URL(redirect || '/admin', req.url), { status: 303 });
  res.cookies.set('admin_auth','1',{ httpOnly:true, sameSite:'lax', secure: process.env.NODE_ENV === 'production', path:'/', maxAge: 60*60*8 });
  return res;
}
