'use client';

import Image from 'next/image';
import clsx from 'clsx';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  className?: string;
}

export default function Avatar({ src, alt = 'avatar', fallback = 'U', className }: AvatarProps) {
  return src ? (
    <Image
      src={src}
      alt={alt}
      width={96}
      height={96}
      sizes="40px"
      className={clsx('h-10 w-10 rounded-full object-cover', className)}
    />
  ) : (
    <div className={clsx('flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--ac1))]/20 text-sm font-semibold text-white', className)}>
      {fallback}
    </div>
  );
}
