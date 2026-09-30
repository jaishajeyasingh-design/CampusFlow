import React, { useEffect, useState } from 'react';
import badgeService from '../../services/badgeService';
import { extractApiErrorMessage } from '../../services/api';
import type { Badge, StudentBadge } from '../../types';
import { Sparkles, CheckCircle2, Lock } from 'lucide-react';
import { LoadingState } from '../../components/ui/LoadingState';
import { ErrorState } from '../../components/ui/ErrorState';

export const MyBadges: React.FC = () => {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [myBadges, setMyBadges] = useState<StudentBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBadgeData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [all, mine] = await Promise.all([
        badgeService.getAllBadges(),
        badgeService.getMyBadges(),
      ]);
      setAllBadges(all);
      setMyBadges(mine);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Unable to load digital badges from server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadgeData();
  }, [fetchBadgeData]);

  const earnedBadgeMap = new Map(myBadges.map((b) => [b.badge_id, b]));

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '';
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Student Badges & Digital Achievements</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Earn verified digital achievement badges automatically as you participate in campus club events and activities.
          </p>
        </div>
        <div className="flex items-center space-x-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 text-xs font-semibold">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <span>Earned: {myBadges.length} / {allBadges.length} Badges</span>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Loading your digital passport badges..." rows={3} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load badges"
          message={error}
          onRetry={fetchBadgeData}
        />
      )}

      {/* Badges Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allBadges.map((badge) => {
            const earned = earnedBadgeMap.get(badge.id);

            return (
              <div
                key={badge.id}
                className={`p-5 rounded-xl border shadow-xs transition-all flex flex-col justify-between space-y-4 ${
                  earned
                    ? 'bg-white border-blue-200 hover:border-blue-300'
                    : 'bg-slate-50/70 border-slate-200 opacity-75'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-xs ${
                      earned ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'
                    }`}>
                      {badge.icon || '🏅'}
                    </div>

                    {earned ? (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>EARNED</span>
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 flex items-center space-x-1">
                        <Lock className="w-3 h-3" />
                        <span>LOCKED</span>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{badge.name}</h3>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{badge.description}</p>
                  </div>

                  <div className="p-2.5 bg-slate-100/80 border border-slate-200/80 rounded-lg text-[11px] text-slate-600 space-y-0.5">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[9px] block">
                      Qualification Criteria
                    </span>
                    <p>{badge.criteria}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  {earned ? (
                    <span className="text-emerald-700 font-medium">
                      Awarded on {formatDate(earned.awarded_at)}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">
                      Qualify by completing the required activities above.
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyBadges;
