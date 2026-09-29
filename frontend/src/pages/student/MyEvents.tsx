import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import type { Event, Club, EventRegistration } from '../../types';
import { 
  Calendar, CheckCircle2, Clock, MapPin, 
  Shield, QrCode, ArrowRight, AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';


export const MyEvents: React.FC = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Ticket viewing modal
  const [selectedTicket, setSelectedTicket] = useState<{
    registration: EventRegistration;
    event?: Event;
    club?: Club;
  } | null>(null);

  const loadMyEvents = React.useCallback(async () => {
    if (!user) return;
    try {

      const [fetchedEvents, fetchedClubs] = await Promise.all([
        eventsService.getEvents(),
        eventsService.getClubs(),
      ]);
      setEvents(fetchedEvents);
      setClubs(fetchedClubs);

      // Load session-persisted registrations from real POST calls
      const sessionRegs = eventsService.getSessionRegistrations(user.id);
      setRegistrations(sessionRegs);
    } catch (err: any) {
      console.error('Failed to load registered events:', err);
      setError(err.response?.data?.detail || 'Unable to retrieve event registration records.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMyEvents();
  }, [loadMyEvents]);


  if (!user) return null;

  const eventMap = new Map(events.map((e) => [e.id, e]));
  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  const formatTime = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      return new Date(isoStr).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">My Registered Events</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View your event registrations, entry verification QR passes, and check-in statuses.
          </p>
        </div>
        <Link
          to="/student/events"
          className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium shadow-xs transition-all flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Browse More Events</span>
        </Link>
      </div>

      {/* Backend API Notice */}
      <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start space-x-3 text-xs text-amber-800">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-amber-900">Backend Endpoint Notice: `GET /api/events/my` Pending</p>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            The backend team has not implemented a persistent `GET /api/events/my` registration listing endpoint yet. 
            Registrations completed in this active session (via the real backend POST /api/events/:event_id/register endpoint) are displayed below with their database registration ID and QR code.
          </p>
        </div>
      </div>


      {/* Loading & Error States */}
      {loading && <LoadingState message="Loading your event registrations..." rows={3} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load registrations"
          message={error}
          onRetry={() => {
            setLoading(true);
            loadMyEvents();
          }}
        />
      )}

      {/* Empty State */}
      {!loading && !error && registrations.length === 0 && (
        <EmptyState
          title="No Event Registrations Found"
          description="You haven't registered for any campus events yet. Explore open approved events and claim your ticket."
          action={{
            label: 'Discover Events',
            onClick: () => window.location.assign('/student/events'),
            icon: <Calendar className="w-3.5 h-3.5" />,
          }}
        />
      )}

      {/* Registrations List */}
      {!loading && !error && registrations.length > 0 && (
        <div className="space-y-3">
          {registrations.map((reg) => {
            const ev = eventMap.get(reg.event_id) || reg.event;
            const club = ev ? clubMap.get(ev.club_id) : undefined;

            return (
              <div
                key={reg.id || reg.event_id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{reg.status || 'REGISTERED'}</span>
                    </span>
                    {ev?.category && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {ev.category}
                      </span>
                    )}
                    {club && (
                      <span className="text-[11px] text-slate-500 flex items-center space-x-1 font-medium">
                        <Shield className="w-3 h-3 text-blue-600" />
                        <span>{club.name}</span>
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">
                    {ev?.title || `Event #${reg.event_id}`}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
                    {ev?.start_time && (
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(ev.start_time)}</span>
                      </span>
                    )}
                    {ev?.start_time && ev?.end_time && (
                      <span className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatTime(ev.start_time)} - {formatTime(ev.end_time)}</span>
                      </span>
                    )}
                    {ev?.venue && (
                      <span className="flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{ev.venue}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<QrCode className="w-3.5 h-3.5 text-blue-600" />}
                    onClick={() => setSelectedTicket({ registration: reg, event: ev, club })}
                  >
                    View Ticket Pass
                  </Button>

                  <Link
                    to={`/student/events/${reg.event_id}`}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors flex items-center space-x-1"
                  >
                    <span>Event Details</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Pass Modal */}
      {selectedTicket && (
        <Modal
          isOpen={true}
          title="Campus Event Digital Pass"
          description="Present this QR code verification token at the event venue for attendance."
          onClose={() => setSelectedTicket(null)}
          footer={
            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedTicket(null)}
            >
              Close Pass
            </Button>
          }
        >
          <div className="space-y-4 text-center py-2">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center mx-auto shadow-xs">
                <QrCode className="w-5 h-5" />
              </div>

              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {selectedTicket.event?.title || `Event #${selectedTicket.registration.event_id}`}
                </h4>
                {selectedTicket.club && (
                  <p className="text-xs text-slate-500 mt-0.5">{selectedTicket.club.name}</p>
                )}
              </div>

              <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5 text-left text-xs">
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Attendee:</span>
                  <span className="font-semibold text-slate-800">{user.full_name}</span>
                </div>
                {user.ra_number && (
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>RA Number:</span>
                    <span className="font-mono text-slate-800">{user.ra_number}</span>
                  </div>
                )}
                {selectedTicket.event?.venue && (
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>Venue:</span>
                    <span className="text-slate-800 truncate">{selectedTicket.event.venue}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-slate-500 text-[11px]">
                  <span>Registration Status:</span>
                  <span className="text-emerald-700 font-semibold">{selectedTicket.registration.status}</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-center space-y-1">
                <span className="text-[10px] font-semibold uppercase text-blue-700 tracking-wider">
                  Verification Token
                </span>
                <p className="font-mono text-xs font-bold text-blue-900 select-all">
                  {selectedTicket.registration.qr_code || `QR-EVT${selectedTicket.registration.event_id}-STD${user.id}`}
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default MyEvents;
