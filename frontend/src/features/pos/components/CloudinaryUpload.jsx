// src/features/pos/components/CloudinaryUpload.jsx
import { useState } from 'react';
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';

export default function CloudinaryUpload({ onUploadComplete, multiple = false, buttonText = "Upload to Cloudinary" }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Validate file before upload
  const validateFile = (file) => {
    // Check if file exists
    if (!file) return 'No file selected';
    
    // Check file size (minimum 100 bytes for a valid image)
    if (file.size < 100) {
      return `File is too small or corrupted (${file.size} bytes)`;
    }
    
    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return `File too large (max 10MB)`;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      return `File is not an image (${file.type})`;
    }
    
    return null;
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setUploading(true);
    setProgress(0);
    setUploadError('');

    try {
      const validFiles = [];
      const errors = [];

      // Validate all files first
      for (const file of files) {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        setUploadError(`Skipped ${errors.length} file(s): ${errors.join(', ')}`);
      }

      if (validFiles.length === 0) {
        setUploading(false);
        return;
      }

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        
        try {
          // Double-check file can be read
          const arrayBuffer = await file.arrayBuffer();
          if (arrayBuffer.byteLength < 100) {
            throw new Error(`File appears corrupted (${arrayBuffer.byteLength} bytes)`);
          }

          // Create FormData
          const formData = new FormData();
          formData.append('file', file);
          formData.append('upload_preset', uploadPreset);
          formData.append('folder', 'pos-products');
          
          // Add timestamp to avoid caching issues
          formData.append('timestamp', Date.now());

          console.log('☁️ Uploading to Cloudinary:', {
            name: file.name,
            size: file.size,
            type: file.type
          });

          // Upload with timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

          const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            {
              method: 'POST',
              body: formData,
              signal: controller.signal
            }
          );

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `Upload failed with status ${response.status}`);
          }

          const data = await response.json();
          
          if (data.secure_url) {
            console.log('✅ Upload successful:', data.secure_url);
            onUploadComplete({
              url: data.secure_url,
              publicId: data.public_id,
              format: data.format,
              width: data.width,
              height: data.height,
              bytes: data.bytes
            });
          } else {
            throw new Error('No secure_url in response');
          }
        } catch (fileError) {
          console.error(`❌ Upload failed for ${file.name}:`, fileError);
          setUploadError(prev => prev ? `${prev}, ${file.name}` : `Failed: ${file.name}`);
        }

        setProgress(((i + 1) / validFiles.length) * 100);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setUploadError(error.message || 'Failed to upload image');
    } finally {
      setUploading(false);
      setTimeout(() => setUploadError(''), 5000);
    }
  };

  return (
    <div className="space-y-3">
      <input
        type="file"
        id="cloudinary-upload"
        accept="image/*"
        multiple={multiple}
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />
      
      <label
        htmlFor="cloudinary-upload"
        className={`block w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex items-center justify-center gap-2 text-sm cursor-pointer ${
          uploading ? 'opacity-50' : ''
        }`}
      >
        {uploading ? (
          <>
            <Icons.refresh className="animate-spin text-sm" />
            Uploading... {Math.round(progress)}%
          </>
        ) : (
          <>
            <Icons.cloud className="text-sm" />
            {buttonText}
          </>
        )}
      </label>
      
      {uploadError && (
        <p className="text-xs text-red-500 mt-1">{uploadError}</p>
      )}
    </div>
  );
}