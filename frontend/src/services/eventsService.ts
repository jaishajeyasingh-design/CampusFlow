import api from './api';
import type { Event, Club, RegisterEventResponse, EventRegistration } from '../types';

const REG_STORAGE_KEY_PREFIX = 'campusflow_student_registrations_';

export const eventsService = {
  // Fetch all events (Backend automatically restricts to APPROVED events when user is STUDENT)
  async getEvents(): Promise<Event[]> {
    const res = await api.get<Event[]>('/events');
    return res.data;
  },

  // Fetch all clubs to correlate event club details
  async getClubs(): Promise<Club[]> {
    const res = await api.get<Club[]>('/clubs');
    return res.data;
  },

  // Find a specific event by ID by querying events and correlating with club info
  async getEventById(eventId: number): Promise<{ event: Event; club?: Club } | null> {
    const [events, clubs] = await Promise.all([
      this.getEvents(),
      this.getClubs(),
    ]);

    const event = events.find((e) => e.id === eventId);
    if (!event) return null;

    const club = clubs.find((c) => c.id === event.club_id);
    return { event: { ...event, club }, club };
  },

  // Register the authenticated student for an event using real backend endpoint
  async registerForEvent(eventId: number): Promise<RegisterEventResponse> {
    const res = await api.post<RegisterEventResponse>(`/events/${eventId}/register`);
    return res.data;
  },

  // Session/Local registration tracking (since GET /api/events/my is not yet implemented on backend)
  getSessionRegistrations(studentId: number): EventRegistration[] {
    try {
      const data = localStorage.getItem(`${REG_STORAGE_KEY_PREFIX}${studentId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSessionRegistration(studentId: number, reg: EventRegistration): void {
    try {
      const existing = this.getSessionRegistrations(studentId);
      const updated = existing.filter((item) => item.event_id !== reg.event_id);
      updated.push(reg);
      localStorage.setItem(`${REG_STORAGE_KEY_PREFIX}${studentId}`, JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save session registration:', err);
    }
  },

  isRegisteredLocally(studentId: number, eventId: number): boolean {
    const regs = this.getSessionRegistrations(studentId);
    return regs.some((r) => r.event_id === eventId);
  },
};

export default eventsService;
