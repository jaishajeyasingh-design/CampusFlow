import React, { useEffect, useState } from 'react';
import notificationService from '../../services/notificationService';
import { extractApiErrorMessage } from '../../services/api';
import type { Notification } from '../../types';
import { 
  CheckCheck, CheckCircle2, Info, 
  AlertCircle, Award, Clock, MessageSquare 
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';

export const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError(extractApiErrorMessage(err, 'Failed to retrieve notifications from server.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: number) => {
    try {
      const updated = await notificationService.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? updated : n)));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await notificationService.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      alert(extractApiErrorMessage(err, 'Failed to mark all notifications read.'));
    } finally {
      setMarkingAll(false);
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return isoStr;
    }
  };

  const getNotifIcon = (type?: string | null) => {
    switch (type) {
      case 'EVENT_APPROVED':
      case 'EVENT_REGISTERED':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'EVENT_REJECTED':
      case 'OD_REJECTED':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      case 'OD_REQUESTED':
      case 'OD_APPROVED':
        return <Clock className="w-5 h-5 text-amber-600" />;
      case 'BADGE_AWARDED':
      case 'CERTIFICATE_GENERATED':
        return <Award className="w-5 h-5 text-purple-600" />;
      case 'MESSAGE_RECEIVED':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Notification Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time updates regarding event registrations, approvals, OD requests, and certificates.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<CheckCheck className="w-4 h-4 text-blue-600" />}
            isLoading={markingAll}
            onClick={handleMarkAllRead}
          >
            Mark All as Read ({unreadCount})
          </Button>
        )}
      </div>

      {/* Loading & Error States */}
      {loading && <LoadingState message="Fetching notifications..." rows={4} type="skeleton" />}

      {error && (
        <ErrorState
          title="Could not load notifications"
          message={error}
          onRetry={fetchNotifications}
        />
      )}

      {/* Empty State */}
      {!loading && !error && notifications.length === 0 && (
        <EmptyState
          title="No Notifications"
          description="You don't have any notifications right now."
        />
      )}

      {/* Notifications List */}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 ${
                notif.is_read
                  ? 'bg-white border-slate-200'
                  : 'bg-blue-50/40 border-blue-200 shadow-xs'
              }`}
            >
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-lg bg-white border border-slate-200 shrink-0">
                  {getNotifIcon(notif.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-bold text-slate-900">{notif.title}</h4>
                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{notif.message}</p>

                  <p className="text-[10px] text-slate-400 pt-0.5">{formatDate(notif.created_at)}</p>
                </div>
              </div>

              {!notif.is_read && (
                <button
                  type="button"
                  onClick={() => handleMarkRead(notif.id)}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0 cursor-pointer"
                >
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
