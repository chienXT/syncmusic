'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { MessageCircle, Send } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Panel } from '@/types/player';
import type { Message } from '@/types/message';
import type { User } from '@/types/user';

type ChatPanelProps = {
  activePanel: Panel;
  user: User | null;
  chatMessages: Message[];
  latestSys: Message | null;
  chatInput: string;
  setChatInput: (value: string) => void;
  handleSendChat: () => Promise<void> | void;
  isSendingChat: boolean;
};

const formatMessageTime = (value?: string | Date) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};

const ChatPanel = ({
  activePanel,
  user,
  chatMessages,
  latestSys,
  chatInput,
  setChatInput,
  handleSendChat,
  isSendingChat,
}: ChatPanelProps) => {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const canSend = chatInput.trim().length > 0 && !isSendingChat;

  useEffect(() => {
    if (activePanel !== 'chat') return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [activePanel, chatMessages.length, latestSys]);

  const sendMessage = () => {
    if (!canSend) return;
    handleSendChat();
  };

  if (activePanel !== 'chat') return null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <AnimatePresence>
        {latestSys && (
          <motion.div
            key={latestSys._id || latestSys.content}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="mx-3.5 mt-3 mb-1 shrink-0 rounded-2xl border border-[rgba(var(--ac1),0.16)] bg-[rgba(var(--ac1),0.08)] px-3 py-2 text-center shadow-sm"
          >
            <p className="text-[11px] leading-relaxed text-[rgba(var(--ac1),0.82)]">{latestSys.content}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0 space-y-3 overflow-y-auto px-3.5 py-3 scrollbar-none">
        <AnimatePresence initial={false}>
          {chatMessages.map((msg, index) => {
            const isOwn = msg.sender?._id === user?._id;
            const senderName = msg.sender?.username || 'User';
            const createdAt =
              (msg as Message & { createdAt?: string | Date }).createdAt ||
              (msg as Message & { timestamp?: string | Date }).timestamp;

            return (
              <motion.div
                key={msg._id || `${senderName}-${index}`}
                className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                transition={{ duration: 0.18 }}
              >
                {!isOwn && (
                  <div className="mb-1 flex items-center gap-2 px-2">
                    <span className="text-[10px] font-bold text-[rgba(var(--ac1),0.78)]">{senderName}</span>
                    {createdAt && <span className="text-[10px] text-white/30">{formatMessageTime(createdAt)}</span>}
                  </div>
                )}

                <div
                  className={`chat-bubble max-w-[82%] break-words leading-relaxed shadow-sm ${
                    isOwn ? 'chat-bubble-me' : 'chat-bubble-them'
                  }`}
                >
                  {msg.content}
                </div>

                {isOwn && createdAt && <span className="mt-1 px-2 text-[10px] text-white/30">{formatMessageTime(createdAt)}</span>}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {chatMessages.length === 0 && (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <MessageCircle size={28} className="text-white/25" />
            </div>
            <p className="text-sm font-semibold text-white/70">Chưa có tin nhắn</p>
            <p className="mt-1 max-w-[220px] text-xs text-white/35">Hãy gửi tin nhắn đầu tiên để bắt đầu trò chuyện trong phòng.</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="shrink-0 border-t border-white/[0.07] bg-black/[0.08] p-3 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <input
            className="input-field flex-1 !rounded-2xl !py-2.5 !text-sm placeholder:text-white/30"
            value={chatInput}
            onChange={(event) => setChatInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Nhắn tin..."
            aria-label="Nhập tin nhắn"
            disabled={isSendingChat}
          />

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            whileHover={canSend ? { scale: 1.04 } : undefined}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg shadow-purple-950/30 transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,rgb(var(--ac1)),rgb(var(--ac2)))' }}
            onClick={sendMessage}
            disabled={!canSend}
            aria-label="Gửi tin nhắn"
          >
            <Send size={15} />
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
