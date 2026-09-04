'use client';

import React, { useState, useEffect } from 'react';

export function TimeDisplay({
  timestamp,
  fallback = 'Live',
  className,
}: {
  timestamp?: string | null;
  fallback?: string;
  className?: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!timestamp || !mounted) {
    return (
      <span className={className} suppressHydrationWarning>
        {fallback}
      </span>
    );
  }

  const formatted = new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <span className={className} suppressHydrationWarning>
      {formatted}
    </span>
  );
}
