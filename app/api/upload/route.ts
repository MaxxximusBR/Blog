
import { NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import path from 'path';
import { assertCsrfOK, getIp, rateLimit } from '@/lib/security';

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit('upload', ip, 8, 60_000)) return NextResponse.json({ok:false,msg:'Muitas requisições'}, {status:429});
  if (!(await assertCsrfOK(req))) return NextResponse.json({ok:false,msg:'CSRF inválido'}, {status:403});

  const form = await req.formData();
  const slug = String(form.get('slug') || '').trim();
  const title = String(form.get('title') || '').trim();
  const summary = String(form.get('summary') || '').trim();
  const global = Number(form.get('global') || 0) || undefined;
  const file = form.get('file') as unknown as File | null;

  if (!/^[0-9]{4}-[0-9]{2}$/.test(slug)) return NextResponse.json({ok:false,msg:'Slug inválido (AAAA-MM)'},{status:400});
  if (!title || !file) return NextResponse.json({ ok:false, msg:'Campos obrigatórios faltando.' }, { status: 400 });
  if ((file as File).type !== 'application/pdf') return NextResponse.json({ok:false,msg:'Apenas PDF'}, {status:415});

  const buf = Buffer.from(await (file as File).arrayBuffer());
  if (buf.length > 25*1024*1024) return NextResponse.json({ok:false,msg:'PDF acima de 25MB'}, {status:413});

  const rand = Math.random().toString(36).slice(2,8);
  const fileName = `${slug}-${rand}.pdf`;
  const dest = path.join(process.cwd(), 'public', 'reports', fileName);
  await writeFile(dest, buf);

  const jsonPath = path.join(process.cwd(), 'data', 'reports.json');
  let current: any[] = []; try { current = JSON.parse(await readFile(jsonPath, 'utf-8')); } catch {}
  const entry: any = { slug, title, file: `/reports/${fileName}` }; if (summary) entry.summary = summary; if (global) entry.meta = { global };
  const i = current.findIndex(r=>r.slug===slug);
  if (i>=0) current[i]=entry; else current.push(entry);
  current.sort((a,b)=> (a.slug < b.slug ? -1 : 1));
  await writeFile(jsonPath, JSON.stringify(current, null, 2), 'utf-8');

  return NextResponse.json({ ok:true, msg:'Upload concluído.' });
}
