'use client';

import React, { useState, useRef } from 'react';

export interface CloudinaryUploadResult {
  public_id: string;
  format: string;
  secure_url: string;
  original_filename: string;
}

interface CloudinaryUploaderProps {
  onUploadSuccess: (result: CloudinaryUploadResult) => void;
  accept?: string;
  maxSizeMB?: number;
  maxDurationSeconds?: number;
  buttonText?: string;
}

export default function CloudinaryUploader({
  onUploadSuccess,
  accept = 'image/*,video/*',
  maxSizeMB = 100, // Default to 100MB
  maxDurationSeconds = 60, // Default to 60s
  buttonText = 'Upload Media',
}: CloudinaryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset states
    setError('');
    setProgress(0);

    // 1. File Size Validation (100MB limit)
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File exceeds the ${maxSizeMB}MB limit.`);
      // Reset input specifically for Chrome
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 2. Video Duration Validation
    if (file.type.startsWith('video/')) {
        try {
            const duration = await getVideoDuration(file);
            if (duration > maxDurationSeconds) {
                setError(`Video length must be ${maxDurationSeconds} seconds or less.`);
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
        } catch {
            setError('Could not read video metadata.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
    }

    // Proceed to upload
    uploadToCloudinary(file);
  };

  const getVideoDuration = (file: File): Promise<number> => {
      return new Promise((resolve, reject) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
              window.URL.revokeObjectURL(video.src);
              resolve(video.duration);
          };
          video.onerror = () => reject('Invalid video file');
          video.src = window.URL.createObjectURL(file);
      });
  };

  const uploadToCloudinary = async (file: File) => {
    setIsUploading(true);
    setProgress(10);
    
    try {
      // Step A: Fetch signature from our restricted backend
      const resSig = await fetch('/api/upload/sign');
      if (!resSig.ok) throw new Error('Failed to get secure upload signature. Are you logged in?');
      const { timestamp, folder, upload_preset, signature, apiKey, cloudName } = await resSig.json();

      if (!cloudName) throw new Error('Cloudinary environment variables missing on server.');

      setProgress(30);

      // Step B: Post directly to Cloudinary CDN via XHR for progression
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('upload_preset', upload_preset);

      const xhr = new XMLHttpRequest();
      
      const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

      xhr.open('POST', uploadUrl, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          // Scale 30% to 100% since we already jumped to 30 from the sig fetch
          setProgress(30 + Math.round(percentComplete * 0.7)); 
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          // Validate the URL is actually from our Cloudinary account before storing
          const expectedPrefix = `https://res.cloudinary.com/${cloudName}/`;
          if (!response.secure_url?.startsWith(expectedPrefix)) {
            setError('Upload response is invalid. Please try again.');
            setIsUploading(false);
            setProgress(0);
            return;
          }
          setProgress(100);
          setIsUploading(false);
          // Only pass back the necessary attributes mapped to our DB target strategy
          onUploadSuccess({
              public_id: response.public_id,
              format: response.format,
              secure_url: response.secure_url,
              original_filename: response.original_filename
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
          try {
             const errorData = JSON.parse(xhr.responseText);
             setError(errorData.error?.message || 'Upload failed at Cloudinary');
          } catch {
             setError('Upload failed at Cloudinary (Unknown error)');
          }
          setIsUploading(false);
          setProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };

      xhr.onerror = () => {
        setError('Upload failed due to network error.');
        setIsUploading(false);
        setProgress(0);
        if (fileInputRef.current) fileInputRef.current.value = '';
      };

      xhr.send(formData);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        style={{ display: 'none' }}
      />
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        style={{
          padding: '12px 16px',
          backgroundColor: isUploading ? 'var(--bg-elevated)' : 'var(--primary)',
          color: isUploading ? 'var(--text-muted)' : '#000',
          border: '1px solid var(--card-border)',
          borderRadius: 'var(--radius-md)',
          fontWeight: 600,
          cursor: isUploading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          width: '100%',
        }}
      >
        {isUploading ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Uploading ({progress}%)
            </>
        ) : (
            <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" x2="12" y1="3" y2="15" />
                </svg>
                {buttonText}
            </>
        )}
      </button>

      {/* Progress Bar (Visible when uploading) */}
      {isUploading && (
          <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--bg-elevated)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--primary)', transition: 'width 0.2s ease' }} />
          </div>
      )}

      {/* Error Message */}
      {error && <p style={{ color: 'var(--error)', fontSize: '0.875rem', margin: '0' }}>{error}</p>}
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
