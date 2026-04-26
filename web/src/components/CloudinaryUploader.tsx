'use client';

import React, { useState, useRef } from 'react';
import CropModal from './CropModal';

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
  multiple?: boolean;
  /** When set, image files will be shown in a crop modal before upload */
  cropAspectRatio?: number;
  cropTitle?: string;
}

export default function CloudinaryUploader({
  onUploadSuccess,
  accept = 'image/*,video/*',
  maxSizeMB = 100, // Default to 100MB
  maxDurationSeconds = 60, // Default to 60s
  buttonText = 'Upload Media',
  multiple = false,
  cropAspectRatio,
  cropTitle,
}: CloudinaryUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const pendingFilesRef = useRef<File[]>([]);

  const resetInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setError('');
    setProgress(0);

    // If crop is enabled and the first file is an image, show crop modal
    if (cropAspectRatio && files[0].type.startsWith('image/')) {
      const file = files[0];
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${maxSizeMB}MB limit.`);
        resetInput();
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setCropSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
      resetInput();
      return;
    }

    for (const file of files) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`"${file.name}" exceeds the ${maxSizeMB}MB limit.`);
        resetInput();
        return;
      }
      if (file.type.startsWith('video/')) {
        try {
          const duration = await getVideoDuration(file);
          if (duration > maxDurationSeconds) {
            setError(`Video must be ${maxDurationSeconds}s or less.`);
            resetInput();
            return;
          }
        } catch {
          setError('Could not read video metadata.');
          resetInput();
          return;
        }
      }
      await uploadToCloudinary(file);
    }
    resetInput();
  };

  const handleCropDone = async (blob: Blob) => {
    setCropSrc(null);
    const file = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
    await uploadToCloudinary(file);
  };

  const handleCropCancel = () => {
    setCropSrc(null);
    pendingFilesRef.current = [];
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
      const resourceType = file.type.startsWith('video/')
        ? 'auto'
        : file.type.startsWith('image/')
          ? 'image'
          : 'raw';
      // Step A: Fetch signature from our restricted backend
      const resSig = await fetch(`/api/upload/sign?resourceType=${resourceType}`);
      if (!resSig.ok) throw new Error('Failed to get secure upload signature. Are you logged in?');
      const { timestamp, folder, upload_preset, signature, apiKey, cloudName } = await resSig.json();

      if (!cloudName) throw new Error('Cloudinary environment variables missing on server.');

      setProgress(30);

      // Step B: Post directly to Cloudinary CDN via XHR for progress tracking.
      // Wrapped in a Promise so callers can properly await completion.
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', apiKey);
      formData.append('timestamp', timestamp.toString());
      formData.append('signature', signature);
      formData.append('folder', folder);
      formData.append('upload_preset', upload_preset);
      if (resourceType !== 'image') formData.append('resource_type', resourceType);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const resourceTypeParam = resourceType === 'auto' ? 'auto' : resourceType;
        xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/${resourceTypeParam}/upload`, true);

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(30 + Math.round((e.loaded / e.total) * 70));
          }
        };

        xhr.onload = () => {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            const expectedPrefix = `https://res.cloudinary.com/${cloudName}/`;
            if (!response.secure_url?.startsWith(expectedPrefix)) {
              reject(new Error('Upload response is invalid. Please try again.'));
              return;
            }
            setProgress(100);
            onUploadSuccess({
              public_id: response.public_id,
              format: response.format,
              secure_url: response.secure_url,
              original_filename: response.original_filename,
            });
            resolve();
          } else {
            try {
              const errorData = JSON.parse(xhr.responseText);
              reject(new Error(errorData.error?.message || 'Upload failed at Cloudinary'));
            } catch {
              reject(new Error('Upload failed at Cloudinary'));
            }
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed due to network error.'));
        xhr.send(formData);
      });

      setIsUploading(false);
      setProgress(0);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
      setIsUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {cropSrc && cropAspectRatio && (
        <CropModal
          imageSrc={cropSrc}
          aspectRatio={cropAspectRatio}
          onDone={handleCropDone}
          onCancel={handleCropCancel}
          title={cropTitle}
        />
      )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
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

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
    </>
  );
}
