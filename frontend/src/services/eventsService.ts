import api from './api';
import type {
  Event,
  Club,
  RegisterEventResponse,
  EventRegistration,
  EventCreate,
  EventApprovalRequest,
  EventRejectRequest,
} from '../types';

export const eventsService = {
  // Fetch all events
  async getEvents(): Promise<Event[]> {
    const res = await api.get<Event[]>('/events');
    return res.data;
  },

  // Fetch event details by ID
  async getEventById(eventId: number): Promise<Event> {
    const res = await api.get<Event>(`/events/${eventId}`);
    return res.data;
  },

  // Fetch all clubs
  async getClubs(): Promise<Club[]> {
    const res = await api.get<Club[]>('/clubs');
    return res.data;
  },

  // Fetch student's own registered events (Source of truth)
  async getMyEvents(): Promise<EventRegistration[]> {
    const res = await api.get<EventRegistration[]>('/events/my');
    return res.data;
  },

  // Register for an event
  async registerForEvent(eventId: number): Promise<RegisterEventResponse> {
    const res = await api.post<RegisterEventResponse>(`/events/${eventId}/register`);
    return res.data;
  },

  // Create event (DRAFT status)
  async createEvent(payload: EventCreate): Promise<Event> {
    const res = await api.post<Event>('/events', payload);
    return res.data;
  },

  // Submit event for faculty approval
  async submitEvent(id: number): Promise<Event> {
    const res = await api.post<Event>(`/events/${id}/submit`);
    return res.data;
  },

  // Approve event (Faculty / Admin)
  async approveEvent(id: number, payload?: EventApprovalRequest): Promise<Event> {
    const res = await api.post<Event>(`/events/${id}/approve`, payload || { status: 'APPROVED' });
    return res.data;
  },

  // Reject event (Faculty / Admin)
  async rejectEvent(id: number, reason: string): Promise<Event> {
    const payload: EventRejectRequest = { reason };
    const res = await api.post<Event>(`/events/${id}/reject`, payload);
    return res.data;
  },

  // Resubmit rejected event
  async resubmitEvent(id: number): Promise<Event> {
    const res = await api.post<Event>(`/events/${id}/resubmit`);
    return res.data;
  },

  // Start event (Set status to ONGOING)
  async startEvent(id: number): Promise<Event> {
    const res = await api.post<Event>(`/events/${id}/start`);
    return res.data;
  },

  // Complete event (Set status to COMPLETED)
  async completeEvent(id: number): Promise<Event> {
    const res = await api.post<Event>(`/events/${id}/complete`);
    return res.data;
  },

  // Cancel event (Set status to CANCELLED)
  async cancelEvent(id: number): Promise<Event> {
    const res = await api.post<Event>(`/events/${id}/cancel`);
    return res.data;
  },
};

export default eventsService;
