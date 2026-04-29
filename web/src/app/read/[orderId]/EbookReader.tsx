'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import styles from './page.module.css';

interface Props {
  orderId: string;
  productTitle: string;
  buyerUsername: string;
  fileFormat: string;
}

type PDFDocumentProxy = {
  numPages: number;
  getPage: (n: number) => Promise<PDFPageProxy>;
};
type PDFPageProxy = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (ctx: { canvasContext: CanvasRenderingContext2D; viewport: ReturnType<PDFPageProxy['getViewport']> }) => { promise: Promise<void> };
};
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfjsLib: any;
  }
}

const PDFJS_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const FORMAT_LABELS: Record<string, string> = {
  docx: 'Word Document', doc: 'Word Document',
  pptx: 'PowerPoint Presentation', ppt: 'PowerPoint Presentation',
  xlsx: 'Excel Spreadsheet', xls: 'Excel Spreadsheet',
  epub: 'eBook (EPUB)', mobi: 'eBook (MOBI)',
  zip: 'ZIP Archive', mp4: 'Video', mp3: 'Audio',
};

function formatLabel(ext: string): string {
  return FORMAT_LABELS[ext] ?? ext.toUpperCase() + ' File';
}

// Detect actual format from file magic bytes so we don't rely on the URL extension.
// DOCX/PPTX/XLSX are ZIP-based: first 4 bytes = PK\x03\x04
// PDF: first 4 bytes = %PDF
function detectFormat(buffer: ArrayBuffer, hint: string): 'pdf' | 'docx' | 'other' {
  const b = new Uint8Array(buffer.slice(0, 4));
  if (b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46) return 'pdf';
  if (b[0] === 0x50 && b[1] === 0x4B) return 'docx'; // ZIP → treat as DOCX/Office
  if (hint === 'pdf') return 'pdf';
  return 'other';
}

// ─── Non-renderable download card ────────────────────────────────────────────

