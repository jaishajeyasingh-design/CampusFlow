import api from './api';
import type { Badge, StudentBadge } from '../types';

export const badgeService = {
  // Get all available badge definitions in CampusFlow
  async getAllBadges(): Promise<Badge[]> {
    const res = await api.get<Badge[]>('/badges');
    return res.data;
  },

  // Get badges awarded to current authenticated student
  async getMyBadges(): Promise<StudentBadge[]> {
    const res = await api.get<StudentBadge[]>('/badges/my');
    return res.data;
  },
};

export default badgeService;
