'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Crown, UserCircle2, Users, X } from 'lucide-react';
import type { Room } from '@/types/room';
import type { User } from '@/types/user';

type ParticipantsModalProps = {
  isOpen: boolean;
  currentRoom: Room | null;
  user: User | null;
  onClose: () => void;
};

const getUserId = (value: any) => value?._id?.toString?.() || value?.toString?.() || '';
const getInitial = (name?: string) => name?.charAt(0)?.toUpperCase() || '?';

const ParticipantsModal = ({ isOpen, currentRoom, user, onClose }: ParticipantsModalProps) => {
  const hostId = getUserId(currentRoom?.host);
  const currentUserId = getUserId(user);
  const guests = currentRoom?.participants?.reduce((acc: any[], participant) => {
    const uid = getUserId(participant.user);
    if (!uid || uid === hostId) return acc;
    if (acc.some((item) => getUserId(item.user) === uid)) return acc;
    return [...acc, participant];
  }, []) || [];
  const participantCount = guests.length + (currentRoom?.host ? 1 : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[rgba(var(--surf-1),0.96)] shadow-[0_30px_120px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-purple-500/20 blur-[80px]" />
              <div className="absolute -bottom-24 right-0 h-44 w-44 rounded-full bg-pink-500/15 blur-[80px]" />
            </div>

            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06]">
                    <Users size={18} className="text-[rgb(var(--ac1))]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Thành viên phòng</p>
                    <p className="text-xs text-white/45">{participantCount} người đang trong phòng</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/60 transition hover:bg-white/[0.09] hover:text-white"
                  onClick={onClose}
                  aria-label="Đóng danh sách thành viên"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4 scrollbar-none">
                {currentRoom?.host && (
                  <div className="flex items-center gap-3 rounded-2xl border border-[rgba(var(--ac1),0.18)] bg-[rgba(var(--ac1),0.09)] p-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-black text-white shadow-lg shadow-purple-950/30" style={{ background: 'linear-gradient(135deg,rgb(var(--ac1)),rgb(var(--ac2)))' }}>
                      {getInitial(currentRoom.host.username)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-white">{currentRoom.host.username || 'Host'}{hostId === currentUserId ? ' (bạn)' : ''}</p>
                        <Crown size={14} className="shrink-0 text-[rgb(var(--gold))]" />
                      </div>
                      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[rgb(var(--ac1))]">Host</p>
                    </div>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[rgb(var(--ok))] shadow-[0_0_12px_rgba(var(--ok),0.7)]" />
                  </div>
                )}

                {guests.map((participant: any, index: number) => {
                  const uid = getUserId(participant.user);
                  const username = participant.user?.username || 'User';
                  const online = participant.user?.status !== 'offline';
                  const isMe = uid === currentUserId;

                  return (
                    <motion.div
                      key={uid || index}
                      className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.045] p-3 transition hover:border-white/[0.12] hover:bg-white/[0.07]"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.025, 0.16) }}
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] text-sm font-black text-white/80">
                        {getInitial(username)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{username}{isMe ? ' (bạn)' : ''}</p>
                        <p className={`mt-0.5 text-[11px] ${online ? 'text-green-400/80' : 'text-red-400/70'}`}>{online ? 'Online' : 'Offline'}</p>
                      </div>
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'bg-[rgb(var(--ok))] shadow-[0_0_12px_rgba(var(--ok),0.6)]' : 'bg-[rgb(var(--err))]'}`} />
                    </motion.div>
                  );
                })}

                {!currentRoom?.host && guests.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <UserCircle2 size={42} className="mb-3 text-white/20" />
                    <p className="text-sm font-semibold text-white/60">Chưa có thành viên</p>
                    <p className="mt-1 text-xs text-white/35">Danh sách người tham gia sẽ hiển thị tại đây.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ParticipantsModal;
