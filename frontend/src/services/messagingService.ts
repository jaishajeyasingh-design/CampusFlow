import api from './api';
import type { Message, MessageCreate, UnreadMessageCount } from '../types';

export const messagingService = {
  // Send a contextual message
  async sendMessage(payload: MessageCreate): Promise<Message> {
    const res = await api.post<Message>('/messages', payload);
    return res.data;
  },

  // Get messages involving current user, optionally filtered by context
  async getMessages(params?: { context_type?: string; context_id?: number }): Promise<Message[]> {
    const res = await api.get<Message[]>('/messages', { params });
    return res.data;
  },

  // Get unread message count
  async getUnreadMessageCount(): Promise<UnreadMessageCount> {
    const res = await api.get<UnreadMessageCount>('/messages/unread-count');
    return res.data;
  },

  // Get thread messages for specific context (EVENT or OD_REQUEST)
  async getContextMessages(contextType: 'EVENT' | 'OD_REQUEST' | string, contextId: number): Promise<Message[]> {
    const res = await api.get<Message[]>(`/messages/context/${contextType}/${contextId}`);
    return res.data;
  },

  // Mark single message as read
  async markMessageRead(id: number): Promise<Message> {
    const res = await api.patch<Message>(`/messages/${id}/read`);
    return res.data;
  },

  // Mark all unread messages as read
  async markAllMessagesRead(): Promise<{ message: string; updated_count: number }> {
    const res = await api.patch<{ message: string; updated_count: number }>('/messages/read-all');
    return res.data;
  },
};

export default messagingService;
