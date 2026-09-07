const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load .env from backend
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const [key, ...vals] = trimmed.split('=');
    if (key && vals.length > 0) {
      let val = vals.join('=').trim();
      if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
        val = val.slice(1, -1);
      }
      process.env[key.trim()] = val;
    }
  });
}

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

console.log('Cloudinary Config:', { cloudName, apiKey: apiKey ? 'OK' : 'MISSING', apiSecret: apiSecret ? 'OK' : 'MISSING' });

if (!cloudName || !apiKey || !apiSecret) {
  console.error('Missing Cloudinary credentials in .env');
  process.exit(1);
}

const avatarsToUpload = [
  { id: 'avatar-afro', label: 'Afro', file: 'avatar-afro.png' },
  { id: 'avatar-curly', label: 'Curly', file: 'avatar-curly.png' },
  { id: 'avatar-bob', label: 'Bob', file: 'avatar-bob.png' },
  { id: 'avatar-bun', label: 'Top Bun', file: 'avatar-bun.png' },
  { id: 'avatar-eyepatch', label: 'Captain', file: 'avatar-eyepatch.png' },
  { id: 'avatar-hijab', label: 'Hijab', file: 'avatar-hijab.png' },
  { id: 'avatar-mustache', label: 'Mustache', file: 'avatar-mustache.png' },
];

async function uploadAvatar(item) {
  const filePath = path.resolve(__dirname, '../../frontend/public/avatars', item.file);
  if (!fs.existsSync(filePath)) {
    throw new Error('File not found: ' + filePath);
  }

  const folder = 'swish_avatars';
  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = item.id;

  const paramsToSign = {
    folder,
    public_id: publicId,
    timestamp,
  };
  const sortedKeys = Object.keys(paramsToSign).sort();
  const serialized = sortedKeys.map((k) => `${k}=${paramsToSign[k]}`).join('&');
  const stringToSign = `${serialized}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

  const fileBuffer = fs.readFileSync(filePath);
  const blob = new Blob([fileBuffer], { type: 'image/png' });

  const formData = new FormData();
  formData.append('file', blob, item.file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', timestamp.toString());
  formData.append('signature', signature);
  formData.append('folder', folder);
  formData.append('public_id', publicId);

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Cloudinary upload failed for ${item.id}: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  return {
    id: item.id,
    label: item.label,
    secureUrl: data.secure_url,
    publicId: data.public_id,
  };
}

async function main() {
  const results = [];
  for (const item of avatarsToUpload) {
    console.log(`Uploading ${item.id} (${item.file})...`);
    const res = await uploadAvatar(item);
    console.log(`Uploaded ${item.id} -> ${res.secureUrl}`);
    results.push(res);
  }

  console.log('\n=== CLOUDINARY AVATARS COMPLETE ===\n');
  console.log(JSON.stringify(results, null, 2));

  // Write out a JSON file for frontend and backend usage
  const outPath = path.resolve(__dirname, '../../frontend/lib/cloudinary-avatars.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`Saved avatar mapping to ${outPath}`);
}

main().catch((err) => {
  console.error('Upload failed:', err);
  process.exit(1);
});