function DownloadCard({ orderId, productTitle, fileFormat }: { orderId: string; productTitle: string; fileFormat: string }) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setErr('');
    try {
      const res = await fetch(`/api/download/${orderId}`, { credentials: 'include' });
      if (!res.ok) { setErr(`Could not download file (${res.status}). Please try again.`); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productTitle}.${fileFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch {
      setErr('Download failed. Please check your connection and try again.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={styles.readerShell}>
      <div className={styles.readerBar}>
        <div className={styles.readerBarLeft}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
          <span className={styles.readerTitle}>{productTitle}</span>
        </div>
      </div>
      <div className={styles.readerBody}>
        <div className={styles.downloadCard}>
          <div className={styles.downloadIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
            </svg>
          </div>
          <h2 className={styles.downloadTitle}>{productTitle}</h2>
          <p className={styles.downloadMeta}>{formatLabel(fileFormat)} · Secured download</p>
          <p className={styles.downloadHint}>
            This file is in <strong>{fileFormat.toUpperCase()}</strong> format. Tap the button below to download it securely.
          </p>
          {err && <p className={styles.readerError}>{err}</p>}
          {done && <p className={styles.downloadDone}>✓ Download started</p>}
          <button className={styles.downloadBtn} onClick={handleDownload} disabled={downloading}>
            {downloading ? 'Preparing…' : done ? 'Download again' : `Download ${fileFormat.toUpperCase()}`}
          </button>
          <p className={styles.downloadNote}>Having trouble? Open your orders page for alternative access options.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Shared file fetcher + auto-detector ─────────────────────────────────────

type LoadedFile = { buffer: ArrayBuffer; detected: 'pdf' | 'docx' | 'other' };

function useFileBuffer(orderId: string, hintFormat: string) {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState('loading');
      setErrorMsg('');
      try {
        const res = await fetch(`/api/read/${orderId}`, { credentials: 'include' });
        if (!res.ok) {
          const msg = res.status === 401 ? 'Please log in to read this file.'
            : res.status === 403 ? "You don't have access to this file."
            : res.status === 402 ? 'Payment not confirmed yet.'
            : `Could not load file (${res.status}).`;
          if (!cancelled) { setErrorMsg(msg); setState('error'); }
          return;
        }
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        const detected = detectFormat(buffer, hintFormat);
        setFile({ buffer, detected });
        setState('ready');
      } catch (e) {
        console.error('[EbookReader] load error:', e);
        if (!cancelled) { setErrorMsg('Failed to load file. Please refresh and try again.'); setState('error'); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orderId, hintFormat]);

  return { state, file, errorMsg };
}

// ─── Main router ──────────────────────────────────────────────────────────────

export default function EbookReader({ orderId, productTitle, buyerUsername, fileFormat }: Props) {
  const DOC_FORMATS = ['pdf', 'docx', 'doc'];
  if (!DOC_FORMATS.includes(fileFormat)) {
    return <DownloadCard orderId={orderId} productTitle={productTitle} fileFormat={fileFormat} />;
  }
  return (
    <DocPicker
      orderId={orderId}
      productTitle={productTitle}
      buyerUsername={buyerUsername}
      hintFormat={fileFormat}
    />
  );
}

function DocPicker({ orderId, productTitle, buyerUsername, hintFormat }: Omit<Props, 'fileFormat'> & { hintFormat: string }) {
  const { state, file, errorMsg } = useFileBuffer(orderId, hintFormat);

  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    const preventKeys = (e: KeyboardEvent) => {
      if (e.ctrlKey && ['s', 'p'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('keydown', preventKeys);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('keydown', preventKeys);
    };
  }, []);

  if (state === 'loading' || (!file && state !== 'error')) {
    return (
      <div className={styles.readerShell}>
        <div className={styles.readerBar}><div className={styles.readerBarLeft}><span className={styles.readerTitle}>{productTitle}</span></div></div>
        <div className={styles.readerBody}>
          <div className={styles.readerLoading}><div className={styles.spinner} /><p>Loading…</p></div>
        </div>
      </div>
    );
  }

  if (state === 'error' || !file) {
    return (
      <div className={styles.readerShell}>
        <div className={styles.readerBar}><div className={styles.readerBarLeft}><span className={styles.readerTitle}>{productTitle}</span></div></div>
        <div className={styles.readerBody}><div className={styles.readerError}>{errorMsg}</div></div>
      </div>
    );
  }

  if (file.detected === 'docx') {
    return <DocxRenderer buffer={file.buffer} productTitle={productTitle} buyerUsername={buyerUsername} />;
  }
  return <PdfRenderer buffer={file.buffer} productTitle={productTitle} buyerUsername={buyerUsername} />;
}

// ─── DOCX renderer ────────────────────────────────────────────────────────────

function DocxRenderer({ buffer, productTitle, buyerUsername }: { buffer: ArrayBuffer; productTitle: string; buyerUsername: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    async function render() {
      try {
        const { renderAsync } = await import('docx-preview');
        await renderAsync(buffer, containerRef.current!, undefined, {
          className: styles.docxBody,
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        });
        if (!cancelled) setRendered(true);
      } catch (e) {
        console.error('[DocxRenderer]', e);
        if (!cancelled) setError('Failed to render document. Please try again.');
      }
    }
    render();
    return () => { cancelled = true; };
  }, [buffer]);

  return (
    <div className={styles.readerShell}>
      <div className={styles.readerBar}>
        <div className={styles.readerBarLeft}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
          </svg>
          <span className={styles.readerTitle}>{productTitle}</span>
        </div>
      </div>
      <div className={styles.readerBody}>
        {error && <div className={styles.readerError}>{error}</div>}
        <div className={styles.docxWrapper}>
          {rendered && (
            <div className={styles.docxWatermark} aria-hidden>
              {Array.from({ length: 20 }).map((_, i) => (
                <span key={i}>depmi • @{buyerUsername}</span>
              ))}
            </div>
          )}
          <div ref={containerRef} className={styles.docxContainer} />
        </div>
      </div>
    </div>
  );
}

// ─── PDF renderer ─────────────────────────────────────────────────────────────

function PdfRenderer({ buffer, productTitle, buyerUsername }: { buffer: ArrayBuffer; productTitle: string; buyerUsername: string }) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfjsReady, setPdfjsReady] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderingRef = useRef(false);

  useEffect(() => {
    if (!pdfjsReady) return;
    let cancelled = false;
    async function loadDoc() {
      setLoading(true);
      setError('');
      try {
        const doc: PDFDocumentProxy = await window.pdfjsLib.getDocument({ data: buffer }).promise;
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (e) {
        console.error('[PdfRenderer] error:', e);
        if (!cancelled) { setError('Failed to render PDF. Please refresh and try again.'); setLoading(false); }
      }
    }
    loadDoc();
    return () => { cancelled = true; };
  }, [pdfjsReady, buffer]);

  const renderPage = useCallback(async (pageNum: number) => {
    const doc = docRef.current;
    const canvas = canvasRef.current;
    if (!doc || !canvas || renderingRef.current) return;
    renderingRef.current = true;
    try {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;

      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.font = `bold ${Math.round(viewport.width * 0.045)}px Arial`;
      ctx.fillStyle = '#FF5C38';
      ctx.translate(viewport.width / 2, viewport.height / 2);
      ctx.rotate(-Math.PI / 5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const wm = `depmi • @${buyerUsername}`;
      const spacing = viewport.width * 0.45;
      for (let dx = -viewport.width; dx <= viewport.width; dx += spacing) {
        for (let dy = -viewport.height; dy <= viewport.height; dy += spacing) {
          ctx.fillText(wm, dx, dy);
        }
      }
      ctx.restore();
    } finally {
      renderingRef.current = false;
    }
  }, [scale, buyerUsername]);

  useEffect(() => {
    if (!loading && docRef.current) renderPage(currentPage);
  }, [currentPage, loading, renderPage]);

  const goTo = (page: number) => setCurrentPage(Math.max(1, Math.min(numPages, page)));

  return (
    <>
      <Script
        src={PDFJS_SRC}
        strategy="afterInteractive"
        onLoad={() => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER; setPdfjsReady(true); }}
        onError={() => { setError('Failed to load PDF renderer. Check your internet connection.'); setLoading(false); }}
      />
      <div className={styles.readerShell}>
        <div className={styles.readerBar}>
          <div className={styles.readerBarLeft}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
            <span className={styles.readerTitle}>{productTitle}</span>
          </div>
          <div className={styles.readerBarRight}>
            <button className={styles.zoomBtn} onClick={() => setScale(s => Math.max(0.6, +(s - 0.2).toFixed(1)))} title="Zoom out">−</button>
            <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
            <button className={styles.zoomBtn} onClick={() => setScale(s => Math.min(3, +(s + 0.2).toFixed(1)))} title="Zoom in">+</button>
          </div>
        </div>
        <div className={styles.readerBody}>
          {loading && <div className={styles.readerLoading}><div className={styles.spinner} /><p>Loading PDF…</p></div>}
          {!loading && error && <div className={styles.readerError}>{error}</div>}
          {!loading && !error && <canvas ref={canvasRef} className={styles.readerCanvas} />}
        </div>
        {!loading && !error && numPages > 0 && (
          <div className={styles.readerPager}>
            <button className={styles.pageBtn} onClick={() => goTo(1)} disabled={currentPage === 1} title="First page">«</button>
            <button className={styles.pageBtn} onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1} title="Previous page">‹</button>
            <span className={styles.pageInfo}>
              <input className={styles.pageInput} type="number" min={1} max={numPages} value={currentPage} onChange={e => goTo(Number(e.target.value))} />
              <span>/ {numPages}</span>
            </span>
            <button className={styles.pageBtn} onClick={() => goTo(currentPage + 1)} disabled={currentPage === numPages} title="Next page">›</button>
            <button className={styles.pageBtn} onClick={() => goTo(numPages)} disabled={currentPage === numPages} title="Last page">»</button>
          </div>
        )}
      </div>
    </>
  );
}
