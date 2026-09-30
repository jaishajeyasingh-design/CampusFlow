import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import eventsService from '../../services/eventsService';
import type { Event, Club, EventRegistration } from '../../types';
import { 
  Calendar, Clock, MapPin, Shield, 
  CheckCircle2, ArrowLeft, QrCode, Info
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';


export const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [club, setClub] = useState<Club | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regError, setRegError] = useState<string | null>(null);
  const [existingReg, setExistingReg] = useState<EventRegistration | null>(null);

  const eventId = Number(id);

  const loadEventDetails = React.useCallback(async () => {
    if (isNaN(eventId)) {
      setError('Invalid event identifier.');
      setLoading(false);
      return;
    }

    try {

      const result = await eventsService.getEventById(eventId);
      if (!result) {
        setError('Event not found or not currently available.');
        setLoading(false);
        return;
      }
      setEvent(result);
      if (result.club) {
        setClub(result.club);
      }

      if (user) {
        const regs = await eventsService.getMyEvents();
        const match = regs.find((r) => r.event_id === eventId);
        setExistingReg(match || null);
      }
    } catch (err: any) {
      console.error('Failed to load event details:', err);
      setError(err.response?.data?.detail || 'Unable to fetch event details.');
    } finally {
      setLoading(false);
    }
  }, [eventId, user]);

  useEffect(() => {
    loadEventDetails();
  }, [loadEventDetails]);


  const handleRegister = async () => {
    if (!event || !user) return;
    setIsRegistering(true);
    setRegError(null);
    setRegSuccess(null);
    try {
      const res = await eventsService.registerForEvent(event.id);
      
      const regs = await eventsService.getMyEvents();
      const match = regs.find((r) => r.event_id === event.id);
      setExistingReg(match || null);
      setRegSuccess(`Registration confirmed! Your QR code token is: ${res.qr_code}`);
    } catch (err: any) {
      setRegError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setIsRegistering(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
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

  if (loading) {
    return <LoadingState message="Loading event details..." rows={5} type="skeleton" />;
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link
          to="/student/events"
          className="inline-flex items-center space-x-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Discover Events</span>
        </Link>
        <ErrorState
          title="Event Unavailable"
          message={error || 'The requested event could not be found.'}
          onRetry={() => {
            setLoading(true);
            loadEventDetails();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/student/events"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </Link>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Lifecycle Status:</span>
          <StatusBadge status={event.status} />
        </div>
      </div>

      {/* Main Two-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Event Information & Description (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {event.category || 'General'}
              </span>
              {club && (
                <span className="text-xs text-slate-500 flex items-center space-x-1.5 font-medium">
                  <Shield className="w-3.5 h-3.5 text-blue-600" />
                  <span>{club.name}</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {event.title}
            </h1>

            {club?.description && (
              <p className="text-xs text-slate-500 italic">
                Organized by {club.name} — {club.description}
              </p>
            )}
          </div>

          {/* Description Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              About This Event
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed space-y-2 whitespace-pre-line">
              {event.description || 'No detailed description provided by the club coordinator.'}
            </div>
          </div>

          {/* Event Lifecycle & Remarks */}
          {event.faculty_remark && (
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-1 text-xs">
              <div className="flex items-center space-x-1.5 text-amber-800 font-semibold">
                <Info className="w-4 h-4 text-amber-700" />
                <span>Faculty Review Note</span>
              </div>
              <p className="text-amber-900 text-[11px] leading-relaxed pl-5">
                {event.faculty_remark}
              </p>
            </div>
          )}

          {/* Event Schedule & Venue Details Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Location & Schedule
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase flex items-center space-x-1.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Date</span>
                </span>
                <p className="font-semibold text-slate-900">{formatDate(event.start_time)}</p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  <span>Time</span>
                </span>
                <p className="font-semibold text-slate-900">
                  {formatTime(event.start_time)} – {formatTime(event.end_time)}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
                <span className="text-[11px] font-medium text-slate-500 uppercase flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  <span>Venue</span>
                </span>
                <p className="font-semibold text-slate-900">{event.venue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Registration Panel (1 col) */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 sticky top-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Registration</h3>
              <StatusBadge status={existingReg ? 'APPROVED' : event.status} label={existingReg ? 'Registered' : undefined} />
            </div>

            {/* Capacity Counter */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Participant Capacity</span>
                <span className="font-bold text-slate-900">{event.capacity} Max</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full" style={{ width: '45%' }}></div>
              </div>
              <p className="text-[10px] text-slate-400">Open enrollment for active students</p>
            </div>

            {/* Registration Feedback */}
            {regError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {regError}
              </div>
            )}

            {regSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium space-y-1">
                <p className="font-semibold">{regSuccess}</p>
              </div>
            )}

            {/* Registration Action */}
            {existingReg ? (
              <div className="space-y-3 pt-2">
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                  <p className="text-xs font-bold text-emerald-800">You are Registered!</p>
                  {existingReg.qr_code && (
                    <div className="bg-white p-2.5 rounded border border-emerald-200 text-left space-y-1">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold flex items-center space-x-1">
                        <QrCode className="w-3 h-3 text-blue-600" />
                        <span>Pass Token:</span>
                      </span>
                      <p className="font-mono text-xs font-bold text-slate-800 select-all truncate">
                        {existingReg.qr_code}
                      </p>
                    </div>
                  )}
                </div>

                <Link
                  to="/student/registrations"
                  className="block w-full text-center py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  View All Registrations
                </Link>
              </div>
            ) : event.status === 'APPROVED' ? (
              <div className="space-y-3 pt-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={isRegistering}
                  onClick={handleRegister}
                >
                  Register for Event
                </Button>
                <p className="text-[10px] text-slate-400 text-center">
                  Registration token will be recorded under your student account.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 text-center">
                Registration is closed. Status is {event.status}.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;
