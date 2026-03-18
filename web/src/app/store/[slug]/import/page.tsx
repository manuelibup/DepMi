'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Papa from 'papaparse';
import Link from 'next/link';

interface ParsedProduct {
    title: string;
    description?: string;
    price: number;
    category: string;
    imageUrl?: string;
}

export default function CatalogImportPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const router = useRouter();
    const { status } = useSession();

    // All hooks must be declared before any conditional return
    const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [badRows, setBadRows] = useState<{row: number, issues: string}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (status === 'unauthenticated') router.replace(`/login?callbackUrl=/store/${slug}/import`);
    }, [status, router, slug]);

    if (status === 'loading' || status === 'unauthenticated') {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsParsing(true);
        setErrorMsg(null);
        setBadRows([]);
        setSuccessMsg(null);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const mapped: ParsedProduct[] = [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                results.data.forEach((row: any) => {
                    mapped.push({
                        title: row.Title || row.title || '',
                        description: row.Description || row.description || '',
                        price: parseFloat(row.Price || row.price || '0'),
                        category: (row.Category || row.category || 'OTHER').toUpperCase(),
                        imageUrl: row.ImageURL || row.imageUrl || row.image_url || '',
                    });
                });
                
                setParsedData(mapped);
                setIsParsing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            error: (err) => {
                setErrorMsg(err.message);
                setIsParsing(false);
            }
        });
    };

    const handleBatchImport = async () => {
        if (parsedData.length === 0) return;
        setIsUploading(true);
        setErrorMsg(null);
        setBadRows([]);
        setProgress(0);

        const CHUNK_SIZE = 50; // Vercel safe
        let importedCount = 0;

        try {
            for (let i = 0; i < parsedData.length; i += CHUNK_SIZE) {
                const chunk = parsedData.slice(i, i + CHUNK_SIZE);
                
                const res = await fetch('/api/catalog/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        storeSlug: slug,
                        products: chunk
                    })
                });

                const data = await res.json();

                if (!res.ok) {
                    if (res.status === 422 && data.errors) {
                        setBadRows(data.errors);
                        throw new Error(`Validation failed on chunk ${Math.floor(i/CHUNK_SIZE) + 1}. Import halted.`);
                    }
                    throw new Error(data.message || 'Server error during chunk upload.');
                }

                importedCount += chunk.length;
                setProgress(Math.round((importedCount / parsedData.length) * 100));
            }

            setSuccessMsg(`Successfully imported ${importedCount} products!`);
            setParsedData([]);
            
            // Redirect after 2 secs
            setTimeout(() => {
                router.push(`/store/${slug}`);
                router.refresh();
            }, 2000);

        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <main style={{ maxWidth: '800px', margin: '3rem auto', padding: '0 1rem', fontFamily: 'var(--font-heading)' }}>
            <header style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                <Link href={`/store/${slug}`} style={{ marginRight: '16px', color: 'var(--text-main)', display: 'flex' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6" />
                    </svg>
                </Link>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Bulk Import Products</h1>
            </header>

            <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 600 }}>1. Upload CSV File</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Upload a spreadsheet of your inventory. Required columns: <strong>Title, Price</strong>. Optional columns: <strong>Description, Category, ImageURL</strong>.
                </p>

                <input
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                />
                
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isParsing || isUploading}
                    style={{
                        padding: '12px 24px',
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: (isParsing || isUploading) ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="17 8 12 3 7 8" />
                        <line x1="12" x2="12" y1="3" y2="15" />
                    </svg>
                    {isParsing ? 'Parsing...' : 'Select CSV File'}
                </button>
            </div>

            {errorMsg && (
                <div style={{ padding: '1rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--error)', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--error)' }}>
                    {errorMsg}
                </div>
            )}

            {successMsg && (
                <div style={{ padding: '1rem', background: 'rgba(5, 150, 105, 0.1)', color: 'var(--primary)', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                    {successMsg} Routing to store...
                </div>
            )}

            {badRows.length > 0 && (
                <div style={{ background: 'rgba(255, 60, 60, 0.05)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--error)', marginBottom: '2rem' }}>
                    <h3 style={{ color: 'var(--error)', fontWeight: 600, marginBottom: '1rem' }}>Validation Errors</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {badRows.map((br, idx) => (
                            <li key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <strong>Row {br.row}:</strong> {br.issues}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {parsedData.length > 0 && !successMsg && (
                <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>2. Preview & Import</h2>
                        <span style={{ background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 600 }}>
                            {parsedData.length} total rows
                        </span>
                    </div>

                    <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--card-border)', borderRadius: '8px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-elevated)', borderBottom: '1px solid var(--card-border)' }}>
                                <tr>
                                    <th style={{ padding: '12px', fontWeight: 600 }}>Title</th>
                                    <th style={{ padding: '12px', fontWeight: 600 }}>Price</th>
                                    <th style={{ padding: '12px', fontWeight: 600 }}>Category</th>
                                </tr>
                            </thead>
                            <tbody>
                                {parsedData.slice(0, 100).map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)' }}>{row.title || <span style={{color: 'var(--error)'}}>Missing</span>}</td>
                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>₦{row.price}</td>
                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{row.category}</td>
                                    </tr>
                                ))}
                                {parsedData.length > 100 && (
                                    <tr>
                                        <td colSpan={3} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                            ... and {parsedData.length - 100} more rows
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {isUploading && (
                            <div style={{ width: '100%', height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
                            </div>
                        )}
                        
                        <button
                            onClick={handleBatchImport}
                            disabled={isUploading || badRows.length > 0}
                            style={{
                                padding: '16px',
                                background: (isUploading || badRows.length > 0) ? 'var(--card-border)' : 'var(--primary)',
                                color: (isUploading || badRows.length > 0) ? 'var(--text-muted)' : '#000',
                                fontWeight: 700,
                                border: 'none',
                                borderRadius: '8px',
                                cursor: (isUploading || badRows.length > 0) ? 'not-allowed' : 'pointer',
                                fontSize: '1rem',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                        >
                            {isUploading ? `Importing... ${progress}%` : 'Confirm & Import All'}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
