'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './BookImporter.module.css';

interface BookEntry {
    id: string; // temp client id
    isbn?: string;
    title: string;
    author?: string;
    description: string;
    coverUrl?: string;
    price: number;
    stock: number;
    category: string;
    selected: boolean;
    status: 'idle' | 'importing' | 'done' | 'error';
    errorMsg?: string;
}

const CATEGORIES = [
    'OTHER', 'FASHION', 'GADGETS', 'BEAUTY', 'FOOD', 'FURNITURE', 'VEHICLES', 'SERVICES',
];

let _id = 0;
const uid = () => `b${++_id}`;

function makeEntry(partial: Partial<BookEntry>): BookEntry {
    return {
        id: uid(),
        title: '',
        description: '',
        price: 2500,
        stock: 1,
        category: 'OTHER',
        selected: true,
        status: 'idle',
        ...partial,
    };
}

export default function BookImporter({ storeId, storeName, storeSlug }: {
    storeId: string;
    storeName: string;
    storeSlug: string;
}) {
    const [mode, setMode] = useState<'isbn' | 'ai'>('isbn');
    const [isbnText, setIsbnText] = useState('');
    const [aiInputType, setAiInputType] = useState<'image' | 'text'>('image');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [textContent, setTextContent] = useState('');
    const [dragging, setDragging] = useState(false);
    const [looking, setLooking] = useState(false);
    const [entries, setEntries] = useState<BookEntry[]>([]);
    const [error, setError] = useState('');
    const [importing, setImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
    const fileRef = useRef<HTMLInputElement>(null);

    const updateEntry = useCallback((id: string, patch: Partial<BookEntry>) => {
        setEntries(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
    }, []);

    // ─── ISBN lookup ──────────────────────────────────────────────────────────
    const handleIsbnLookup = async () => {
        const isbns = isbnText
            .split(/[\n,;]+/)
            .map(s => s.trim())
            .filter(Boolean);
        if (!isbns.length) return;

        setError('');
        setLooking(true);

        const newEntries: BookEntry[] = [];
        for (const isbn of isbns) {
            try {
                const res = await fetch(`/api/books/isbn/${encodeURIComponent(isbn)}`);
                if (res.ok) {
                    const d = await res.json();
                    newEntries.push(makeEntry({
                        isbn,
                        title: d.title || `Book ${isbn}`,
                        author: d.author || '',
                        description: d.description
                            ? d.description.slice(0, 500)
                            : `By ${d.author || 'Unknown'}${d.publisher ? ` · ${d.publisher}` : ''}${d.publishDate ? ` (${d.publishDate})` : ''}`,
                        coverUrl: d.coverUrl || '',
                        category: 'OTHER',
                    }));
                } else {
                    // Not found — add a stub so the user can still fill it in
                    newEntries.push(makeEntry({
                        isbn,
                        title: `Unknown book (${isbn})`,
                        description: '',
                        status: 'idle',
                    }));
                }
            } catch {
                newEntries.push(makeEntry({ isbn, title: `Lookup failed (${isbn})`, description: '' }));
            }
        }

        setEntries(prev => [...prev, ...newEntries]);
        setIsbnText('');
        setLooking(false);
    };

    // ─── AI catalog parse ─────────────────────────────────────────────────────
    const handleAiParse = async () => {
        setError('');
        setLooking(true);
        try {
            let body: Record<string, string> = {};
            if (aiInputType === 'image' && imageFile) {
                const base64 = await toBase64(imageFile);
                body = { base64Image: base64, mediaType: imageFile.type };
            } else if (aiInputType === 'text' && textContent.trim()) {
                body = { textContent: textContent.trim() };
            } else {
                setError('Please provide an image or text to parse.');
                setLooking(false);
                return;
            }

            const res = await fetch('/api/catalog/ai-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const d = await res.json();
            if (!res.ok) { setError(d.message || 'AI parse failed.'); return; }

            const parsed: BookEntry[] = (d.products || []).map((p: { title: string; price: number; description: string; category: string }) =>
                makeEntry({
                    title: p.title,
                    price: p.price || 2500,
                    description: p.description || '',
                    category: p.category || 'OTHER',
                })
            );
            setEntries(prev => [...prev, ...parsed]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Parse failed.');
        } finally {
            setLooking(false);
        }
    };

    // ─── Batch import ──────────────────────────────────────────────────────────
    const handleImport = async () => {
        const toImport = entries.filter(e => e.selected && e.status !== 'done');
        if (!toImport.length) return;

        setImporting(true);
        setImportProgress({ done: 0, total: toImport.length });

        for (let i = 0; i < toImport.length; i++) {
            const entry = toImport[i];
            updateEntry(entry.id, { status: 'importing' });
            try {
                const res = await fetch('/api/products/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        storeId,
                        title: entry.title.trim() || 'Untitled Book',
                        description: entry.description || '',
                        price: Number(entry.price) || 1,
                        stock: Number(entry.stock) || 1,
                        category: entry.category || 'OTHER',
                        currency: '₦',
                        deliveryFee: 0,
                        images: entry.coverUrl ? [entry.coverUrl] : [],
                    }),
                });
                if (res.ok) {
                    updateEntry(entry.id, { status: 'done' });
                } else {
                    const d = await res.json();
                    updateEntry(entry.id, { status: 'error', errorMsg: d.message || 'Failed' });
                }
            } catch {
                updateEntry(entry.id, { status: 'error', errorMsg: 'Network error' });
            }
            setImportProgress({ done: i + 1, total: toImport.length });
        }

        setImporting(false);
    };

    const selectedCount = entries.filter(e => e.selected && e.status !== 'done').length;
    const doneCount = entries.filter(e => e.status === 'done').length;

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) setImage(file);
    };

    const setImage = (file: File) => {
        setImageFile(file);
        const url = URL.createObjectURL(file);
        setImagePreview(url);
    };

    return (
        <div className={styles.page}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>Import Products</h1>
                <p className={styles.pageSub}>
                    {storeName} · <Link href={`/store/${storeSlug}/products/new`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>Add single product</Link>
                </p>
            </div>

            {/* Mode tabs */}
            <div className={styles.modeTabs}>
                <button className={`${styles.modeTab}${mode === 'isbn' ? ' ' + styles.active : ''}`} onClick={() => setMode('isbn')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M14 9h2" /><path d="M14 12h2" /><path d="M14 15h2" /></svg>
                    ISBN Lookup
                </button>
                <button className={`${styles.modeTab}${mode === 'ai' ? ' ' + styles.active : ''}`} onClick={() => setMode('ai')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                    AI Catalog Parse
                </button>
            </div>

            {error && <div className={styles.errorBanner}>{error}</div>}

            {/* ISBN mode */}
            {mode === 'isbn' && (
                <div className={styles.card}>
                    <p className={styles.cardTitle}>Enter ISBNs</p>
                    <textarea
                        className={styles.isbnArea}
                        placeholder={'9780061120084\n9780143105428\n9781982173739'}
                        value={isbnText}
                        onChange={e => setIsbnText(e.target.value)}
                        rows={5}
                    />
                    <p className={styles.isbnHint}>One ISBN per line (10 or 13 digits). Hyphens and spaces are stripped automatically.</p>
                    <div className={styles.actionRow}>
                        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleIsbnLookup} disabled={looking || !isbnText.trim()}>
                            {looking ? <><span className={styles.loadingDot} /> Looking up…</> : 'Look Up Books'}
                        </button>
                    </div>
                </div>
            )}

            {/* AI mode */}
            {mode === 'ai' && (
                <div className={styles.card}>
                    <p className={styles.cardTitle}>AI Catalog Parser</p>

                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button className={`${styles.btn} ${styles.btnGhost}`} style={aiInputType === 'image' ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : undefined} onClick={() => setAiInputType('image')}>Image</button>
                        <button className={`${styles.btn} ${styles.btnGhost}`} style={aiInputType === 'text' ? { borderColor: 'var(--primary)', color: 'var(--primary)' } : undefined} onClick={() => setAiInputType('text')}>Paste Text</button>
                    </div>

                    {aiInputType === 'image' ? (
                        <div
                            className={`${styles.dropzone}${dragging ? ' ' + styles.dragging : ''}`}
                            onDragOver={e => { e.preventDefault(); setDragging(true); }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                        >
                            <input ref={fileRef} type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) setImage(f); }} />
                            {imagePreview ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={imagePreview} alt="Catalog preview" className={styles.dropzonePreview} />
                            ) : (
                                <>
                                    <div className={styles.dropzoneIcon}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                    </div>
                                    <p className={styles.dropzoneText}>Drop catalog image here or click to browse</p>
                                    <p className={styles.dropzoneSub}>Handwritten price list, receipt, screenshot — Claude AI will extract all products</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <textarea
                            className={styles.textPasteArea}
                            placeholder={'Paste your catalog text here...\n\nExample:\nPurple Hibiscus by Chimamanda — ₦3,500\nThings Fall Apart — ₦2,800\nHalf of a Yellow Sun — ₦4,200'}
                            value={textContent}
                            onChange={e => setTextContent(e.target.value)}
                            rows={7}
                        />
                    )}

                    <div className={styles.actionRow}>
                        <button
                            className={`${styles.btn} ${styles.btnPrimary}`}
                            onClick={handleAiParse}
                            disabled={looking || (aiInputType === 'image' ? !imageFile : !textContent.trim())}
                        >
                            {looking
                                ? <><span className={styles.loadingDot} /> Parsing with AI…</>
                                : <>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                                    Parse Catalog
                                </>
                            }
                        </button>
                        {(imagePreview || textContent) && (
                            <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => { setImageFile(null); setImagePreview(null); setTextContent(''); }}>
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Results */}
            {entries.length > 0 && (
                <div>
                    <div className={styles.resultsHeader}>
                        <h2 className={styles.resultsTitle}>{entries.length} book{entries.length !== 1 ? 's' : ''} · {doneCount} imported</h2>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <button className={styles.selectAll} onClick={() => setEntries(prev => prev.map(e => ({ ...e, selected: e.status !== 'done' })))}>Select all</button>
                            <button className={styles.selectAll} onClick={() => setEntries(prev => prev.map(e => ({ ...e, selected: false })))}>Deselect all</button>
                        </div>
                    </div>

                    {importing && (
                        <div className={styles.progressWrap}>
                            <div className={styles.progressBar}>
                                <div className={styles.progressFill} style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} />
                            </div>
                            <p className={styles.progressText}>{importProgress.done} / {importProgress.total} products created…</p>
                        </div>
                    )}

                    {entries.map(entry => (
                        <div key={entry.id} className={`${styles.bookRow}${entry.selected ? ' ' + styles.selected : ''}${entry.status === 'importing' ? ' ' + styles.importing : ''}`}>
                            <input
                                type="checkbox"
                                className={styles.bookCheck}
                                checked={entry.selected}
                                disabled={entry.status === 'done' || entry.status === 'importing'}
                                onChange={e => updateEntry(entry.id, { selected: e.target.checked })}
                            />

                            <div className={styles.bookCover}>
                                {entry.coverUrl
                                    ? <Image src={entry.coverUrl} alt="" width={52} height={72} style={{ objectFit: 'cover' }} unoptimized />
                                    : '📚'
                                }
                            </div>

                            <div className={styles.bookInfo}>
                                {entry.status === 'done' ? (
                                    <p className={styles.bookTitle}>{entry.title} <span className={`${styles.statusChip} ${styles.chipSuccess}`}>✓ Imported</span></p>
                                ) : entry.status === 'error' ? (
                                    <p className={styles.bookTitle}>{entry.title} <span className={`${styles.statusChip} ${styles.chipError}`}>✗ {entry.errorMsg}</span></p>
                                ) : (
                                    <input
                                        className={styles.fieldInput}
                                        style={{ width: '100%', marginBottom: 4 }}
                                        value={entry.title}
                                        placeholder="Book title"
                                        onChange={e => updateEntry(entry.id, { title: e.target.value })}
                                        disabled={entry.status === 'importing'}
                                    />
                                )}

                                {entry.author && <p className={styles.bookAuthor}>{entry.author}{entry.isbn && ` · ISBN ${entry.isbn}`}</p>}
                                {entry.description && entry.status !== 'done' && (
                                    <p className={styles.bookDesc}>{entry.description}</p>
                                )}

                                {entry.status !== 'done' && (
                                    <div className={styles.bookFields}>
                                        <div className={styles.fieldGroup}>
                                            <span className={styles.fieldLabel}>Price (₦)</span>
                                            <input className={`${styles.fieldInput} ${styles.priceInput}`} type="number" min={1} value={entry.price} onChange={e => updateEntry(entry.id, { price: Number(e.target.value) })} disabled={entry.status === 'importing'} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <span className={styles.fieldLabel}>Stock</span>
                                            <input className={`${styles.fieldInput} ${styles.stockInput}`} type="number" min={1} value={entry.stock} onChange={e => updateEntry(entry.id, { stock: Number(e.target.value) })} disabled={entry.status === 'importing'} />
                                        </div>
                                        <div className={styles.fieldGroup}>
                                            <span className={styles.fieldLabel}>Category</span>
                                            <select className={`${styles.fieldInput} ${styles.catSelect}`} value={entry.category} onChange={e => updateEntry(entry.id, { category: e.target.value })} disabled={entry.status === 'importing'}>
                                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                        <button
                                            style={{ alignSelf: 'flex-end', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                                            onClick={() => setEntries(prev => prev.filter(e => e.id !== entry.id))}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Import bar */}
            {selectedCount > 0 && !importing && (
                <div className={styles.importBar}>
                    <div>
                        <div className={styles.importBarText}>{selectedCount} book{selectedCount !== 1 ? 's' : ''} selected</div>
                        <div className={styles.importBarSub}>Products will be created in {storeName}</div>
                    </div>
                    <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleImport}>
                        Import {selectedCount} Book{selectedCount !== 1 ? 's' : ''}
                    </button>
                </div>
            )}
        </div>
    );
}

async function toBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the data URL prefix to get raw base64
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
