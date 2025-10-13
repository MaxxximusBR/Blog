'use client';
import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc =
  `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

type Props = {
  /** preferencial: use `url`; compat: `fileUrl` */
  url?: string;
  fileUrl?: string;
};

export default function PdfViewer(props: Props) {
  const src = props.url ?? props.fileUrl ?? '';
  const [numPages, setNumPages] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  if (!src) {
    return <div className="text-sm opacity-70">PDF não informado.</div>;
  }

  return (
    <div>
      <Document file={src} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
        <Page pageNumber={page} />
      </Document>

      {numPages && (
        <div className="flex items-center gap-2 mt-3">
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>◀</button>
          <span className="text-sm">{page} / {numPages}</span>
          <button className="btn" onClick={() => setPage(p => Math.min(numPages!, p + 1))} disabled={page >= numPages!}>▶</button>
        </div>
      )}
    </div>
  );
}
