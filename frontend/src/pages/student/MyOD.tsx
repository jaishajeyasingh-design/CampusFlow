import React, { useEffect, useState } from 'react';
import odService from '../../services/odService';
import { extractApiErrorMessage } from '../../services/api';
import type { ODRequest } from '../../types';
import { 
  Plus, Calendar, Layers, Shield, MessageSquare
} from 'lucide-react';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import RequestODModal from './RequestODModal';

export const MyOD: React.FC = () => {
  const [odRequests, setOdRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchODRequests = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await odService.getODRequests();
      setOdRequests(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to retrieve your OD requests from server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchODRequests();
  }, [fetchODRequests]);

  const handleODCreated = (newOD: ODRequest) => {
    setOdRequests((prev) => [newOD, ...prev]);
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'N/A';
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">My On-Duty (OD) Requests</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View academic On-Duty leave applications, period snapshots, and class mentor approval status.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          New OD Request
        </Button>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Fetching your OD request history..." rows={3} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load OD requests"
          message={error}
          onRetry={fetchODRequests}
        />
      )}

      {/* Empty State */}
      {!loading && !error && odRequests.length === 0 && (
        <EmptyState
          title="No OD Requests Found"
          description="You haven't submitted any On-Duty requests yet. Select an approved event you are registered for to apply."
          action={{
            label: 'Submit New OD Request',
            onClick: () => setIsModalOpen(true),
            icon: <Plus className="w-3.5 h-3.5" />,
          }}
        />
      )}

      {/* OD Requests List */}
      {!loading && !error && odRequests.length > 0 && (
        <div className="space-y-4">
          {odRequests.map((od) => (
            <div
              key={od.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all space-y-3"
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">OD Request #{od.id}</span>
                    <span className="text-[10px] text-slate-400">• Requested on {formatDate(od.created_at)}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {od.event?.title || `Event #${od.event_id}`}
                  </h3>
                </div>

                <StatusBadge status={od.status} />
              </div>

              {/* Event & Mentor details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span>Event Details</span>
                  </span>
                  <p className="font-medium text-slate-800">{od.event?.title || `Event #${od.event_id}`}</p>
                  {od.event?.start_time && (
                    <p className="text-[11px] text-slate-500">
                      Date: {formatDate(od.event.start_time)} | Venue: {od.event.venue}
                    </p>
                  )}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-blue-600" />
                    <span>Assigned Mentor ID</span>
                  </span>
                  <p className="font-medium text-slate-800">Mentor ID: #{od.mentor_id}</p>
                  <p className="text-[11px] text-slate-500">
                    Status: <span className="font-semibold">{od.status}</span>
                  </p>
                </div>
              </div>

              {/* Mentor Remarks */}
              {od.mentor_remark && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-0.5">
                  <span className="font-bold text-amber-900 flex items-center space-x-1">
                    <MessageSquare className="w-3.5 h-3.5 text-amber-700" />
                    <span>Faculty Mentor Remark:</span>
                  </span>
                  <p className="text-amber-800 text-[11px] pl-4">{od.mentor_remark}</p>
                </div>
              )}

              {/* Affected Period Snapshots */}
              {od.period_snapshots && od.period_snapshots.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-slate-500 flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span>Affected Academic Timetable Periods ({od.period_snapshots.length})</span>
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {od.period_snapshots.map((snap) => (
                      <div key={snap.id} className="p-2 bg-white border border-slate-200 rounded-lg text-[11px] space-y-0.5">
                        <p className="font-bold text-slate-800">{snap.period_name || `Period ${snap.period_number}`}</p>
                        <p className="text-[10px] text-slate-500">{snap.start_time} - {snap.end_time}</p>
                        <span className="inline-block text-[9px] font-semibold text-blue-600 bg-blue-50 px-1 py-0.2 rounded">
                          {snap.period_type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal for creating new OD request */}
      <RequestODModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleODCreated}
      />
    </div>
  );
};

export default MyOD;
