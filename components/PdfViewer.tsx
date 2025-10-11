
'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
export default function PdfViewer({ fileUrl }:{fileUrl:string}){
  const [numPages,setNumPages]=useState(0);
  const [page,setPage]=useState(1);
  const [scale,setScale]=useState(1.1);
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <a className="btn" href={fileUrl} target="_blank" rel="noreferrer">Baixar PDF</a>
        <div className="flex-1" />
        <button className="btn" onClick={()=>setPage(Math.max(1,page-1))} aria-label="Anterior">←</button>
        <div className="hint">Página {page} de {numPages||'...'}</div>
        <button className="btn" onClick={()=>setPage(Math.min(numPages,page+1))} aria-label="Próxima">→</button>
        <button className="btn" onClick={()=>setScale(s=>Math.max(0.5,s-0.1))} aria-label="Menos zoom">–</button>
        <div className="hint">Zoom {Math.round(scale*100)}%</div>
        <button className="btn" onClick={()=>setScale(s=>Math.min(2,s+0.1))} aria-label="Mais zoom">+</button>
      </div>
      <div className="flex justify-center overflow-auto border border-[color:var(--border)] rounded-xl bg-black/20">
        <Document file={fileUrl} onLoadSuccess={(info)=>setNumPages(info.numPages)} loading={<div className="p-8">Carregando PDF…</div>}>
          <Page pageNumber={page} scale={scale} renderTextLayer />
        </Document>
      </div>
    </div>
  );
}
