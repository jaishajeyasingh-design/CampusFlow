import React, { useEffect, useState } from 'react';
import analyticsService from '../../services/analyticsService';
import { extractApiErrorMessage } from '../../services/api';
import type { StudentAnalyticsResponse } from '../../types';
import { 
  CheckCircle2, Calendar, Award, Sparkles, Clock, 
  Shield, Percent 
} from 'lucide-react';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

export const StudentAnalytics: React.FC = () => {
  const [data, setData] = useState<StudentAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getStudentAnalytics();
      setData(res);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to retrieve student analytics from server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Personal Activity Analytics</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time server calculated metrics on your event participation, attendance rate, OD records, and verified achievements.
          </p>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Calculating your participation analytics..." rows={4} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load analytics"
          message={error}
          onRetry={fetchAnalytics}
        />
      )}

      {/* Analytics Content */}
      {!loading && !error && data && (
        <div className="space-y-6">
          {/* Main Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Events Registered */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Events Registered
                </span>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.events_registered}</p>
              <p className="text-[11px] text-slate-400">Total registrations recorded</p>
            </div>

            {/* Events Attended */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Events Attended
                </span>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.events_attended}</p>
              <p className="text-[11px] text-slate-400">Verified attendance check-ins</p>
            </div>

            {/* Attendance Rate */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Attendance Rate
                </span>
                <div className="p-2.5 rounded-lg bg-teal-50 text-teal-600">
                  <Percent className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.attendance_rate}%</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                <div 
                  className="bg-teal-600 h-full rounded-full transition-all" 
                  style={{ width: `${Math.min(100, Math.max(0, data.attendance_rate))}%` }}
                ></div>
              </div>
            </div>

            {/* Certificates Earned */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Certificates Earned
                </span>
                <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.certificates}</p>
              <p className="text-[11px] text-slate-400">Verified PDFs issued</p>
            </div>

            {/* Badges Awarded */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Digital Badges
                </span>
                <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.badges}</p>
              <p className="text-[11px] text-slate-400">Achievement qualifications</p>
            </div>

            {/* Clubs Participated */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Clubs Participated
                </span>
                <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Shield className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.clubs_participated}</p>
              <p className="text-[11px] text-slate-400">Unique organization involvement</p>
            </div>
          </div>

          {/* OD Summary Section */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>On-Duty (OD) Leave Summary</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-xs font-medium text-slate-500">Total OD Requests</span>
                <p className="text-xl font-bold text-slate-900">{data.od_requests}</p>
              </div>

              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                <span className="text-xs font-medium text-emerald-800">Approved ODs</span>
                <p className="text-xl font-bold text-emerald-900">{data.od_approved}</p>
              </div>

              <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1">
                <span className="text-xs font-medium text-rose-800">Rejected ODs</span>
                <p className="text-xl font-bold text-rose-900">{data.od_rejected}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAnalytics;
