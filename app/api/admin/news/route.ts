
import { NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { assertCsrfOK, getIp, rateLimit } from '@/lib/security';

export async function POST(req: Request){
  const ip = getIp(req);
  if (!rateLimit('news', ip, 10, 60_000)) return NextResponse.json({ok:false,msg:'Muitas requisições'}, {status:429});
  if (!(await assertCsrfOK(req))) return NextResponse.json({ok:false,msg:'CSRF inválido'}, {status:403});

  const form = await req.formData();
  const title = String(form.get('title')||'').trim();
  const date = String(form.get('date')||'').trim();
  const link = String(form.get('link')||'').trim();
  const image = String(form.get('image')||'').trim();
  const highlight = !!form.get('highlight');
  if(!title || !date || !link) return NextResponse.json({ ok:false, msg:'Título, data e link são obrigatórios' }, { status: 400 });
  const jsonPath = path.join(process.cwd(), 'data', 'news.json');
  let current:any[]=[]; try{ current = JSON.parse(await readFile(jsonPath,'utf-8')); }catch{}
  current.push({ id: `n${Date.now()}`, title, date, link, image: image||undefined, highlight });
  current.sort((a,b)=> a.date < b.date ? 1 : -1);
  await writeFile(jsonPath, JSON.stringify(current,null,2), 'utf-8');
  return NextResponse.json({ ok:true });
}
