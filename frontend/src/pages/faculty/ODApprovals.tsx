import React, { useState, useEffect } from 'react';
import odService from '../../services/odService';
import type { ODRequest, ODPeriodSnapshot } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';

import { 
  CheckCircle2, XCircle, Clock, Calendar, 
  User, BookOpen, AlertCircle, MessageSquare
} from 'lucide-react';

export const ODApprovals: React.FC = () => {
  const [odRequests, setOdRequests] = useState<ODRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<string>('pending');

  // Modal State for Reject OD
  const [rejectModalOpen, setRejectModalOpen] = useState<boolean>(false);
  const [selectedODId, setSelectedODId] = useState<number | null>(null);
  const [rejectRemark, setRejectRemark] = useState<string>('');
  const [rejecting, setRejecting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Modal State for Approve OD (Optional Remark)
  const [approveModalOpen, setApproveModalOpen] = useState<boolean>(false);
  const [approveRemark, setApproveRemark] = useState<string>('Approved for academic On-Duty');
  const [approving, setApproving] = useState<boolean>(false);

  const fetchODRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await odService.getODRequests();
      setOdRequests(data);
    } catch (err: any) {
      console.error('Failed to fetch OD requests:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to fetch OD requests from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchODRequests();
  }, []);

  const handleOpenApproveModal = (odId: number) => {
    setSelectedODId(odId);
    setApproveRemark('Approved for academic On-Duty');
    setModalError(null);
    setApproveModalOpen(true);
  };

  const handleConfirmApprove = async () => {
    if (!selectedODId) return;
    setApproving(true);
    setModalError(null);
    try {
      await odService.approveODRequest(selectedODId, approveRemark.trim() || undefined);
      setApproveModalOpen(false);
      setActionSuccess(`OD Request #${selectedODId} has been APPROVED.`);
      await fetchODRequests();
    } catch (err: any) {
      console.error('Failed to approve OD request:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to approve OD request.';
      setModalError(msg);
    } finally {
      setApproving(false);
    }
  };

  const handleOpenRejectModal = (odId: number) => {
    setSelectedODId(odId);
    setRejectRemark('');
    setModalError(null);
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedODId) return;
    const trimmed = rejectRemark.trim();
    if (!trimmed) {
      setModalError('A rejection remark is mandatory. Please explain why OD is denied.');
      return;
    }

    setRejecting(true);
    setModalError(null);
    try {
      await odService.rejectODRequest(selectedODId, trimmed);
      setRejectModalOpen(false);
      setActionSuccess(`OD Request #${selectedODId} has been REJECTED.`);
      await fetchODRequests();
    } catch (err: any) {
      console.error('Failed to reject OD request:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Failed to reject OD request.';
      setModalError(msg);
    } finally {
      setRejecting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading assigned student OD approval requests..." />;
  }

  if (error && odRequests.length === 0) {
    return (
      <ErrorState
        title="OD Approvals Error"
        message={error}
        onRetry={fetchODRequests}
      />
    );
  }

  const pendingODs = odRequests.filter((r) => r.status === 'PENDING');
  const approvedODs = odRequests.filter((r) => r.status === 'APPROVED');
  const rejectedODs = odRequests.filter((r) => r.status === 'REJECTED');

  const getFilteredODs = () => {
    switch (activeTab) {
      case 'pending':
        return pendingODs;
      case 'approved':
        return approvedODs;
      case 'rejected':
        return rejectedODs;
      case 'all':
      default:
        return odRequests;
    }
  };

  const filteredODs = getFilteredODs();

  const tabItems = [
    { id: 'pending', label: 'Pending ODs', count: pendingODs.length },
    { id: 'approved', label: 'Approved', count: approvedODs.length },
    { id: 'rejected', label: 'Rejected', count: rejectedODs.length },
    { id: 'all', label: 'All Requests', count: odRequests.length },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-800 border border-blue-200">
              ACADEMIC ON-DUTY MANAGEMENT
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              OD Approvals Portal
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Process On-Duty requests submitted by your assigned mentees for approved campus events. Affected timetable periods are automatically snapshot from the active academic timetable.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-slate-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-800">
              {pendingODs.length} Pending Decision
            </span>
          </div>
        </div>
      </div>

      {/* Notifications / Feedback Alerts */}
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

      {/* Filter Tabs */}
      <Tabs
        tabs={tabItems}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* OD Request Cards */}
      {filteredODs.length === 0 ? (
        <EmptyState
          title="No pending OD requests"
          description={
            activeTab === 'pending'
              ? 'No pending OD requests assigned to you.'
              : `No OD requests found in '${activeTab}' filter.`
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredODs.map((req) => {
            const isPending = req.status === 'PENDING';
            const eventObj = req.event;

            const requestDateFormatted = new Date(req.created_at).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 hover:border-slate-300 transition-all space-y-4"
              >
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      OD Request #{req.id}
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">
                      {eventObj?.title || `Event #${req.event_id}`}
                    </h2>
                  </div>
                  <StatusBadge status={req.status} />
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-lg border border-slate-200/80">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Student Info</p>
                      <p className="font-semibold text-slate-800">
                        {req.student?.full_name || `Student ID #${req.student_id}`}
                      </p>
                      {req.student?.ra_number && (
                        <p className="text-[11px] font-mono text-blue-600">RA: {req.student.ra_number}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Event Schedule</p>
                      <p className="font-semibold text-slate-800">
                        {eventObj?.start_time
                          ? new Date(eventObj.start_time).toLocaleDateString()
                          : 'N/A'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {eventObj?.start_time && eventObj?.end_time
                          ? `${new Date(eventObj.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(eventObj.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-medium">Request Audit</p>
                      <p className="font-semibold text-slate-800">Submitted: {requestDateFormatted}</p>
                      <p className="text-[11px] text-slate-500">Mentor ID: #{req.mentor_id}</p>
                    </div>
                  </div>
                </div>

                {/* Section 9: Affected Academic Periods Display */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-2">
                    <BookOpen className="w-4 h-4 text-blue-600" />
                    <span>Affected Academic Periods ({req.period_snapshots?.length || 0})</span>
                  </h3>

                  {req.period_snapshots && req.period_snapshots.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                      {req.period_snapshots.map((snap: ODPeriodSnapshot) => (
                        <div
                          key={snap.id}
                          className="p-3 rounded-lg bg-blue-50/50 border border-blue-200/70 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-semibold text-blue-900">
                            <span>{snap.period_name || `Period ${snap.period_number}`}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 uppercase">
                              {snap.period_type}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-slate-600 text-[11px]">
                            <span className="font-mono">{snap.start_time} – {snap.end_time}</span>
                            <span className="text-slate-400">{snap.period_date}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                      No specific academic period overlap snapshot recorded for this request date.
                    </div>
                  )}
                </div>

                {/* Mentor Remark Display if available */}
                {req.mentor_remark && (
                  <div className={`p-3 rounded-lg border text-xs ${
                    req.status === 'REJECTED'
                      ? 'bg-rose-50 border-rose-200 text-rose-800'
                      : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  }`}>
                    <div className="flex items-center space-x-1.5 font-semibold mb-0.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Faculty Remark:</span>
                    </div>
                    <p className="font-mono text-xs">{req.mentor_remark}</p>
                  </div>
                )}

                {/* Action Bar */}
                {isPending ? (
                  <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleOpenRejectModal(req.id)}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Reject OD
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleOpenApproveModal(req.id)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
                    >
                      Approve OD
                    </Button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>OD status is read-only ({req.status})</span>
                    <span className="font-mono">Backend Authority Verified</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Approve OD Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve On-Duty Request"
        description="Grant academic On-Duty approval for the affected timetable periods."
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setApproveModalOpen(false)}
              disabled={approving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={approving}
              onClick={handleConfirmApprove}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-700 border-emerald-600"
            >
              Confirm Approval
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
              Faculty Remark (Optional)
            </label>
            <input
              type="text"
              value={approveRemark}
              onChange={(e) => setApproveRemark(e.target.value)}
              placeholder="e.g. Approved for academic On-Duty"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
          </div>
        </div>
      </Modal>

      {/* Reject OD Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject On-Duty Request"
        description="Provide a mandatory reason/remark for denying this student's On-Duty request."
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
              disabled={!rejectRemark.trim()}
              leftIcon={<XCircle className="w-3.5 h-3.5" />}
            >
              Reject OD
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
              Rejection Remark <span className="text-rose-500">* (Mandatory)</span>
            </label>
            <textarea
              rows={4}
              value={rejectRemark}
              onChange={(e) => setRejectRemark(e.target.value)}
              placeholder="Explain why this OD request is rejected (e.g. Mandatory attendance exam on event date, insufficient academic attendance)..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ODApprovals;
