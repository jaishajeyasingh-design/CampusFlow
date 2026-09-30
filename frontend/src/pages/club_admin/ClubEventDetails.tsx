import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventsService from '../../services/eventsService';
import { extractApiErrorMessage } from '../../services/api';
import type { Event } from '../../types';
import { 
  Calendar, Clock, MapPin, Shield, ArrowLeft, 
  Send, RotateCcw, AlertCircle, Info 
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

export const ClubEventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const eventId = Number(id);

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchEventDetails = React.useCallback(async () => {
    if (isNaN(eventId)) {
      setError('Invalid event ID.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await eventsService.getEventById(eventId);
      setEvent(res);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to fetch event details.'));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchEventDetails();
  }, [fetchEventDetails]);

  const handleSubmitForApproval = async () => {
    if (!event) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await eventsService.submitEvent(event.id);
      setEvent(updated);
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Failed to submit event for faculty approval.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResubmit = async () => {
    if (!event) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const updated = await eventsService.resubmitEvent(event.id);
      setEvent(updated);
    } catch (err) {
      setActionError(extractApiErrorMessage(err, 'Failed to resubmit event for faculty approval.'));
    } finally {
      setActionLoading(false);
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
    return <LoadingState message="Loading event proposal details..." rows={5} type="skeleton" />;
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link
          to="/club-admin/events"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Club Events</span>
        </Link>
        <ErrorState
          title="Event Details Unavailable"
          message={error || 'Event not found.'}
          onRetry={fetchEventDetails}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/club-admin/events"
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Club Events</span>
        </Link>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Current Lifecycle Status:</span>
          <StatusBadge status={event.status} />
        </div>
      </div>

      {actionError && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Main Info Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            {event.category || 'General'}
          </span>
          {event.club && (
            <span className="text-xs text-slate-500 flex items-center space-x-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              <span>{event.club.name}</span>
            </span>
          )}
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{event.title}</h1>

        {event.description && (
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-2 border-t border-slate-100">
            {event.description}
          </div>
        )}

        {/* Schedule & Location Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-3 border-t border-slate-100">
          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>Event Date</span>
            </span>
            <p className="font-semibold text-slate-900">{formatDate(event.start_time)}</p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[11px] font-medium text-slate-500 uppercase flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Timing Window</span>
            </span>
            <p className="font-semibold text-slate-900">
              {formatTime(event.start_time)} – {formatTime(event.end_time)}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 sm:col-span-2">
            <span className="text-[11px] font-medium text-slate-500 uppercase flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600" />
              <span>Venue & Seating Capacity</span>
            </span>
            <p className="font-semibold text-slate-900">
              {event.venue} (Max Capacity: {event.capacity} seats)
            </p>
          </div>
        </div>

        {/* Faculty Remark if REJECTED or APPROVED */}
        {event.faculty_remark && (
          <div className={`p-4 rounded-xl border space-y-1 text-xs ${
            event.status === 'REJECTED' 
              ? 'bg-rose-50 border-rose-200 text-rose-900' 
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center space-x-1.5 font-bold">
              <Info className="w-4 h-4 shrink-0" />
              <span>Faculty Coordinator Remark:</span>
            </div>
            <p className="pl-5 text-[11px] leading-relaxed">{event.faculty_remark}</p>
          </div>
        )}

        {/* Action Panel Based on Lifecycle Status */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {event.status === 'DRAFT' && 'This event is currently in DRAFT mode and visible only to Club Admins.'}
            {event.status === 'PENDING_FACULTY_APPROVAL' && 'Awaiting review and approval by the assigned Faculty Coordinator.'}
            {event.status === 'APPROVED' && 'This event has been approved and published for student registration.'}
            {event.status === 'REJECTED' && 'This proposal was rejected by the faculty coordinator. Revise details and resubmit.'}
          </div>

          <div>
            {event.status === 'DRAFT' && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Send className="w-4 h-4" />}
                isLoading={actionLoading}
                onClick={handleSubmitForApproval}
              >
                Submit for Approval
              </Button>
            )}

            {event.status === 'REJECTED' && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<RotateCcw className="w-4 h-4" />}
                isLoading={actionLoading}
                onClick={handleResubmit}
              >
                Resubmit Proposal
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClubEventDetails;
