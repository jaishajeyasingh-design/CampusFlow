import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import type { Event, Club, EventRegistration } from '../../types';
import { 
  Calendar, MapPin, Clock, Search, Shield, Users, 
  CheckCircle2, ArrowRight, QrCode
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

export const DiscoverEvents: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedClub, setSelectedClub] = useState<string>('ALL');

  // Registration modal states
  const [registeringEvent, setRegisteringEvent] = useState<Event | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regSuccessModal, setRegSuccessModal] = useState<{
    isOpen: boolean;
    event?: Event;
    registrationId?: number;
    qrCode?: string;
  }>({ isOpen: false });
  const [regError, setRegError] = useState<string | null>(null);

  const loadEvents = React.useCallback(async () => {
    try {


      const [fetchedEvents, fetchedClubs] = await Promise.all([
        eventsService.getEvents(),
        eventsService.getClubs(),
      ]);

      // Strict enforcement: Only APPROVED events
      const approvedOnly = fetchedEvents.filter((e) => e.status === 'APPROVED');
      setEvents(approvedOnly);
      setClubs(fetchedClubs);

      if (user) {
        const myRegs = await eventsService.getMyEvents();
        setRegistrations(myRegs);
      }
    } catch (err: any) {
      console.error('Failed to load discover events:', err);
      setError(err.response?.data?.detail || 'Unable to retrieve campus events.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);


  const handleRegisterConfirm = async () => {
    if (!registeringEvent || !user) return;
    setIsSubmitting(true);
    setRegError(null);
    try {
      const result = await eventsService.registerForEvent(registeringEvent.id);

      const updatedRegs = await eventsService.getMyEvents();
      setRegistrations(updatedRegs);

      const eventRef = registeringEvent;
      setRegisteringEvent(null);
      setRegSuccessModal({
        isOpen: true,
        event: eventRef,
        registrationId: result.registration_id,
        qrCode: result.qr_code,
      });
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to complete registration.';
      setRegError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clubMap = new Map(clubs.map((c) => [c.id, c]));

  // Extract unique categories
  const categories = ['ALL', ...Array.from(new Set(events.map((e) => e.category).filter(Boolean)))];

  // Filtered events
  const filteredEvents = events.filter((e) => {
    const matchesSearch = 
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      e.venue.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesClub = selectedClub === 'ALL' || String(e.club_id) === selectedClub;

    return matchesSearch && matchesCategory && matchesClub;
  });

  const formatDate = (isoStr: string) => {
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

  const formatTime = (isoStr: string) => {
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Discover Campus Events</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Browse verified and approved university club workshops, bootcamps, and competitions.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link
            to="/student/registrations"
            className="px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200 shadow-xs transition-all flex items-center space-x-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
            <span>My Registered Events ({registrations.length})</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, or venue..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Categories</option>
              {categories.filter((c) => c !== 'ALL').map((cat) => (
                <option key={cat} value={cat as string}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Club Filter */}
          <div>
            <select
              value={selectedClub}
              onChange={(e) => setSelectedClub(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs focus:outline-none focus:border-blue-600"
            >
              <option value="ALL">All Clubs</option>
              {clubs.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Registration Error Banner */}
      {regError && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center justify-between">
          <span>{regError}</span>
          <button 
            type="button" 
            onClick={() => setRegError(null)} 
            className="text-rose-500 hover:text-rose-800 text-xs font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Loading & Error States */}
      {loading && <LoadingState message="Fetching campus events..." rows={4} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load events"
          message={error}
          onRetry={() => {
            setLoading(true);
            loadEvents();
          }}
        />
      )}


      {/* Events List */}
      {!loading && !error && filteredEvents.length === 0 && (
        <EmptyState
          title="No Approved Events Found"
          description={
            searchQuery || selectedCategory !== 'ALL' || selectedClub !== 'ALL'
              ? 'Try adjusting your search criteria or filters.'
              : 'There are currently no approved campus events open for student registration.'
          }
        />
      )}

      {!loading && !error && filteredEvents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((event) => {
            const club = clubMap.get(event.club_id);
            const isRegistered = registrations.some((r) => r.event_id === event.id);

            return (
              <div
                key={event.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between p-5 space-y-4"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {event.category || 'General'}
                    </span>
                    <StatusBadge status={event.status} />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {event.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-1 font-medium">
                      <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{club?.name || `Club #${event.club_id}`}</span>
                    </p>
                  </div>

                  {event.description && (
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {event.description}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatDate(event.start_time)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{formatTime(event.start_time)} - {formatTime(event.end_time)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>Capacity: {event.capacity} seats</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Link
                    to={`/student/events/${event.id}`}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center space-x-1"
                  >
                    <span>Details</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>

                  {isRegistered ? (
                    <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Registered</span>
                    </span>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setRegisteringEvent(event)}
                    >
                      Register Now
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Registration Confirmation Dialog */}
      {registeringEvent && (
        <ConfirmDialog
          isOpen={true}
          title={`Register for ${registeringEvent.title}`}
          message={`Are you sure you want to register for this event? Your registered ticket QR token will be generated on the server.`}
          confirmText="Confirm Registration"
          cancelText="Cancel"
          variant="primary"
          isLoading={isSubmitting}
          onClose={() => setRegisteringEvent(null)}
          onConfirm={handleRegisterConfirm}
        />
      )}

      {/* Registration Success Ticket Modal */}
      {regSuccessModal.isOpen && regSuccessModal.event && (
        <Modal
          isOpen={true}
          title="Registration Successful!"
          description="Your registration has been recorded on the backend database."
          onClose={() => setRegSuccessModal({ isOpen: false })}
          footer={
            <div className="flex items-center justify-between w-full">
              <Link
                to="/student/registrations"
                className="text-xs font-semibold text-blue-600 hover:underline"
              >
                View in My Registrations
              </Link>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setRegSuccessModal({ isOpen: false })}
              >
                Done
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm">{regSuccessModal.event.title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">Venue: {regSuccessModal.event.venue}</p>
            </div>

            {/* QR Pass Box */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-center space-x-1.5 text-xs font-semibold text-slate-700">
                <QrCode className="w-4 h-4 text-blue-600" />
                <span>Ticket Verification Token</span>
              </div>
              <p className="font-mono text-xs font-bold text-blue-700 bg-white p-2 rounded border border-slate-200 select-all">
                {regSuccessModal.qrCode}
              </p>
              <p className="text-[10px] text-slate-400">
                Registration ID: #{regSuccessModal.registrationId}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default DiscoverEvents;
