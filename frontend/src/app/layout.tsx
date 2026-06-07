import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { DM_Mono, JetBrains_Mono, Sora, Syne } from 'next/font/google';

import AuthProvider from '@/features/auth/AuthProvider';
import PlaybackManager from '@/features/player/components/PlaybackManager';
import MiniRoomOverlay from '@/features/room/components/MiniRoomOverlay';
import QueryProvider from '@/providers/QueryProvider';

import './globals.css';
import './app-shell.css';

const sora = Sora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sora',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const syne = Syne({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-syne',
  weight: ['400', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  weight: ['400', '500', '600'],
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-mono',
  weight: ['300', '400'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://syncmusic.live'),
  title: {
    default: 'SyncMusic Live — Nghe nhạc cùng bạn bè theo phòng',
    template: '%s | SyncMusic Live',
  },
  description:
    'Nghe nhạc live cùng bạn bè, đồng bộ player realtime, chat trong phòng và khám phá các không gian âm nhạc theo sở thích.',
  applicationName: 'SyncMusic Live',
  authors: [{ name: 'SyncMusic Live' }],
  creator: 'SyncMusic Live',
  publisher: 'SyncMusic Live',
  alternates: {
    canonical: '/',
  },
  keywords: [
    'nghe nhạc cùng bạn bè',
    'phòng nhạc live',
    'đồng bộ nhạc realtime',
    'music social app',
    'syncmusic live',
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    title: 'SyncMusic Live — Nghe nhạc cùng bạn bè theo phòng',
    description:
      'Khám phá phòng nhạc live, đồng bộ phát nhạc theo thời gian thực và chia sẻ trải nghiệm âm nhạc với cộng đồng.',
    url: 'https://syncmusic.live',
    siteName: 'SyncMusic Live',
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SyncMusic Live — Nghe nhạc cùng bạn bè theo phòng',
    description:
      'Nghe nhạc live, chat trong phòng và kết nối cùng cộng đồng yêu nhạc.',
  },
};

import { ToastContainer } from '@/components/ui/Toast';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${sora.variable} ${syne.variable} ${jetbrainsMono.variable} ${dmMono.variable} min-h-dvh overflow-x-hidden bg-[rgb(var(--base))] text-white antialiased smooth-transition font-sora`}
      >
        <a href="#main-content" className="skip-to-content">
          Bỏ qua điều hướng
        </a>

        <QueryProvider>
          <AuthProvider>
            {children}
            <PlaybackManager />
            <MiniRoomOverlay />
            <ToastContainer />
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
