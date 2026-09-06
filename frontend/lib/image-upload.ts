import { api } from './api';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB limit
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file format. Please choose a JPG, PNG, WEBP, or GIF image.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
    };
  }

  return { valid: true };
}

export interface UploadResult {
  secureUrl: string;
  width?: number;
  height?: number;
  format?: string;
  publicId?: string;
}

/**
 * Uploads an image directly from the browser to Cloudinary via signed upload.
 * Raw file bytes NEVER pass through the Express server.
 */
export async function uploadImageToCloudinaryDirect(
  file: File,
  options?: {
    folder?: string;
    onProgress?: (progressPercent: number) => void;
  }
): Promise<UploadResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid file');
  }

  // 1. Request short-lived signed upload parameters from backend
  const sigData = await api.chats.getUploadSignature(options?.folder || 'chat_attachments');

  const url = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/image/upload`;

  const formData = new FormData();
  formData.append('file', file);
  formData.append('api_key', sigData.apiKey);
  formData.append('timestamp', sigData.timestamp.toString());
  formData.append('signature', sigData.signature);
  formData.append('folder', sigData.folder);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (options?.onProgress && xhr.upload) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          options.onProgress?.(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText);
          resolve({
            secureUrl: res.secure_url || res.url,
            width: res.width,
            height: res.height,
            format: res.format,
            publicId: res.public_id,
          });
        } catch {
          reject(new Error('Failed to parse Cloudinary upload response'));
        }
      } else {
        try {
          const errRes = JSON.parse(xhr.responseText);
          const msg = errRes?.error?.message || `Upload failed with status ${xhr.status}`;
          
          // If in local development with unconfigured demo credentials, provide preview fallback for testing
          if (sigData.cloudName === 'demo' || sigData.apiKey === 'demo-key') {
            console.warn('[Cloudinary] Demo credentials used. Using local object URL fallback for preview testing.');
            const objectUrl = URL.createObjectURL(file);
            resolve({
              secureUrl: objectUrl,
            });
            return;
          }

          reject(new Error(msg));
        } catch {
          // Dev fallback if demo credentials
          if (sigData.cloudName === 'demo' || sigData.apiKey === 'demo-key') {
            const objectUrl = URL.createObjectURL(file);
            resolve({ secureUrl: objectUrl });
            return;
          }
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      // Dev fallback if demo credentials
      if (sigData.cloudName === 'demo' || sigData.apiKey === 'demo-key') {
        const objectUrl = URL.createObjectURL(file);
        resolve({ secureUrl: objectUrl });
        return;
      }
      reject(new Error('Network error occurred during image upload.'));
    };

    xhr.send(formData);
  });
}
