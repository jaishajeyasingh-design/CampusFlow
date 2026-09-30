import api from './api';
import type { TimetableStructure, TimetableStructureCreate } from '../types';

export const timetableService = {
  // Get all timetable structures
  async getTimetableStructures(): Promise<TimetableStructure[]> {
    const res = await api.get<TimetableStructure[]>('/timetable/structures');
    return res.data;
  },

  // Create a new timetable structure (SUPER_ADMIN only)
  async createTimetableStructure(payload: TimetableStructureCreate): Promise<TimetableStructure> {
    const res = await api.post<TimetableStructure>('/timetable/structures', payload);
    return res.data;
  },

  // Update existing timetable structure (SUPER_ADMIN only)
  async updateTimetableStructure(id: number, payload: TimetableStructureCreate): Promise<TimetableStructure> {
    const res = await api.put<TimetableStructure>(`/timetable/structures/${id}`, payload);
    return res.data;
  },
};

export default timetableService;
