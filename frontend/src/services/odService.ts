import api from './api';
import type { ODRequest, ODRequestCreate, ODApprovalRequest } from '../types';

export const odService = {
  // Get all OD requests for authenticated user (Student sees own, Faculty sees assigned, Admin sees all)
  async getODRequests(): Promise<ODRequest[]> {
    const res = await api.get<ODRequest[]>('/od-requests');
    return res.data;
  },

  // Get specific OD request by ID
  async getODRequestById(id: number): Promise<ODRequest> {
    const res = await api.get<ODRequest>(`/od-requests/${id}`);
    return res.data;
  },

  // Create a new OD request
  async createODRequest(payload: ODRequestCreate): Promise<ODRequest> {
    const res = await api.post<ODRequest>('/od-requests', payload);
    return res.data;
  },

  // Approve an OD request (Faculty/Admin)
  async approveODRequest(id: number, remark?: string): Promise<ODRequest> {
    const payload: ODApprovalRequest = {
      status: 'APPROVED',
      mentor_remark: remark,
    };
    const res = await api.post<ODRequest>(`/od-requests/${id}/approve`, payload);
    return res.data;
  },

  // Reject an OD request (Faculty/Admin)
  async rejectODRequest(id: number, remark?: string): Promise<ODRequest> {
    const payload: ODApprovalRequest = {
      status: 'REJECTED',
      mentor_remark: remark,
    };
    const res = await api.post<ODRequest>(`/od-requests/${id}/approve`, payload);
    return res.data;
  },
};

export default odService;
