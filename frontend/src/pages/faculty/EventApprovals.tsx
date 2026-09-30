import React, { useState, useEffect } from 'react';
import eventsService from '../../services/eventsService';
import type { Event } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

import { 
  CheckCircle2, XCircle, Calendar, MapPin, 
  Tag, Users, AlertCircle, MessageSquare
} from 'lucide-react';

export const EventApprovals: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter tab state
  const [activeTab, setActiveTab] = useState<string>('pending');

  // Modal State for Event Rejection
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Loading state for approval action
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventsService.getEvents();
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to fetch events for approval:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch events from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleApprove = async (eventId: number) => {
    setApprovingId(eventId);
    setActionSuccess(null);
    setError(null);
    try {
      await eventsService.approveEvent(eventId, { status: 'APPROVED' });
      setActionSuccess(`Event #${eventId} has been successfully APPROVED.`);
      await fetchEvents();
    } catch (err: any) {
      console.error('Failed to approve event:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to approve event.';
      if (err?.response?.status === 403) {
        setError(`Authorization Error (403): ${msg}`);
      } else {
        setError(msg);
      }
    } fontout: {
      setApprovingId(null);
    }
  };

  const handleOpenRejectModal = (eventId: number) => {
    setSelectedEventId(eventId);
    setRejectionReason('');
    setModalError(null);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedEventId) return;
    const trimmedReason = rejectionReason.trim();
    if (!trimmedReason) {
      setModalError('A rejection reason is mandatory. Please provide a clear explanation.');
      return;
    }

    setRejecting(true);
    setModalError(null);
    try {
      await eventsService.rejectEvent(selectedEventId, trimmedReason);
      setRejectModalOpen(false);
      setActionSuccess(`Event #${selectedEventId} has been REJECTED.`);
      await fetchEvents();
    } catch (err: any) {
      console.error('Failed to reject event:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to reject event.';
      setModalError(msg);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading events pending faculty approval..." />;
  }

  if (error && events.length === 0) {
    return (
      <ErrorState
        title="Event Approvals Error"
        message={error}
        onRetry={fetchEvents}
      />
    );
  }

  // Filter logic
  const pendingEvents = events.filter((e) => e.status === 'PENDING_FACULTY_APPROVAL');
  const approvedEvents = events.filter((e) => e.status === 'APPROVED');
  const rejectedEvents = events.filter((e) => e.status === 'REJECTED');

  const getFilteredEvents = () => {
    switch (activeTab) {
      case 'pending':
        return pendingEvents;
      case 'approved':
        return approvedEvents;
      case 'rejected':
        return rejectedEvents;
      case 'all':
      default:
        return events;
    }
  };

  const filteredEvents = getFilteredEvents();

  const tabItems = [
    { id: 'pending', label: 'Pending Approval', count: pendingEvents.length },
    { id: 'approved', label: 'Approved', count: approvedEvents.length },
    { id: 'rejected', label: 'Rejected', count: rejectedEvents.length },
    { id: 'all', label: 'All Events', count: events.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              FACULTY APPROVAL WORKFLOW
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Event Approvals Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Review event proposals submitted by Club Admins. Examine event schedule, venue, capacity, and details before granting approval or returning with feedback.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-800">
              {pendingEvents.length} Pending Action
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button 
            onClick={() => setActionSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button 
            onClick={() => setError(null)}
            className="text-rose-700 hover:text-rose-900 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Tabs Filter */}
      <Tabs
        tabs={tabItems}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* Events List */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No events found"
          description={
            activeTab === 'pending'
              ? 'No events are currently awaiting your approval.'
              : `No events in '${activeTab}' category.`
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredEvents.map((evt) => {
            const isPending = evt.status === 'PENDING_FACULTY_APPROVAL';
            const isApprovingThis = approvingId === evt.id;

            const startDateFormatted = new Date(evt.start_time).toLocaleDateString(undefined, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            });
            const startTimeFormatted = new Date(evt.start_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });
            const endTimeFormatted = new Date(evt.end_time).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={evt.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition-all space-y-4"
              >
                {/* Event Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      ID #{evt.id}
                    </span>
                    <h2 className="text-base font-bold text-slate-900">{evt.title}</h2>
                  </div>
                  <StatusBadge status={evt.status} />
                </div>

                {/* Event Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600 bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Date & Time</p>
                      <p className="font-semibold text-slate-800">{startDateFormatted}</p>
                      <p className="text-[11px] text-slate-500">{startTimeFormatted} – {endTimeFormatted}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Venue</p>
                      <p className="font-semibold text-slate-800">{evt.venue}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Capacity & Club</p>
                      <p className="font-semibold text-slate-800">
                        {evt.club?.name || `Club #${evt.club_id}`}
                      </p>
                      <p className="text-[11px] text-slate-500">Capacity: {evt.capacity} seats</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Category & Creator</p>
                      <p className="font-semibold text-slate-800">{evt.category || 'General'}</p>
                      <p className="text-[11px] text-slate-500">Creator ID: #{evt.created_by_id}</p>
                    </div>
                  </div>
                </div>

                {/* Event Description */}
                {evt.description && (
                  <div>
                    <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Event Description
                    </h4>
                    <p className="text-xs text-slate-700 mt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                      {evt.description}
                    </p>
                  </div>
                )}

                {/* Faculty Remark / Rejection Reason Display */}
                {evt.faculty_remark && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    evt.status === 'REJECTED' 
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-blue-50 border-blue-200 text-blue-800'
                  }`}>
                    <div className="flex items-center space-x-1.5 font-semibold mb-1">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{evt.status === 'REJECTED' ? 'Faculty Rejection Reason:' : 'Faculty Approval Remark:'}</span>
                    </div>
                    <p className="text-xs font-mono">{evt.faculty_remark}</p>
                  </div>
                )}

                {/* Approval Action Bar */}
                {isPending ? (
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenRejectModal(evt.id)}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Reject Event
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isApprovingThis}
                      onClick={() => handleApprove(evt.id)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                    >
                      Approve Event
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Approval action disabled (Current Status: {evt.status})</span>
                    <span className="font-mono">Server-side Authorization Enforced</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Event Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Event Proposal"
        description="Provide a mandatory rejection reason for the Club Admin. The reason will be stored in the audit trail and displayed to the creator."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRejectModalOpen(false)}
              disabled={rejecting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={rejecting}
              onClick={handleConfirmReject}
              disabled={!rejectionReason.trim()}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Reject Event
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {modalError && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Rejection Reason <span className="text-rose-500">* (Mandatory)</span>
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this event proposal is rejected (e.g. Venue scheduling conflict, incomplete budget proposal, missing safety plan)..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Minimum 5 characters required. Club Admins can view this reason and resubmit after resolving issues.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EventApprovals;
