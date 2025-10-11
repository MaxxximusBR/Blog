// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import path from 'path';
import { assertCsrfOK, getIp, rateLimit } from '@/lib/security';

export const runtime = 'nodejs';        // garante runtime Node no Vercel
export const dynamic = 'force-dynamic'; // evita cache de rota

export async function POST(req: Request) {
  const ip = getIp(req);
  if (!rateLimit('upload', ip, 8, 60_000)) return NextResponse.json({ok:false,msg:'Muitas requisições'},{status:429});
  if (!(await assertCsrfOK(req))) return NextResponse.json({ok:false,msg:'CSRF inválido'},{status:403});

  const form = await req.formData();
  const slug = String(form.get('slug')||'').trim();
  const title = String(form.get('title')||'').trim();
  const summary = String(form.get('summary')||'').trim();
  const global = Number(form.get('global')||0) || undefined;
  const file = form.get('file') as File | null;

  if (!/^\d{4}-\d{2}$/.test(slug)) return NextResponse.json({ok:false,msg:'Slug inválido (AAAA-MM)'},{status:400});
  if (!title || !file) return NextResponse.json({ok:false,msg:'Campos obrigatórios faltando.'},{status:400});
  if (file.type !== 'application/pdf') return NextResponse.json({ok:false,msg:'Apenas PDF'},{status:415});

  // ✅ FIX: use Uint8Array em vez de Buffer
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength > 25*1024*1024) return NextResponse.json({ok:false,msg:'PDF acima de 25MB'},{status:413});

  const rand = Math.random().toString(36).slice(2,8);
  const fileName = `${slug}-${rand}.pdf`;
  const destDir = path.join(process.cwd(), 'public', 'reports');
  await mkdir(destDir, { recursive: true });
  const dest = path.join(destDir, fileName);

  await writeFile(dest, bytes); // ✅ FIX aqui

  const jsonPath = path.join(process.cwd(), 'data', 'reports.json');
  let current: any[] = []; try { current = JSON.parse(await readFile(jsonPath,'utf-8')); } catch {}
  const entry: any = { slug, title, file: `/reports/${fileName}` };
  if (summary) entry.summary = summary;
  if (global) entry.meta = { global };

  const i = current.findIndex(r => r.slug === slug);
  if (i >= 0) current[i] = entry; else current.push(entry);
  current.sort((a,b) => a.slug < b.slug ? -1 : 1);
  await writeFile(jsonPath, JSON.stringify(current,null,2), 'utf-8');

  return NextResponse.json({ ok:true, msg:'Upload concluído.' });
}
