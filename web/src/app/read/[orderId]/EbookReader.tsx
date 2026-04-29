'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import styles from './page.module.css';

interface Props {
  orderId: string;
  productTitle: string;
  buyerUsername: string;
}

// PDF.js types (loaded from CDN at runtime)
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

const PDFJS_CDN = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs';

export default function EbookReader({ orderId, productTitle, buyerUsername }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docRef = useRef<PDFDocumentProxy | null>(null);
  const renderingRef = useRef(false);

  // Load PDF.js from CDN once
  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import * as pdfjsLib from '${PDFJS_CDN}';
      pdfjsLib.GlobalWorkerOptions.workerSrc = '${PDFJS_WORKER}';
      window.pdfjsLib = pdfjsLib;
      window.dispatchEvent(new Event('pdfjsReady'));
    `;
    document.head.appendChild(script);
  }, []);

  // Load the PDF document
  useEffect(() => {
    let cancelled = false;

    async function loadDoc() {
      setLoading(true);
      setError('');

      // Wait for PDF.js to be ready
      await new Promise<void>((resolve) => {
        if (window.pdfjsLib) { resolve(); return; }
        window.addEventListener('pdfjsReady', () => resolve(), { once: true });
      });

      if (cancelled) return;

      try {
        const doc: PDFDocumentProxy = await window.pdfjsLib.getDocument(`/api/read/${orderId}`).promise;
        if (cancelled) return;
        docRef.current = doc;
        setNumPages(doc.numPages);
        setCurrentPage(1);
        setLoading(false);
      } catch (e) {
        if (!cancelled) setError('Failed to load ebook. Please refresh and try again.');
        console.error(e);
      }
    }

    loadDoc();
    return () => { cancelled = true; };
  }, [orderId]);

  // Render current page
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

      // Watermark: semi-transparent diagonal text with buyer's username
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.font = `bold ${Math.round(viewport.width * 0.045)}px Arial`;
      ctx.fillStyle = '#FF5C38';
      ctx.translate(viewport.width / 2, viewport.height / 2);
      ctx.rotate(-Math.PI / 5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const wm = `depmi • @${buyerUsername}`;
      // Repeat watermark in a grid pattern across the page
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

  // Disable right-click and keyboard shortcuts that could save the canvas
  useEffect(() => {
    const prevent = (e: MouseEvent) => e.preventDefault();
    const preventKeys = (e: KeyboardEvent) => {
      // Block Ctrl+S, Ctrl+P, Ctrl+Shift+S
      if (e.ctrlKey && ['s', 'p'].includes(e.key.toLowerCase())) e.preventDefault();
    };
    document.addEventListener('contextmenu', prevent);
    document.addEventListener('keydown', preventKeys);
    return () => {
      document.removeEventListener('contextmenu', prevent);
      document.removeEventListener('keydown', preventKeys);
    };
  }, []);

  const goTo = (page: number) => {
    const clamped = Math.max(1, Math.min(numPages, page));
    setCurrentPage(clamped);
  };

  return (
    <div className={styles.readerShell}>
      {/* Top bar */}
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

      {/* Page canvas */}
      <div className={styles.readerBody}>
        {loading && (
          <div className={styles.readerLoading}>
            <div className={styles.spinner} />
            <p>Loading ebook…</p>
          </div>
        )}
        {error && <div className={styles.readerError}>{error}</div>}
        {!loading && !error && (
          <canvas ref={canvasRef} className={styles.readerCanvas} />
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && numPages > 0 && (
        <div className={styles.readerPager}>
          <button className={styles.pageBtn} onClick={() => goTo(1)} disabled={currentPage === 1} title="First page">
            «
          </button>
          <button className={styles.pageBtn} onClick={() => goTo(currentPage - 1)} disabled={currentPage === 1} title="Previous page">
            ‹
          </button>
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
          <button className={styles.pageBtn} onClick={() => goTo(currentPage + 1)} disabled={currentPage === numPages} title="Next page">
            ›
          </button>
          <button className={styles.pageBtn} onClick={() => goTo(numPages)} disabled={currentPage === numPages} title="Last page">
            »
          </button>
        </div>
      )}
    </div>
  );
}
