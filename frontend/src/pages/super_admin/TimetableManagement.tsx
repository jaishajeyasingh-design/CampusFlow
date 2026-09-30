import React, { useState, useEffect } from 'react';
import timetableService from '../../services/timetableService';
import type { TimetableStructure, TimetableStructureCreate, TimetablePeriod } from '../../types';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TimetableStructureModal } from './components/TimetableStructureModal';

import { 
  Clock, Plus, Edit3, CheckCircle2, AlertCircle, RefreshCw
} from 'lucide-react';

export const TimetableManagement: React.FC = () => {
  const [structures, setStructures] = useState<TimetableStructure[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State for Create / Edit
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editingStructure, setEditingStructure] = useState<TimetableStructure | null>(null);

  // Activate Confirmation State
  const [activateConfirmOpen, setActivateConfirmOpen] = useState<boolean>(false);
  const [targetActivateId, setTargetActivateId] = useState<number | null>(null);
  const [activating, setActivating] = useState<boolean>(false);

  const fetchTimetables = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await timetableService.getTimetableStructures();
      setStructures(data);
    } catch (err: any) {
      console.error('Failed to fetch timetable structures:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to load timetable structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetables();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingStructure(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (structure: TimetableStructure) => {
    setEditingStructure(structure);
    setModalOpen(true);
  };

  const handleSaveStructure = async (
    payload: TimetableStructureCreate,
    isEdit: boolean,
    id?: number
  ) => {
    setSuccessMsg(null);
    if (isEdit && id) {
      await timetableService.updateTimetableStructure(id, payload);
      setSuccessMsg(`Timetable structure #${id} updated successfully.`);
    } else {
      await timetableService.createTimetableStructure(payload);
      setSuccessMsg('New timetable structure created successfully.');
    }
    await fetchTimetables();
  };

  const handlePromptActivate = (id: number) => {
    setTargetActivateId(id);
    setActivateConfirmOpen(true);
  };

  const handleConfirmActivate = async () => {
    if (!targetActivateId) return;
    const target = structures.find((s) => s.id === targetActivateId);
    if (!target) return;

    setActivating(true);
    setError(null);
    try {
      const payload: TimetableStructureCreate = {
        name: target.name,
        working_days: target.working_days,
        effective_from: target.effective_from,
        is_active: true,
        periods: (target.periods || []).map((p) => ({
          period_number: p.period_number,
          start_time: p.start_time,
          end_time: p.end_time,
          period_type: p.period_type,
        })),
      };

      await timetableService.updateTimetableStructure(target.id, payload);
      setActivateConfirmOpen(false);
      setSuccessMsg(`Timetable structure '${target.name}' is now the ACTIVE campus timetable.`);
      await fetchTimetables();
    } catch (err: any) {
      console.error('Failed to activate timetable structure:', err);
      setError(err?.response?.data?.detail || err?.message || 'Failed to activate timetable structure.');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading campus academic timetable structures..." />;
  }

  if (error && structures.length === 0) {
    return (
      <ErrorState
        title="Timetable Manager Error"
        message={error}
        onRetry={fetchTimetables}
      />
    );
  }

  const activeStructure = structures.find((s) => s.is_active);

  // Duration calculation helper
  const calculateDurationMinutes = (start: string, end: string) => {
    try {
      const [h1, m1] = start.split(':').map(Number);
      const [h2, m2] = end.split(':').map(Number);
      const diff = h2 * 60 + m2 - (h1 * 60 + m1);
      return diff > 0 ? `${diff} mins` : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
              ACADEMIC GOVERNANCE
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-2 tracking-tight">
              Timetable Structure Management
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Configure master campus timetables, period start/end times, and working days. The active timetable structure is used by the backend to calculate academic On-Duty (OD) period snapshots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchTimetables}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh Data
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenCreateModal}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Create Timetable
            </Button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button 
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold ml-2 cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {/* Error Alert */}
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

      {/* Active Timetable Hero Highlight */}
      {activeStructure && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-800/80 pb-3">
            <div className="flex items-center space-x-2.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-400 text-slate-950">
                ACTIVE TIMETABLE
              </span>
              <h2 className="text-base font-bold tracking-tight">{activeStructure.name}</h2>
            </div>
            <span className="text-xs text-blue-200 font-mono">
              Effective Date: {new Date(activeStructure.effective_from).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-blue-100">
            <div>
              <p className="text-[10px] uppercase text-blue-300 font-medium">Working Days</p>
              <p className="font-semibold text-white mt-0.5 font-mono">{activeStructure.working_days}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-blue-300 font-medium">Total Timetable Periods</p>
              <p className="font-semibold text-white mt-0.5">{activeStructure.periods?.length || 0} Periods Configured</p>
            </div>
            <div>
              <p className="text-[10px] uppercase text-blue-300 font-medium">Structure ID & Creator</p>
              <p className="font-semibold text-white mt-0.5">ID #{activeStructure.id} (User #{activeStructure.created_by_id})</p>
            </div>
          </div>
        </div>
      )}

      {/* List of All Timetable Structures */}
      {structures.length === 0 ? (
        <EmptyState
          title="No timetable structures found"
          description="Create a campus timetable structure to define academic period schedules."
          action={{
            label: 'Create First Timetable',
            onClick: handleOpenCreateModal,
            icon: <Plus className="w-4 h-4" />,
          }}
        />
      ) : (
        <div className="space-y-6">
          {structures.map((struct) => {
            const periodList = struct.periods || [];

            return (
              <div
                key={struct.id}
                className={`bg-white rounded-xl border shadow-xs p-5 transition-all space-y-4 ${
                  struct.is_active ? 'border-blue-300 ring-2 ring-blue-500/10' : 'border-slate-200'
                }`}
              >
                {/* Structure Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      ID #{struct.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">{struct.name}</h3>
                    <StatusBadge
                      status={struct.is_active ? 'ACTIVE' : 'INACTIVE'}
                      variant={struct.is_active ? 'success' : 'neutral'}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {!struct.is_active && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handlePromptActivate(struct.id)}
                        leftIcon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      >
                        Activate Schedule
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEditModal(struct)}
                      leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                    >
                      Edit Schedule
                    </Button>
                  </div>
                </div>

                {/* Structure Info Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50/70 p-3 rounded-lg border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 font-medium">Working Days:</span>{' '}
                    <span className="font-mono font-semibold text-slate-800">{struct.working_days}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Effective From:</span>{' '}
                    <span className="font-semibold text-slate-800">
                      {new Date(struct.effective_from).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Created At:</span>{' '}
                    <span className="text-slate-600">
                      {new Date(struct.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Section 3: Timetable Periods Grid */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-2.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Configured Periods ({periodList.length})</span>
                  </h4>

                  {periodList.length === 0 ? (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 italic">
                      No periods attached to this structure. Click &lsquo;Edit Schedule&rsquo; to add periods.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {periodList.map((period: TimetablePeriod) => {
                        const durationStr = calculateDurationMinutes(period.start_time, period.end_time);

                        const typeColorMap: Record<string, string> = {
                          CLASS: 'bg-blue-50 text-blue-700 border-blue-200',
                          SHORT_BREAK: 'bg-amber-50 text-amber-800 border-amber-200',
                          LUNCH_BREAK: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                        };

                        return (
                          <div
                            key={period.period_number}
                            className="p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-slate-300 transition-all space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-xs">
                                Period #{period.period_number}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                  typeColorMap[period.period_type] || 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {period.period_type}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-xs text-slate-700 font-mono">
                              <span>{period.start_time} – {period.end_time}</span>
                              <span className="text-[10px] font-sans font-medium text-slate-400">
                                {durationStr}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timetable Create/Edit Modal */}
      {modalOpen && (
        <TimetableStructureModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          structure={editingStructure}
          onSubmit={handleSaveStructure}
        />
      )}

      {/* Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activateConfirmOpen}
        onClose={() => setActivateConfirmOpen(false)}
        onConfirm={handleConfirmActivate}
        title="Activate Campus Timetable Structure"
        message="Are you sure you want to activate this timetable structure? Setting a new active timetable updates all OD period calculations across the campus."
        confirmText="Activate Structure"
        variant="primary"
        isLoading={activating}
      />
    </div>
  );
};

export default TimetableManagement;
