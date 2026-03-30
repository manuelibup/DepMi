'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface ParsedProduct {
    title: string;
    description?: string;
    price: number;
    category: string;
    imageUrl?: string;
}

export default function AIImportPage({ params }: { params: { slug: string } }) {
    const { slug } = params;
    const router = useRouter();
    const { status } = useSession();

    // All hooks must be declared before any conditional return
    const [textContent, setTextContent] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [base64Image, setBase64Image] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedProduct[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [badRows, setBadRows] = useState<{row: number, issues: string}[]>([]);

    useEffect(() => {
        if (status === 'unauthenticated') router.replace(`/login?callbackUrl=/store/${slug}/ai-import`);
    }, [status, router, slug]);

    if (status === 'loading' || status === 'unauthenticated') {
        return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
    }

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create preview
        const objectUrl = URL.createObjectURL(file);
        setImagePreview(objectUrl);
        setMediaType(file.type);

        // Read to base64
        const reader = new FileReader();
        reader.onloadend = () => {
             const base64String = reader.result as string;
             // Remove the data:image/jpeg;base64, prefix for the strict format
             const pureBase64 = base64String.split(',')[1];
             setBase64Image(pureBase64);
        };
        reader.readAsDataURL(file);
    };

    const handleClearImage = () => {
        setImagePreview(null);
        setBase64Image(null);
        setMediaType(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleExtract = async () => {
        if (!textContent.trim() && !base64Image) return;
        setIsExtracting(true);
        setErrorMsg(null);
        setParsedData([]);

        try {
            const res = await fetch('/api/catalog/ai-parse', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    textContent: textContent.trim(),
                    base64Image,
                    mediaType
                })
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.message || 'Failed to extract data.');
            }

            if (!data.products || data.products.length === 0) {
                 throw new Error("AI couldn't identify any products in the provided input.");
            }

            setParsedData(data.products);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setErrorMsg(err.message || 'An error occurred during extraction.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleBatchImport = async () => {
        if (parsedData.length === 0) return;
        setIsUploading(true);
        setErrorMsg(null);
        setBadRows([]);
        setProgress(0);

        const CHUNK_SIZE = 50; 
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
                        throw new Error(`Validation failed on chunk ${Math.floor(i/CHUNK_SIZE) + 1}.`);
                    }
                    throw new Error(data.message || 'Server error during chunk upload.');
                }

                importedCount += chunk.length;
                setProgress(Math.round((importedCount / parsedData.length) * 100));
            }

            setSuccessMsg(`Successfully imported ${importedCount} items!`);
            setParsedData([]);
            
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
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>AI Magic Import</h1>
            </header>

            <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    Upload a photo of a receipt, menu, or paste raw text. Our AI will automatically extract the items, prices, and categories for you.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Text Area */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Paste Text Catalog</label>
                        <textarea 
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            placeholder="e.g. 1. Vintage Boots - N45,000&#10;2. Gold Chain - N12,500"
                            rows={4}
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-main)', outline: 'none', resize: 'vertical' }}
                            disabled={isExtracting}
                        />
                    </div>

                    {/* Image Upload */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>Or Upload Menu/Receipt Photo</label>
                        <input 
                            type="file" 
                            accept="image/jpeg, image/png, image/webp" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            style={{ display: 'none' }} 
                        />
                        
                        {!imagePreview ? (
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isExtracting}
                                style={{
                                    padding: '12px 24px', background: 'var(--bg-elevated)', color: 'var(--text-main)', border: '1px dashed var(--border)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center'
                                }}
                            >
                                📸 Select Photo
                            </button>
                        ) : (
                            <div style={{ position: 'relative', width: '200px', height: '200px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imagePreview} alt="Receipt preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                <button
                                    onClick={handleClearImage}
                                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer' }}
                                >✕</button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleExtract}
                        disabled={isExtracting || (!textContent.trim() && !base64Image)}
                        style={{
                            padding: '16px',
                            background: (isExtracting || (!textContent.trim() && !base64Image)) ? 'var(--card-border)' : 'var(--primary)',
                            color: (isExtracting || (!textContent.trim() && !base64Image)) ? 'var(--text-muted)' : '#000',
                            fontWeight: 700, border: 'none', borderRadius: '8px', cursor: (isExtracting || (!textContent.trim() && !base64Image)) ? 'not-allowed' : 'pointer', fontSize: '1rem',
                        }}
                    >
                        {isExtracting ? '✨ AI is reading your catalog...' : 'Extract Products'}
                    </button>

                </div>
            </div>

            {errorMsg && (
                <div style={{ padding: '1rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--error)', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--error)' }}>
                    {errorMsg}
                </div>
            )}

            {successMsg && (
                <div style={{ padding: '1rem', background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                    {successMsg}
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

            {/* Same Preview as CSV Import! */}
            {parsedData.length > 0 && !successMsg && (
                <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Review Found Items</h2>
                        <span style={{ background: 'var(--bg-elevated)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.875rem', fontWeight: 600 }}>
                            {parsedData.length} items
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
                                {parsedData.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--card-border)' }}>
                                        <td style={{ padding: '12px', color: 'var(--text-main)' }}>{row.title}</td>
                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>₦{row.price}</td>
                                        <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{row.category}</td>
                                    </tr>
                                ))}
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
                                padding: '16px', background: (isUploading || badRows.length > 0) ? 'var(--card-border)' : 'var(--primary)', color: (isUploading || badRows.length > 0) ? 'var(--text-muted)' : '#000', fontWeight: 700, border: 'none', borderRadius: '8px', cursor: (isUploading || badRows.length > 0) ? 'not-allowed' : 'pointer', fontSize: '1rem',
                            }}
                        >
                            {isUploading ? `Importing... ${progress}%` : 'Looks Good — Import All'}
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}
