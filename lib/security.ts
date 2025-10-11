
const buckets = new Map<string,{c:number,t:number}>();

export function rateLimit(key:string, ip:string, limit=10, windowMs=60_000){
  const k = `${key}:${ip}`; const now = Date.now();
  const b = buckets.get(k) || {c:0,t:now};
  if (now - b.t > windowMs) { b.c = 0; b.t = now; }
  b.c++; buckets.set(k, b);
  return b.c <= limit;
}

export function getIp(req:Request){
  const xf = req.headers.get('x-forwarded-for');
  return (xf?.split(',')[0] || '0.0.0.0').trim();
}

export function randomId(n=32){
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let s=''; for(let i=0;i<n;i++){ s += alphabet[Math.floor(Math.random()*alphabet.length)]; }
  return s;
}

export async function assertCsrfOK(req:Request){
  const cookie = (req.headers.get('cookie') || '').split('; ').find(x=>x.startsWith('csrf='))?.split('=')[1] || '';
  const header = req.headers.get('x-csrf') || '';
  return cookie && header && cookie === header;
}
