
'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
const PdfViewer = dynamic(()=>import('@/components/PdfViewer'), { ssr:false });
type Report = { slug:string; title:string; file:string; summary?:string };
export default function ReportPage(){
  const { slug } = useParams() as { slug: string };
  const [report,setReport] = useState<Report|null>(null);
  useEffect(()=>{ fetch('/api/reports').then(r=>r.json()).then((all:Report[])=> setReport(all.find(x=>x.slug===slug) ?? null)); },[slug]);
  if(!report){
    return (<div className="card"><p>Carregando ou relatório não encontrado.</p><Link href="/reports" className="btn mt-3 inline-block">Voltar</Link></div>);
  }
  return (
    <div className="space-y-6">
      <nav className="text-sm text-gray-400"><Link href="/reports" className="hover:underline">Relatórios</Link> <span className="mx-1">/</span> <span>{report.title}</span></nav>
      <div className="card">
        <h1 className="text-2xl font-semibold">{report.title}</h1>
        {report.summary && <p className="mt-1 text-sm text-gray-400">{report.summary}</p>}
        <div className="mt-3 text-xs text-gray-400">Fonte do PDF: <code className="text-gray-300">{report.file}</code></div>
      </div>
      <div className="card"><PdfViewer fileUrl={report.file} /></div>
      <div className="card"><Link href="/reports" className="btn">← Voltar aos relatórios</Link></div>
    </div>
  );
}
