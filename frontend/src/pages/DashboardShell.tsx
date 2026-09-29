import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, Shield, Calendar, Award, Clock, FileText, 
  Sparkles, CheckCircle2, AlertTriangle
} from 'lucide-react';

export const DashboardShell: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/60 via-purple-900/40 to-slate-900 border border-indigo-500/20 p-6 backdrop-blur-md">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {user.system_role} PORTAL
              </span>
              {user.ra_number && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                  RA: {user.ra_number}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white mt-2">
              Welcome back, {user.full_name}!
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              CampusFlow standard campus administration and activity hub. Explore module status and live workspace indicators below.
            </p>
          </div>
        </div>
      </div>

      {/* Role-Specific Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {user.system_role === 'SUPER_ADMIN' && (
          <>
            <StatCard title="System Users" value="6 Active" icon={Users} color="text-rose-400" />
            <StatCard title="Clubs Registered" value="1 Club" icon={Shield} color="text-purple-400" />
            <StatCard title="Active Timetables" value="1 Structure" icon={Clock} color="text-emerald-400" />
            <StatCard title="System Audit Logs" value="Verified" icon={FileText} color="text-amber-400" />
          </>
        )}

        {user.system_role === 'ADMIN' && (
          <>
            <StatCard title="Active Clubs" value="1 Active" icon={Shield} color="text-purple-400" />
            <StatCard title="Total Events" value="4 Events" icon={Calendar} color="text-indigo-400" />
            <StatCard title="Campus Users" value="6 Accounts" icon={Users} color="text-rose-400" />
            <StatCard title="Analytics Health" value="100% Operational" icon={Sparkles} color="text-emerald-400" />
          </>
        )}

        {user.system_role === 'CLUB_ADMIN' && (
          <>
            <StatCard title="Club Managed" value="Coding Club" icon={Shield} color="text-amber-400" />
            <StatCard title="Events Created" value="4 Events" icon={Calendar} color="text-indigo-400" />
            <StatCard title="Dynamic Roles" value="2 Roles" icon={Users} color="text-purple-400" />
            <StatCard title="Certificates Issued" value="Ready" icon={Award} color="text-emerald-400" />
          </>
        )}

        {user.system_role === 'FACULTY' && (
          <>
            <StatCard title="Pending Approvals" value="1 Event" icon={AlertTriangle} color="text-amber-400" />
            <StatCard title="Pending OD Requests" value="1 OD Request" icon={Clock} color="text-indigo-400" />
            <StatCard title="Mentorship Scope" value="2 Students" icon={Users} color="text-emerald-400" />
            <StatCard title="Faculty Messages" value="Inbox Ready" icon={FileText} color="text-purple-400" />
          </>
        )}

        {user.system_role === 'STUDENT' && (
          <>
            <StatCard title="Events Registered" value="1 Event" icon={CheckCircle2} color="text-emerald-400" />
            <StatCard title="OD Requests" value="1 Pending" icon={Clock} color="text-indigo-400" />
            <StatCard title="Badges Unlocked" value="2 Badges" icon={Sparkles} color="text-amber-400" />
            <StatCard title="Certificates" value="1 Eligible" icon={Award} color="text-rose-400" />
          </>
        )}
      </div>

      {/* Module Architecture Status Panel */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span>CampusFlow Phase 1 Architecture Foundation</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Backend SQLite Database models, JWT Auth, foreign key PRAGMA, 15-char RA number validation, and React TypeScript shell initialized.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
            Phase 1 Ready
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Database Models & SQLite FK Pragma</span>
            </h3>
            <p className="text-slate-400 text-[11px]">
              Complete schema created for users, clubs, dynamic_roles, permissions, events, event_registrations, attendance, timetable_structures, timetable_periods, od_requests, od_period_snapshots, notifications, messages, certificates, badges, audit_logs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Seeded Accounts & Workflows</span>
            </h3>
            <p className="text-slate-400 text-[11px]">
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
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => (
  <div className="glass-card p-4 rounded-xl border border-slate-800/80 flex items-center justify-between">
    <div>
      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-lg font-bold text-white mt-1">{value}</p>
    </div>
    <div className={`p-3 rounded-xl bg-slate-900/90 border border-slate-800 ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
  </div>
);
