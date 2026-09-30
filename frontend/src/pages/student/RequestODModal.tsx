import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import eventsService from '../../services/eventsService';
import odService from '../../services/odService';
import { extractApiErrorMessage } from '../../services/api';
import type { EventRegistration, ODRequest } from '../../types';
import { Calendar, Clock, AlertCircle } from 'lucide-react';

interface RequestODModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newOD: ODRequest) => void;
  preselectedEventId?: number;
}

export const RequestODModal: React.FC<RequestODModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedEventId,
}) => {
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [selectedRegId, setSelectedRegId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);

    eventsService.getMyEvents()
      .then((regs) => {
        // Only registered events where event is APPROVED can request OD
        const eligible = regs.filter((r) => r.event && r.event.status === 'APPROVED');
        setRegistrations(eligible);
        if (preselectedEventId) {
          const match = eligible.find((r) => r.event_id === preselectedEventId);
          if (match) setSelectedRegId(match.id);
        } else if (eligible.length > 0) {
          setSelectedRegId(eligible[0].id);
        }
      })
      .catch((err) => {
        setError(extractApiErrorMessage(err, 'Failed to fetch your registered events for OD request.'));
      })
      .finally(() => setLoading(false));
  }, [isOpen, preselectedEventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRegId) {
      setError('Please select an eligible registered event.');
      return;
    }

    const reg = registrations.find((r) => r.id === Number(selectedRegId));
    if (!reg) {
      setError('Selected registration not found.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await odService.createODRequest({
        registration_id: reg.id,
        event_id: reg.event_id,
      });
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(extractApiErrorMessage(err, 'OD request could not be created. Make sure you are registered for an approved event on a valid academic timetable day.'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedReg = registrations.find((r) => r.id === Number(selectedRegId));

  return (
    <Modal
      isOpen={isOpen}
      title="Submit On-Duty (OD) Request"
      description="Request official On-Duty attendance leave for participating in approved university events."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        {error && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading eligible event registrations...
          </div>
        ) : registrations.length === 0 ? (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center space-y-2">
            <AlertCircle className="w-6 h-6 text-amber-600 mx-auto" />
            <p className="text-xs font-bold text-amber-900">No Eligible Registrations Found</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              OD can only be requested for an approved event that you have actively registered for. 
              Browse open events and register first before requesting OD.
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Registered Event <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedRegId}
                onChange={(e) => setSelectedRegId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                required
              >
                {registrations.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.event?.title || `Event #${r.event_id}`} ({r.event?.start_time ? new Date(r.event.start_time).toLocaleDateString() : ''})
                  </option>
                ))}
              </select>
            </div>

            {selectedReg && selectedReg.event && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>{selectedReg.event.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                    {selectedReg.event.category || 'Event'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1 border-t border-slate-200">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{new Date(selectedReg.event.start_time).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {new Date(selectedReg.event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(selectedReg.event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 pt-1">
                  Upon submission, affected academic class periods will be mapped automatically against the active university timetable and sent to your assigned Class Mentor for verification.
                </p>
              </div>
            )}

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit" isLoading={submitting}>
                Submit OD Request
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default RequestODModal;
