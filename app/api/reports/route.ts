
import { NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
export async function GET() {
  const file = path.join(process.cwd(), 'data', 'reports.json');
  try { const buf = await readFile(file, 'utf-8'); return NextResponse.json(JSON.parse(buf)); }
  catch { return NextResponse.json([], { status: 200 }); }
}
