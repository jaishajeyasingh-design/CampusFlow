import api from './api';
import type { AttendanceMarkRequest, AttendanceMarkResponse } from '../types';

export const attendanceService = {
  // Mark attendance for a student at an event
  async markAttendance(payload: AttendanceMarkRequest): Promise<AttendanceMarkResponse> {
    const res = await api.post<AttendanceMarkResponse>('/attendance/mark', payload);
    return res.data;
  },
};

export default attendanceService;
