import { api } from './api';

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit
export const MAX_AUDIO_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB limit
export const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB limit

export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/m4a',
  'audio/x-m4a',
  'audio/aac',
];

export const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/ogg',
  'video/x-matroska',
];

export interface FileValidationResult {
  valid: boolean;
  messageType?: 'IMAGE' | 'AUDIO' | 'VIDEO';
  error?: string;
}

export function detectMediaType(file: File): 'IMAGE' | 'AUDIO' | 'VIDEO' | null {
  const type = file.type.toLowerCase();
  if (ALLOWED_IMAGE_TYPES.includes(type) || type.startsWith('image/')) {
    return 'IMAGE';
  }
  if (ALLOWED_AUDIO_TYPES.includes(type) || type.startsWith('audio/')) {
    return 'AUDIO';
  }
  if (ALLOWED_VIDEO_TYPES.includes(type) || type.startsWith('video/')) {
    return 'VIDEO';
  }
  return null;
}

export function validateMediaFile(file: File): FileValidationResult {
  const mediaType = detectMediaType(file);
  if (!mediaType) {
    return {
      valid: false,
      error: 'Unsupported file format. Please upload an image, audio file, or video.',
    };
  }

  if (mediaType === 'IMAGE' && file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image is too large (${sizeMb} MB). Maximum allowed size is 10 MB.`,
    };
  }

  if (mediaType === 'AUDIO' && file.size > MAX_AUDIO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Audio file is too large (${sizeMb} MB). Maximum allowed size is 20 MB.`,
    };
  }

  if (mediaType === 'VIDEO' && file.size > MAX_VIDEO_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Video is too large (${sizeMb} MB). Maximum allowed size is 50 MB.`,
    };
  }

  return { valid: true, messageType: mediaType };
}

// Backward compatibility helper
export function validateImageFile(file: File): FileValidationResult {
  return validateMediaFile(file);
}

export interface UploadResult {
  secureUrl: string;
  messageType: 'IMAGE' | 'AUDIO' | 'VIDEO';
  width?: number;
  height?: number;
  format?: string;
  publicId?: string;
}

/**
 * Uploads an image, audio, or video directly from the browser to Cloudinary via signed upload.
 * Raw file bytes NEVER pass through the Express server.
 */
export async function uploadMediaToCloudinaryDirect(
  file: File,
  options?: {
    folder?: string;
    onProgress?: (progressPercent: number) => void;
  }
): Promise<UploadResult> {
  const validation = validateMediaFile(file);
  if (!validation.valid || !validation.messageType) {
    throw new Error(validation.error || 'Invalid file');
  }

  const messageType = validation.messageType;

  // 1. Request short-lived signed upload parameters from backend
  const sigData = await api.chats.getUploadSignature(options?.folder || 'chat_attachments');

  // Cloudinary stores audio and video files under the 'video' resource endpoint
  const endpointType = messageType === 'IMAGE' ? 'image' : 'video';
  const url = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${endpointType}/upload`;

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
            messageType,
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
              messageType,
            });
            return;
          }

          reject(new Error(msg));
        } catch {
          if (sigData.cloudName === 'demo' || sigData.apiKey === 'demo-key') {
            const objectUrl = URL.createObjectURL(file);
            resolve({ secureUrl: objectUrl, messageType });
            return;
          }
          reject(new Error(`Upload failed with HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      if (sigData.cloudName === 'demo' || sigData.apiKey === 'demo-key') {
        const objectUrl = URL.createObjectURL(file);
        resolve({ secureUrl: objectUrl, messageType });
        return;
      }
      reject(new Error('Network error occurred during media upload.'));
    };

    xhr.send(formData);
  });
}

// Backward compatibility alias
export const uploadImageToCloudinaryDirect = uploadMediaToCloudinaryDirect;
