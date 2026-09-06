import crypto from 'crypto'

export interface CloudinarySignatureResult {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export function generateUploadSignature(options?: {
  folder?: string;
  timestamp?: number;
}): CloudinarySignatureResult {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'demo';
  const apiKey = process.env.CLOUDINARY_API_KEY || 'demo-key';
  const apiSecret = process.env.CLOUDINARY_API_SECRET || 'demo-secret';

  const folder = options?.folder || 'chat_attachments';
  const timestamp = options?.timestamp || Math.floor(Date.now() / 1000);
  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };
  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join('&');
  const stringToSign = `${serialized}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
  };
}

export function verifyUploadSignature(
  params: Record<string, string | number>,
  signature: string,
  apiSecret: string = process.env.CLOUDINARY_API_SECRET || 'demo-secret'
): boolean {
  const sortedKeys = Object.keys(params).sort();
  const serialized = sortedKeys.map((k) => `${k}=${params[k]}`).join('&');
  const stringToSign = `${serialized}${apiSecret}`;
  const expected = crypto.createHash('sha1').update(stringToSign).digest('hex');
  return expected === signature;
}
