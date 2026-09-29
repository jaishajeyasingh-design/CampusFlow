import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, Shield, Calendar, Award, 
  FileText, Bell, LogOut, Sparkles, ChevronDown, CheckCircle2,
  Clock, MessageSquare, BookOpen, Layers
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  if (!user) return null;

  const demoAccounts = [
    { email: 'superadmin@campusflow.edu', role: 'SUPER_ADMIN', label: 'Super Admin (Dr. Vance)' },
    { email: 'admin@campusflow.edu', role: 'ADMIN', label: 'Admin (Marcus Brody)' },
    { email: 'clubadmin@campusflow.edu', role: 'CLUB_ADMIN', label: 'Club Admin (Sarah Connor)' },
    { email: 'faculty@campusflow.edu', role: 'FACULTY', label: 'Faculty Mentor (Prof. Turing)' },
    { email: 'student1@campusflow.edu', role: 'STUDENT', label: 'Student 1 (Alex Mercer)' },
    { email: 'student2@campusflow.edu', role: 'STUDENT', label: 'Student 2 (Beatrix Kiddo)' },
  ];

  const handleRoleSwitch = async (email: string) => {
    try {
      await switchDemoRole(email);
      setRoleMenuOpen(false);
      navigate('/dashboard');
    } catch (err) {
      console.error("Failed to switch role:", err);
    }
  };

  const getNavLinks = () => {
    switch (user.system_role) {
      case 'SUPER_ADMIN':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/users', label: 'User Management', icon: Users },
          { to: '/clubs', label: 'Clubs', icon: Shield },
          { to: '/timetable', label: 'Timetable Manager', icon: Clock },
          { to: '/audit-logs', label: 'Audit Logs', icon: FileText },
          { to: '/analytics', label: 'Analytics', icon: Layers },
        ];
      case 'ADMIN':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/clubs', label: 'Clubs Overview', icon: Shield },
          { to: '/users', label: 'Users Directory', icon: Users },
          { to: '/events', label: 'All Events', icon: Calendar },
          { to: '/analytics', label: 'Analytics', icon: Layers },
        ];
      case 'FACULTY':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/faculty/event-approvals', label: 'Event Approvals', icon: CheckCircle2 },
          { to: '/faculty/od-approvals', label: 'OD Approvals', icon: Clock },
          { to: '/faculty/messages', label: 'Messages', icon: MessageSquare },
          { to: '/faculty/student-activity', label: 'Student Participation', icon: BookOpen },
        ];
      case 'CLUB_ADMIN':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/club/events', label: 'Event Manager', icon: Calendar },
          { to: '/club/registrations', label: 'Registrations', icon: Users },
          { to: '/club/attendance', label: 'QR Attendance', icon: CheckCircle2 },
          { to: '/club/roles', label: 'Dynamic Roles', icon: Shield },
          { to: '/club/certificates', label: 'Certificates', icon: Award },
        ];
      case 'STUDENT':
      default:
        return [
          { to: '/dashboard', label: 'Passport Dashboard', icon: LayoutDashboard },
          { to: '/student/clubs', label: 'Explore Clubs', icon: Shield },
          { to: '/student/events', label: 'Browse Events', icon: Calendar },
          { to: '/student/registrations', label: 'My Registrations', icon: CheckCircle2 },
          { to: '/student/od', label: 'My OD Requests', icon: Clock },
          { to: '/student/certificates', label: 'Certificates', icon: Award },
          { to: '/student/badges', label: 'Badges & Passport', icon: Sparkles },
        ];
    }
  };

  const navLinks = getNavLinks();

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    ADMIN: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    CLUB_ADMIN: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    FACULTY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    STUDENT: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col z-20">
        {/* Brand */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                CampusFlow
              </h1>
              <p className="text-[10px] text-indigo-400 font-semibold uppercase tracking-wider">
                Hackathon Edition
              </p>
            </div>
          </div>
        </div>

        {/* Demo Role Quick Switcher */}
        <div className="p-4 border-b border-slate-800/60 bg-slate-950/40">
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-xs"
            >
              <div className="flex items-center space-x-2 truncate">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${roleColors[user.system_role]}`}>
                  {user.system_role}
                </span>
                <span className="truncate font-medium text-slate-200">{user.full_name}</span>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
            </button>

            {roleMenuOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-2 z-50 text-xs">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Demo Role Switcher
                </div>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleRoleSwitch(acc.email)}
                    className={`w-full text-left px-3 py-2 hover:bg-slate-800/80 transition-colors flex items-center justify-between ${
                      user.email === acc.email ? 'bg-indigo-950/40 text-indigo-300 font-semibold' : 'text-slate-300'
                    }`}
                  >
                    <span>{acc.label}</span>
                    {user.email === acc.email && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{user.full_name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
            {user.ra_number && (
              <p className="text-[10px] text-indigo-400 font-mono mt-0.5">RA: {user.ra_number}</p>
            )}
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-10">
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400">Current Context:</span>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${roleColors[user.system_role]}`}>
              {user.system_role} VIEW
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-xs bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-700/50 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Academic Timetable Active</span>
            </div>
            <button className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-500"></span>
            </button>
          </div>
        </header>

        {/* Scrollable View Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};
