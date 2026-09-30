import React from 'react';
import { useAuth } from '../context/useAuth';
import { StudentDashboard } from './student/StudentDashboard';
import { ClubAdminDashboard } from './club_admin/ClubAdminDashboard';
import { FacultyDashboard } from './faculty/FacultyDashboard';
import { SuperAdminDashboard } from './super_admin/SuperAdminDashboard';

import { 
  Users, Shield, Calendar, 
  Sparkles, CheckCircle2
} from 'lucide-react';

export const DashboardShell: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  if (user.system_role === 'STUDENT') {
    return <StudentDashboard />;
  }

  if (user.system_role === 'CLUB_ADMIN') {
    return <ClubAdminDashboard />;
  }

  if (user.system_role === 'FACULTY') {
    return <FacultyDashboard />;
  }

  if (user.system_role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  const roleBadgeStyles: Record<string, string> = {
    SUPER_ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    CLUB_ADMIN: 'bg-amber-50 text-amber-800 border-amber-200',
    FACULTY: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    STUDENT: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${roleBadgeStyles[user.system_role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {user.system_role} PORTAL
              </span>
              {user.ra_number && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                  RA: {user.ra_number}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
              Welcome back, {user.full_name}!
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              CampusFlow standard campus administration and activity hub. Explore module status and live workspace indicators below.
            </p>
          </div>
        </div>
      </div>

      {/* Role-Specific Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {user.system_role === 'ADMIN' && (
          <>
            <StatCard title="Active Clubs" value="1 Active" icon={Shield} colorClass="bg-purple-50 text-purple-600" />
            <StatCard title="Total Events" value="4 Events" icon={Calendar} colorClass="bg-blue-50 text-blue-600" />
            <StatCard title="Campus Users" value="6 Accounts" icon={Users} colorClass="bg-rose-50 text-rose-600" />
            <StatCard title="Analytics Health" value="100% Operational" icon={Sparkles} colorClass="bg-emerald-50 text-emerald-600" />
          </>
        )}
      </div>

      {/* Module Architecture Status Panel */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>CampusFlow Architecture Foundation</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Backend SQLite Database models, JWT Auth, foreign key PRAGMA, 15-char RA number validation, and React TypeScript shell initialized.
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            Phase 1 Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Database Models & SQLite FK Pragma</span>
            </h3>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Complete schema created for users, clubs, dynamic_roles, permissions, events, event_registrations, attendance, timetable_structures, timetable_periods, od_requests, od_period_snapshots, notifications, messages, certificates, badges, audit_logs.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
            <h3 className="font-semibold text-slate-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Seeded Accounts & Workflows</span>
            </h3>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Seeded 6 core users (Super Admin, Admin, Club Admin, Faculty, Student 1, Student 2), 1 demo club, 1 active timetable structure, and demo events (Draft, Pending Approval, Approved, Rejected).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, colorClass }) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
    <div>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{title}</p>
      <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
    <div className={`p-2.5 rounded-lg ${colorClass}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);

export default DashboardShell;
