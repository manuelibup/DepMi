'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import CloudinaryUploader, { CloudinaryUploadResult } from '@/components/CloudinaryUploader';
import Image from 'next/image';

export default function StoreCreatePage() {
    const { status } = useSession();
    const router = useRouter();

    const [form, setForm] = useState({
        name: '',
        slug: '',
        description: '',
        location: '',
        logoUrl: '',
        phoneNumber: '',
        isStudentVendor: false,
        university: '',
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

    // Auto-generate slug from name as user types (only if not manually edited)
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value;
        if (!slugManuallyEdited) {
            const autoSlug = newName.toLowerCase().replace(/[^a-z0-9]/g, '');
            setForm(prev => ({ ...prev, name: newName, slug: autoSlug }));
        } else {
            setForm(prev => ({ ...prev, name: newName }));
        }
    };

    const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSlugManuallyEdited(true);
        setForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') }));
    };

    if (status === 'loading') {
        return <div style={{ padding: '4rem', textAlign: 'center' }}>Loading verification...</div>;
    }

    if (status === 'unauthenticated') {
        router.push('/login?callbackUrl=/store/create');
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch('/api/store/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });

            const data = await res.json();

            if (res.ok) {
                // Redirect to the new store's public page (Week 3: /store/[slug])
                router.push(`/store/${data.store.slug}`);
            } else {
                if (res.status === 403) {
                    setError("You are not allowed to create a store at this time.");
                } else {
                    setError(data.message || "Failed to create store.");
                }
            }
        } catch (err) {
            setError("Network error. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main style={{ maxWidth: '440px', margin: '4rem auto', padding: '0 1.5rem', fontFamily: 'var(--font-heading)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                    Create Your Store
                </h1>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Set up your business identity and start selling to the DepMi community.
                </p>
            </div>

            <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                {error && (
                    <div style={{ padding: '1rem', background: 'rgba(255, 60, 60, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', border: '1px solid var(--danger)', marginBottom: '1.5rem' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Store Name */}
                    <div>
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Store Name</label>
                        <input
                            id="name"
                            type="text"
                            value={form.name}
                            onChange={handleNameChange}
                            placeholder="e.g. Vintage Vault"
                            required
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    {/* Store Handle (Slug) */}
                    <div>
                        <label htmlFor="slug" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Store Handle</label>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', padding: '0 1rem' }}>
                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>@</span>
                            <input
                                id="slug"
                                type="text"
                                value={form.slug}
                                onChange={handleSlugChange}
                                placeholder="vintagevault"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.875rem 0.5rem',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'var(--text-primary)',
                                    outline: 'none'
                                }}
                            />
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            depmi.com/{form.slug || 'handle'}
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Short Description (Optional)</label>
                        <textarea
                            id="description"
                            value={form.description}
                            onChange={(e) => setForm({ ...form, description: e.target.value })}
                            placeholder="What do you sell?"
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    {/* Logo Upload */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Store Logo (Optional)</label>
                        {form.logoUrl ? (
                            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', overflow: 'hidden', border: '2px solid var(--border)', backgroundColor: 'var(--bg-elevated)' }}>
                                <Image src={form.logoUrl} alt="Store Logo" fill style={{ objectFit: 'cover' }} />
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, logoUrl: '' })}
                                    style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                >
                                    ✕
                                </button>
                            </div>
                        ) : (
                            <CloudinaryUploader
                                onUploadSuccess={(res: CloudinaryUploadResult) => setForm({ ...form, logoUrl: res.secure_url })}
                                accept="image/*"
                                maxSizeMB={5}
                                buttonText="Upload Logo"
                                cropAspectRatio={1}
                                cropTitle="Crop Store Logo"
                            />
                        )}
                    </div>


                    {/* Location */}
                    <div>
                        <label htmlFor="location" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Primary Location</label>
                        <input
                            id="location"
                            list="nigeria-cities"
                            type="text"
                            value={form.location}
                            onChange={(e) => setForm({ ...form, location: e.target.value })}
                            placeholder="e.g. Lagos, Nigeria"
                            required
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                        <datalist id="nigeria-cities">
                            <option value="Lagos, Nigeria" />
                            <option value="Abuja, Nigeria" />
                            <option value="Port Harcourt, Nigeria" />
                            <option value="Ibadan, Nigeria" />
                            <option value="Kano, Nigeria" />
                            <option value="Uyo, Nigeria" />
                            <option value="Enugu, Nigeria" />
                            <option value="Benin City, Nigeria" />
                            <option value="Kaduna, Nigeria" />
                            <option value="Jos, Nigeria" />
                        </datalist>
                    </div>

                    {/* Student Vendor Toggle */}
                    <div style={{ padding: '1rem', background: 'rgba(var(--primary-rgb), 0.05)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--primary)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.75rem' }}>
                            <input 
                                type="checkbox" 
                                checked={form.isStudentVendor}
                                onChange={(e) => setForm({ ...form, isStudentVendor: e.target.checked })}
                                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--primary)' }}
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>I am a Student Vendor</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Show buyers my university to build local trust.</span>
                            </div>
                        </label>

                        {form.isStudentVendor && (
                            <div style={{ marginTop: '1rem' }}>
                                <label htmlFor="university" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Campus/University</label>
                                <input
                                    id="university"
                                    type="text"
                                    list="nigeria-universities"
                                    value={form.university}
                                    onChange={(e) => setForm({ ...form, university: e.target.value })}
                                    placeholder="e.g. University of Lagos (UNILAG)"
                                    required={form.isStudentVendor}
                                    style={{
                                        width: '100%',
                                        padding: '0.875rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: '1px solid var(--border)',
                                        background: 'var(--input-bg)',
                                        color: 'var(--text-primary)',
                                        outline: 'none'
                                    }}
                                />
                                <datalist id="nigeria-universities">
                                    <option value="University of Lagos (UNILAG)" />
                                    <option value="University of Ibadan (UI)" />
                                    <option value="Obafemi Awolowo University (OAU)" />
                                    <option value="University of Nigeria, Nsukka (UNN)" />
                                    <option value="Ahmadu Bello University (ABU)" />
                                    <option value="University of Uyo (UNIUYO)" />
                                    <option value="University of Port Harcourt (UNIPORT)" />
                                    <option value="Covenant University (CU)" />
                                    <option value="Babcock University" />
                                    <option value="Federal University of Technology, Owerri (FUTO)" />
                                    <option value="Federal University of Technology, Akure (FUTA)" />
                                </datalist>
                            </div>
                        )}
                    </div>

                    {/* Phone Number */}
                    <div>
                        <label htmlFor="phoneNumber" style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 600 }}>Contact Phone Number (Optional)</label>
                        <input
                            id="phoneNumber"
                            type="tel"
                            value={form.phoneNumber}
                            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                            placeholder="e.g. 08012345678"
                            style={{
                                width: '100%',
                                padding: '0.875rem 1rem',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-primary)',
                                outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || form.name.length < 3}
                        style={{
                            padding: '1rem',
                            background: 'var(--primary)',
                            color: '#000',
                            fontWeight: 700,
                            border: 'none',
                            borderRadius: 'var(--radius-md)',
                            cursor: (loading || form.name.length < 3) ? 'not-allowed' : 'pointer',
                            opacity: (loading || form.name.length < 3) ? 0.5 : 1,
                            fontSize: '1rem',
                            marginTop: '1rem'
                        }}
                    >
                        {loading ? 'Minting Store...' : 'Create Store'}
                    </button>

                </form>
            </div>
        </main>
    );
}
