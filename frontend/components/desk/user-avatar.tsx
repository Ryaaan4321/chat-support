'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { resolveAvatarUrl } from '@/lib/avatars';

export interface UserAvatarProps {
  src?: string | null;
  alt?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  imageClassName?: string;
  fallbackText?: string;
}

const SIZE_MAP = {
  xs: 'size-6',      // 24px
  sm: 'size-7',      // 28px (message bubble & chat list tabs)
  md: 'size-8',      // 32px (app header)
  lg: 'size-9',      // 36px (active thread header)
  xl: 'size-14',     // 56px (signup avatar picker)
};

export function UserAvatar({
  src,
  alt = 'Avatar',
  size = 'sm',
  className,
  imageClassName,
  fallbackText,
}: UserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = resolveAvatarUrl(src);
  const initial = fallbackText ? fallbackText.slice(0, 1).toUpperCase() : (alt ? alt.slice(0, 1).toUpperCase() : 'U');

  return (
    <div
      className={cn(
        'relative rounded-full overflow-hidden shrink-0 border border-slate-200/90 bg-[#F8FAFC] flex items-center justify-center select-none shadow-2xs isolate',
        SIZE_MAP[size],
        className
      )}
      style={{
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
        maskImage: 'radial-gradient(circle, white 100%, transparent 100%)',
      }}
    >
      {!hasError ? (
        <Image
          src={resolvedSrc}
          alt={alt}
          fill
          sizes={size === 'xl' ? '56px' : size === 'lg' ? '36px' : '28px'}
          className={cn(
            'object-contain p-0.5 rounded-full transition-transform duration-200',
            imageClassName
          )}
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="text-[11px] font-bold text-slate-500">{initial}</span>
      )}
    </div>
  );
}
