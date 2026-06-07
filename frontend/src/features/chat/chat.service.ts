import { messageAPI } from '@/lib/api';

export const chatService = {
  getRoomMessages: (roomId: string, params?: any) => messageAPI.getRoomMessages(roomId, params),
  sendMessage: (roomId: string, data: { content: string; type?: string; replyTo?: string }) => messageAPI.sendMessage(roomId, data),
  editMessage: (messageId: string, content: string) => messageAPI.editMessage(messageId, content),
  deleteMessage: (messageId: string) => messageAPI.deleteMessage(messageId),
  addReaction: (messageId: string, emoji: string) => messageAPI.addReaction(messageId, emoji),
  removeReaction: (messageId: string, emoji: string) => messageAPI.removeReaction(messageId, emoji)
};
