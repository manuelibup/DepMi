'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Script from 'next/script';
import styles from './page.module.css';

interface Props {
  orderId: string;
  productTitle: string;
  buyerUsername: string;
  fileFormat: string; // e.g. 'pdf', 'docx', 'epub', 'pptx' …
}

// PDF.js types (loaded from CDN at runtime — UMD build attaches to window.pdfjsLib)
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

// ─── Non-PDF/DOCX download card ───────────────────────────────────────────────

function DownloadCard({ orderId, productTitle, fileFormat }: { orderId: string; productTitle: string; fileFormat: string }) {
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  async function handleDownload() {
    setDownloading(true);
    setErr('');
    try {
      const res = await fetch(`/api/download/${orderId}`, { credentials: 'include' });
      if (!res.ok) {
        setErr(`Could not download file (${res.status}). Please try again.`);
        return;
      }
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
            This file is in <strong>{fileFormat.toUpperCase()}</strong> format. Tap the button below to download it securely — your copy is protected and linked to your account.
          </p>
          {err && <p className={styles.readerError}>{err}</p>}
          {done && <p className={styles.downloadDone}>✓ Download started</p>}
          <button
            className={styles.downloadBtn}
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? 'Preparing…' : done ? 'Download again' : `Download ${fileFormat.toUpperCase()}`}
          </button>
          <p className={styles.downloadNote}>
            Having trouble? Open your orders page for alternative access options.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── DOCX reader ──────────────────────────────────────────────────────────────

function DocxReader({ orderId, productTitle, buyerUsername }: Omit<Props, 'fileFormat'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadDoc() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/read/${orderId}`, { credentials: 'include' });
        if (!res.ok) {
          const msg = res.status === 401 ? 'Please log in to read this document.'
            : res.status === 403 ? "You don't have access to this document."
            : res.status === 402 ? 'Payment not confirmed yet.'
            : `Could not load document (${res.status}).`;
          if (!cancelled) { setError(msg); setLoading(false); }
          return;
        }
        const buffer = await res.arrayBuffer();
        if (cancelled || !containerRef.current) return;

        const { renderAsync } = await import('docx-preview');
        await renderAsync(buffer, containerRef.current, undefined, {
          className: styles.docxBody,
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          ignoreFonts: false,
          breakPages: true,
          useBase64URL: true,
        });
        if (!cancelled) setLoading(false);
      } catch (e) {
        console.error('[DocxReader] error:', e);
        if (!cancelled) { setError('Failed to load document. Please refresh and try again.'); setLoading(false); }
      }
    }

    loadDoc();
    return () => { cancelled = true; };
  }, [orderId]);

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
        {loading && (
          <div className={styles.readerLoading}>
            <div className={styles.spinner} />
            <p>Loading document…</p>
          </div>
        )}
        {!loading && error && <div className={styles.readerError}>{error}</div>}
        <div className={styles.docxWrapper}>
          {/* Watermark overlay */}
          {!loading && !error && (
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

// ─── PDF reader ───────────────────────────────────────────────────────────────

export default function EbookReader({ orderId, productTitle, buyerUsername, fileFormat }: Props) {
  if (fileFormat === 'docx' || fileFormat === 'doc') {
    return <DocxReader orderId={orderId} productTitle={productTitle} buyerUsername={buyerUsername} />;
  }
  if (fileFormat !== 'pdf') {
    return <DownloadCard orderId={orderId} productTitle={productTitle} fileFormat={fileFormat} />;
  }
  return <PdfReader orderId={orderId} productTitle={productTitle} buyerUsername={buyerUsername} />;
}

function PdfReader({ orderId, productTitle, buyerUsername }: Omit<Props, 'fileFormat'>) {
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
        const res = await fetch(`/api/read/${orderId}`, { credentials: 'include' });
        if (!res.ok) {
          const msg = res.status === 401 ? 'Please log in to read this ebook.'
            : res.status === 403 ? 'You don\'t have access to this ebook.'
            : res.status === 402 ? 'Payment not confirmed yet.'
            : `Could not load ebook (${res.status}).`;
          if (!cancelled) { setError(msg); setLoading(false); }
          return;
        }
        const buffer = await res.arrayBuffer();
        if (cancelled) return;
        const doc: PDFDocumentProxy = await window.pdfjsLib.getDocument({ data: buffer }).promise;
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (e) {
        console.error('[EbookReader] loadDoc error:', e);
        if (!cancelled) { setError('Failed to load ebook. Please refresh and try again.'); setLoading(false); }
      }
    }

    loadDoc();
    return () => { cancelled = true; };
  }, [orderId, pdfjsReady]);

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

      // Watermark
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

  const goTo = (page: number) => setCurrentPage(Math.max(1, Math.min(numPages, page)));

  return (
    <>
      <Script
        src={PDFJS_SRC}
        strategy="afterInteractive"
        onLoad={() => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
          setPdfjsReady(true);
        }}
        onError={() => {
          setError('Failed to load PDF renderer. Check your internet connection.');
          setLoading(false);
        }}
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
          {loading && (
            <div className={styles.readerLoading}>
              <div className={styles.spinner} />
              <p>Loading ebook…</p>
            </div>
          )}
          {!loading && error && <div className={styles.readerError}>{error}</div>}
          {!loading && !error && (
            <canvas ref={canvasRef} className={styles.readerCanvas} />
          )}
        </div>

        {!loading && !error && numPages > 0 && (
          <div className={styles.readerPager}>
            <button className={styles.pageBtn} onClick={() => goTo(1)} disabled={currentPage === 1} title="First page">«</button>
            <button className={styles.pageBtn} onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1} title="Previous page">‹</button>
            <span className={styles.pageInfo}>
              <input
                className={styles.pageInput}
                type="number"
                min={1}
                max={numPages}
                value={currentPage}
                onChange={e => goTo(Number(e.target.value))}
              />
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
