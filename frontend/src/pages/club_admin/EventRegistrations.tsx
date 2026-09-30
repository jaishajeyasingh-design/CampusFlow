import React, { useEffect, useState } from 'react';
import analyticsService from '../../services/analyticsService';
import { extractApiErrorMessage } from '../../services/api';
import type { RegistrationAnalyticsResponse } from '../../types';
import { Users, AlertCircle, Calendar, Layers } from 'lucide-react';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

export const EventRegistrations: React.FC = () => {
  const [data, setData] = useState<RegistrationAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await analyticsService.getRegistrationAnalytics();
      setData(res);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load registration metrics from server.'));
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Event Registrations Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View total student registrations across published campus events.
          </p>
        </div>
      </div>

      {/* Backend Dependency Status Notice */}
      <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 flex items-start space-x-3 text-xs text-amber-800">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-amber-900">Backend Endpoint Dependency Notice</p>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            The frozen backend currently provides aggregate registration analytics via <code className="font-mono bg-white px-1 rounded border border-amber-300">GET /api/analytics/registrations</code>, but does not provide an endpoint to list individual student attendee rosters per club event (<code className="font-mono bg-white px-1 rounded border border-amber-300">GET /api/events/&#123;id&#125;/registrations</code>). 
            Aggregate backend database counts are displayed below. Individual student roster listing is reported as a backend dependency.
          </p>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Loading registration statistics..." rows={3} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load registrations overview"
          message={error}
          onRetry={fetchAnalytics}
        />
      )}

      {/* Real Aggregate Data */}
      {!loading && !error && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Registrations</span>
                <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                  <Users className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.total_registrations}</p>
              <p className="text-[11px] text-slate-400">Total student enrollments</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Per Event</span>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{data.average_registrations_per_event.toFixed(1)}</p>
              <p className="text-[11px] text-slate-400">Average student participation</p>
            </div>
          </div>

          {/* Registrations By Event */}
          {data.registrations_by_event && data.registrations_by_event.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Registration Count By Event
              </h3>
              <div className="space-y-2">
                {data.registrations_by_event.map((item) => (
                  <div key={item.event_id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                      <span className="font-semibold text-slate-800">{item.event_title}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded bg-white border border-slate-200 font-bold text-blue-700">
                      {item.registration_count} Registrations
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EventRegistrations;
