import React, { useState, useEffect } from 'react';
import type { TimetableStructure, TimetableStructureCreate, TimetablePeriod } from '../../../types';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';

import { 
  Plus, Trash2, AlertCircle, Clock, CheckCircle2 
} from 'lucide-react';

interface TimetableStructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  structure: TimetableStructure | null; // null for Create, object for Edit
  onSubmit: (payload: TimetableStructureCreate, isEdit: boolean, id?: number) => Promise<void>;
}

const DEFAULT_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export const TimetableStructureModal: React.FC<TimetableStructureModalProps> = ({
  isOpen,
  onClose,
  structure,
  onSubmit,
}) => {
  const isEdit = !!structure;

  const [name, setName] = useState<string>('');
  const [selectedDays, setSelectedDays] = useState<string[]>(DEFAULT_DAYS);
  const [effectiveFrom, setEffectiveFrom] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [periods, setPeriods] = useState<TimetablePeriod[]>([]);

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (structure) {
      setName(structure.name || '');
      const daysArr = structure.working_days
        ? structure.working_days.split(',').map((d) => d.trim().toUpperCase())
        : DEFAULT_DAYS;
      setSelectedDays(daysArr);

      const effDate = structure.effective_from
        ? new Date(structure.effective_from).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setEffectiveFrom(effDate);
      setIsActive(structure.is_active || false);

      if (structure.periods && structure.periods.length > 0) {
        setPeriods(structure.periods.map((p, idx) => ({ ...p, period_number: p.period_number || idx + 1 })));
      } else {
        setDefaultPeriods();
      }
    } else {
      setName('');
      setSelectedDays(DEFAULT_DAYS);
      setEffectiveFrom(new Date().toISOString().split('T')[0]);
      setIsActive(false);
      setDefaultPeriods();
    }
    setValidationError(null);
  }, [structure, isOpen]);

  const setDefaultPeriods = () => {
    setPeriods([
      { period_number: 1, start_time: '08:30', end_time: '09:20', period_type: 'CLASS' },
      { period_number: 2, start_time: '09:30', end_time: '10:20', period_type: 'CLASS' },
      { period_number: 3, start_time: '10:20', end_time: '10:40', period_type: 'SHORT_BREAK' },
      { period_number: 4, start_time: '10:40', end_time: '11:30', period_type: 'CLASS' },
      { period_number: 5, start_time: '12:30', end_time: '13:30', period_type: 'LUNCH_BREAK' },
      { period_number: 6, start_time: '13:30', end_time: '14:20', period_type: 'CLASS' },
    ]);
  };

  const handleToggleDay = (day: string) => {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // keep at least 1 day
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day]);
    }
  };

  const handleAddPeriod = () => {
    const nextNum = periods.length + 1;
    const lastP = periods[periods.length - 1];
    let start_time = '14:30';
    let end_time = '15:20';

    if (lastP) {
      start_time = lastP.end_time;
      // Add 50 mins
      const [h, m] = lastP.end_time.split(':').map(Number);
      const endMins = h * 60 + m + 50;
      const newH = Math.floor(endMins / 60) % 24;
      const newM = endMins % 60;
      end_time = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    }

    setPeriods([
      ...periods,
      {
        period_number: nextNum,
        start_time,
        end_time,
        period_type: 'CLASS',
      },
    ]);
  };

  const handleRemovePeriod = (index: number) => {
    if (periods.length <= 1) {
      setValidationError('Timetable structure must contain at least 1 academic period.');
      return;
    }
    const updated = periods.filter((_, i) => i !== index).map((p, idx) => ({
      ...p,
      period_number: idx + 1,
    }));
    setPeriods(updated);
  };

  const handlePeriodChange = (index: number, field: keyof TimetablePeriod, value: any) => {
    const updated = [...periods];
    updated[index] = { ...updated[index], [field]: value };
    setPeriods(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Client side pre-validations
    if (!name.trim()) {
      setValidationError('Timetable structure name is required.');
      return;
    }
    if (selectedDays.length === 0) {
      setValidationError('Please select at least one working day.');
      return;
    }
    if (!effectiveFrom) {
      setValidationError('Effective date is required.');
      return;
    }
    if (periods.length === 0) {
      setValidationError('At least 1 academic period is required.');
      return;
    }

    // Period timing checks
    for (let i = 0; i < periods.length; i++) {
      const p = periods[i];
      if (!p.start_time || !p.end_time) {
        setValidationError(`Start and end time required for Period ${p.period_number}.`);
        return;
      }
      if (p.start_time >= p.end_time) {
        setValidationError(
          `Invalid period timing: Period ${p.period_number} start_time (${p.start_time}) must be strictly before end_time (${p.end_time}).`
        );
        return;
      }
    }

    const payload: TimetableStructureCreate = {
      name: name.trim(),
      working_days: selectedDays.join(','),
      effective_from: new Date(effectiveFrom).toISOString(),
      is_active: isActive,
      periods: periods.map((p, idx) => ({
        period_number: idx + 1,
        start_time: p.start_time,
        end_time: p.end_time,
        period_type: p.period_type,
      })),
    };

    setSubmitting(true);
    try {
      await onSubmit(payload, isEdit, structure?.id);
      onClose();
    } catch (err: any) {
      console.error('Timetable structure submission error:', err);
      const backendDetail = err?.response?.data?.detail || err?.message || 'Failed to save timetable structure.';
      setValidationError(backendDetail);
    } finally {
      setSubmitting(false);
    }
  };

  const dayOptions = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Timetable Structure #${structure?.id}` : 'Create New Timetable Structure'}
      description="Define working days, effective date, and period schedules. Backend enforces period order & overlap validation."
      maxWidth="xl"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={submitting}
            onClick={handleSubmit}
            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
          >
            {isEdit ? 'Save Changes' : 'Create Structure'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Validation Alert */}
        {validationError && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backend Validation Alert</p>
              <p className="mt-0.5 font-mono text-[11px] leading-relaxed">{validationError}</p>
            </div>
          </div>
        )}

        {/* Structure Core Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Structure Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spring 2026 Academic Schedule"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Effective Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
            />
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Set as Active Campus Timetable</span>
            </label>
          </div>
        </div>

        {/* Working Days Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Working Days <span className="text-rose-500">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {dayOptions.map((day) => {
              const selected = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleToggleDay(day)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                    selected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Periods Table Header */}
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Timetable Period Schedules ({periods.length})</span>
            </h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPeriod}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Period
            </Button>
          </div>

          {/* Period Rows List */}
          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {periods.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center space-x-2 shrink-0">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800">Period #{idx + 1}</span>
                </div>

                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400">Start Time</label>
                    <input
                      type="time"
                      value={p.start_time}
                      onChange={(e) => handlePeriodChange(idx, 'start_time', e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400">End Time</label>
                    <input
                      type="time"
                      value={p.end_time}
                      onChange={(e) => handlePeriodChange(idx, 'end_time', e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400">Type</label>
                    <select
                      value={p.period_type}
                      onChange={(e) => handlePeriodChange(idx, 'period_type', e.target.value)}
                      className="w-full text-xs p-1.5 rounded border border-slate-300 bg-white font-medium"
                    >
                      <option value="CLASS">CLASS</option>
                      <option value="SHORT_BREAK">SHORT_BREAK</option>
                      <option value="LUNCH_BREAK">LUNCH_BREAK</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemovePeriod(idx)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 self-end sm:self-center cursor-pointer"
                  title="Remove Period"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default TimetableStructureModal;
