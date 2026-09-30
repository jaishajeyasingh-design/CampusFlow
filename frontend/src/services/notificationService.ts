import api from './api';
import type { Notification, UnreadNotificationCount } from '../types';

export const notificationService = {
  // Get all notifications for authenticated user
  async getNotifications(): Promise<Notification[]> {
    const res = await api.get<Notification[]>('/notifications');
    return res.data;
  },

  // Get count of unread notifications
  async getUnreadNotificationCount(): Promise<UnreadNotificationCount> {
    const res = await api.get<UnreadNotificationCount>('/notifications/unread-count');
    return res.data;
  },

  // Mark a single notification as read
  async markNotificationRead(id: number): Promise<Notification> {
    const res = await api.patch<Notification>(`/notifications/${id}/read`);
    return res.data;
  },

  // Mark all notifications as read
  async markAllNotificationsRead(): Promise<{ message: string; updated_count: number }> {
    const res = await api.patch<{ message: string; updated_count: number }>('/notifications/read-all');
    return res.data;
  },
};

export default notificationService;
