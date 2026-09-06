import { describe, it, expect } from '@jest/globals';
import crypto from 'crypto';
import {
  generateUploadSignature,
  verifyUploadSignature,
} from '../../src/services/cloudinary.service';

describe('Cloudinary Signed Upload Flow', () => {
  it('generates a valid upload signature with timestamp and folder', () => {
    const fixedTimestamp = 1725580000;
    const folder = 'chat_attachments';

    const result = generateUploadSignature({
      folder,
      timestamp: fixedTimestamp,
    });

    expect(result).toHaveProperty('signature');
    expect(result).toHaveProperty('timestamp', fixedTimestamp);
    expect(result).toHaveProperty('folder', folder);
    expect(result).toHaveProperty('apiKey');
    expect(result).toHaveProperty('cloudName');

    // Manually compute expected signature:
    // folder=chat_attachments&timestamp=1725580000 + secret -> sha1 hex
    const secret = process.env.CLOUDINARY_API_SECRET || 'demo-secret';
    const stringToSign = `folder=${folder}&timestamp=${fixedTimestamp}${secret}`;
    const expectedSignature = crypto.createHash('sha1').update(stringToSign).digest('hex');

    expect(result.signature).toBe(expectedSignature);
  });

  it('validates signed upload parameters correctly using verifyUploadSignature', () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'support_media';

    const result = generateUploadSignature({ folder, timestamp });

    const isValid = verifyUploadSignature(
      { folder, timestamp },
      result.signature
    );
    expect(isValid).toBe(true);

    const isTamperedInvalid = verifyUploadSignature(
      { folder: 'tampered_folder', timestamp },
      result.signature
    );
    expect(isTamperedInvalid).toBe(false);
  });

  it('signs parameters in strict alphabetical order', () => {
    const timestamp = 1700000000;
    const folder = 'z_folder';
    const result = generateUploadSignature({ folder, timestamp });

    // In alphabetical order: 'folder' comes before 'timestamp'
    const secret = process.env.CLOUDINARY_API_SECRET || 'demo-secret';
    const expected = crypto
      .createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${secret}`)
      .digest('hex');

    expect(result.signature).toBe(expected);
  });
});
