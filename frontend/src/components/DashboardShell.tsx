import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import notificationService from '../services/notificationService';

import { 
  LayoutDashboard, Users, Shield, Calendar, Award, 
  Bell, LogOut, Sparkles, ChevronDown, CheckCircle2,
  Clock, MessageSquare, Layers, Plus
} from 'lucide-react';

interface DashboardShellProps {
  children: React.ReactNode;
}

export const DashboardShell: React.FC<DashboardShellProps> = ({ children }) => {
  const { user, logout, switchDemoRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);

  useEffect(() => {
    if (user) {
      notificationService.getUnreadNotificationCount()
        .then(res => setUnreadNotifCount(res.unread_count))
        .catch(() => setUnreadNotifCount(0));
    }
  }, [user, location.pathname]);

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
          { to: '/super-admin/timetable', label: 'Timetable Manager', icon: Clock },
          { to: '/faculty/analytics', label: 'Analytics', icon: Layers },
          { to: '/student/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifCount },
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
          { to: '/faculty/analytics', label: 'Analytics', icon: Layers },
          { to: '/faculty/messages', label: 'Messages', icon: MessageSquare },
          { to: '/student/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifCount },
        ];
      case 'CLUB_ADMIN':
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/club-admin/events', label: 'Events Manager', icon: Calendar },
          { to: '/club-admin/events/create', label: 'Create Event', icon: Plus },
          { to: '/club-admin/registrations', label: 'Registrations', icon: Users },
        ];
      case 'STUDENT':
      default:
        return [
          { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { to: '/student/events', label: 'Discover Events', icon: Calendar },
          { to: '/student/my-events', label: 'My Events', icon: CheckCircle2 },
          { to: '/student/od', label: 'My OD', icon: Clock },
          { to: '/student/certificates', label: 'Certificates', icon: Award },
          { to: '/student/badges', label: 'Badges', icon: Sparkles },
          { to: '/student/notifications', label: 'Notifications', icon: Bell, badge: unreadNotifCount },
          { to: '/student/analytics', label: 'Analytics', icon: Layers },
        ];
    }
  };

  const navLinks = getNavLinks();

  const roleBadgeStyles: Record<string, string> = {
    SUPER_ADMIN: 'bg-rose-50 text-rose-700 border-rose-200',
    ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
    CLUB_ADMIN: 'bg-amber-50 text-amber-800 border-amber-200',
    FACULTY: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    STUDENT: 'bg-blue-50 text-blue-700 border-blue-200',
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans">
      {/* Reusable Desktop Sidebar (~240px width) */}
      <aside className="w-60 bg-white border-r border-slate-200 flex flex-col z-20 shrink-0">
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-tight text-slate-900 leading-tight">
                CampusFlow
              </h1>
              <p className="text-[10px] text-blue-600 font-medium tracking-wide">
                Campus Club Platform
              </p>
            </div>
          </div>
        </div>

        {/* Demo Role Quick Switcher */}
        <div className="p-3 border-b border-slate-200 bg-slate-50/70">
          <div className="relative">
            <button
              type="button"
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 transition-all text-xs cursor-pointer shadow-xs"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${roleBadgeStyles[user.system_role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                  {user.system_role}
                </span>
                <span className="truncate text-xs font-medium text-slate-700">{user.full_name}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {roleMenuOpen && (
              <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-lg shadow-lg py-1.5 z-50 text-xs">
                <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Quick Demo Switcher
                </div>
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => handleRoleSwitch(acc.email)}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer ${
                      user.email === acc.email ? 'bg-blue-50/80 text-blue-700 font-medium' : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{acc.label}</span>
                    {user.email === acc.email && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold bg-blue-600 text-white rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile & Logout */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-slate-800 truncate">{user.full_name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            {user.ra_number && (
              <p className="text-[10px] text-blue-600 font-mono mt-0.5">RA: {user.ra_number}</p>
            )}
          </div>
          <button
            type="button"
            onClick={logout}
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center space-x-3">
            <span className="text-xs text-slate-500">Context:</span>
            <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${roleBadgeStyles[user.system_role] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
              {user.system_role} VIEW
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1.5 text-xs bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Academic Timetable Active</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/student/notifications')}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifCount > 0 && (
                <span className="absolute top-1 right-1 px-1 min-w-[14px] text-[9px] font-bold text-white bg-blue-600 rounded-full flex items-center justify-center">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
