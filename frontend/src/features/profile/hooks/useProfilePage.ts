'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { userAPI } from '@/lib/api';
import type { ProfileUser, ProfileSong } from '@/features/profile/types/profile.types';

export function useProfilePage(userId: string) {
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const [profileUser, setProfileUser] = useState<ProfileUser | null>(null);
  const [recentSongs, setRecentSongs] = useState<ProfileSong[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // ---------- FETCH ----------
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await userAPI.getUser(userId);
        if (cancelled) return;
        const fetchedUser = response.data?.data?.user || null;
        setProfileUser(fetchedUser);
        setRecentSongs(Array.isArray(fetchedUser?.recentlyPlayed) ? fetchedUser.recentlyPlayed : []);
      } catch (err) {
        if (!cancelled) {
          setError('Không thể tải hồ sơ. Vui lòng thử lại.');
          console.error(err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // ---------- DERIVED VALUES ----------
  const roomIdentifier = profileUser?.currentRoom?.inviteCode || profileUser?.currentRoom?._id;
  const canJoinRoom = Boolean(profileUser?.currentRoom && profileUser.currentRoom.isActive !== false && roomIdentifier);
  const isOwnProfile = currentUser?._id === profileUser?._id;
  const totalFriends = profileUser?.friends?.length || 0;
  const totalLiked = profileUser?.likedSongs?.length || 0;
  const totalRecent = recentSongs?.length || 0;

  const memberSince = useMemo(() => {
    if (!profileUser?.createdAt) return '—';
    return new Date(profileUser.createdAt).toLocaleDateString('vi-VN', {
      month: 'long',
      year: 'numeric',
    });
  }, [profileUser?.createdAt]);

  return {
    profileUser,
    recentSongs,
    isLoading,
    error,
    memberSince,
    canJoinRoom,
    roomIdentifier,
    isOwnProfile,
    totalFriends,
    totalLiked,
    totalRecent,
  };
}
