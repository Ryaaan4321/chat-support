export interface AvatarOption {
  id: string;
  label: string;
  src: string;
}

export const CLOUDINARY_AVATARS: AvatarOption[] = [
  {
    id: 'avatar-afro',
    label: 'Afro',
    src: 'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741446/swish_avatars/avatar-afro.png',
  },
  {
    id: 'avatar-curly',
    label: 'Curly',
    src: 'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741446/swish_avatars/avatar-curly.png',
  },
  {
    id: 'avatar-bob',
    label: 'Bob',
    src: 'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741447/swish_avatars/avatar-bob.png',
  },
  {
    id: 'avatar-bun',
    label: 'Top Bun',
    src: 'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741448/swish_avatars/avatar-bun.png',
  },
  {
    id: 'avatar-eyepatch',
    label: 'Captain',
    src: 'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741448/swish_avatars/avatar-eyepatch.png',
  },
  {
    id: 'avatar-hijab',
    label: 'Hijab',
    src: 'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741449/swish_avatars/avatar-hijab.png',
  },
  {
    id: 'avatar-mustache',
    label: 'Mustache',
    src: 'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741450/swish_avatars/avatar-mustache.png',
  },
];

export const DEFAULT_CUSTOMER_AVATAR =
  'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741446/swish_avatars/avatar-curly.png';

export const DEFAULT_AGENT_AVATAR =
  'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741447/swish_avatars/avatar-bob.png';

export const DEFAULT_MANAGER_AVATAR =
  'https://res.cloudinary.com/dfaocyti0/image/upload/v1788741446/swish_avatars/avatar-afro.png';

export function resolveAvatarUrl(url?: string | null, fallbackRole: 'AGENT' | 'CUSTOMER' | 'MANAGER' = 'AGENT'): string {
  if (!url || typeof url !== 'string' || !url.trim()) {
    if (fallbackRole === 'CUSTOMER') return DEFAULT_CUSTOMER_AVATAR;
    if (fallbackRole === 'MANAGER') return DEFAULT_MANAGER_AVATAR;
    return DEFAULT_AGENT_AVATAR;
  }

  const clean = url.trim();

  // Already a full Cloudinary / remote URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }

  // Exact matches to Cloudinary IDs or local paths
  if (clean.includes('afro') || clean.includes('image 13')) {
    return CLOUDINARY_AVATARS[0].src;
  }
  if (clean.includes('curly') || clean.includes('image 14')) {
    return CLOUDINARY_AVATARS[1].src;
  }
  if (clean.includes('bob') || clean.includes('image 3.') || clean === '/avatars/avatar-bob.png') {
    return CLOUDINARY_AVATARS[2].src;
  }
  if (clean.includes('bun') || clean.includes('image 3 (1)')) {
    return CLOUDINARY_AVATARS[3].src;
  }
  if (clean.includes('eyepatch') || clean.includes('image 4')) {
    return CLOUDINARY_AVATARS[4].src;
  }
  if (clean.includes('hijab') || clean.includes('image 6')) {
    return CLOUDINARY_AVATARS[5].src;
  }
  if (clean.includes('mustache') || clean.includes('image 8')) {
    return CLOUDINARY_AVATARS[6].src;
  }

  // Legacy local avatar mappings
  if (clean.includes('avatar-1')) return DEFAULT_CUSTOMER_AVATAR;
  if (clean.includes('avatar-2')) return DEFAULT_AGENT_AVATAR;
  if (clean.includes('avatar-3')) return DEFAULT_MANAGER_AVATAR;

  return clean;
}
