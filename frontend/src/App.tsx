import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

import { Layout } from './components/Layout';
import { RoleRoute } from './components/RoleRoute';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { DashboardShell } from './pages/DashboardShell';

// Student Pages
import { DiscoverEvents } from './pages/student/DiscoverEvents';
import { EventDetails } from './pages/student/EventDetails';
import { MyEvents } from './pages/student/MyEvents';
import { MyOD } from './pages/student/MyOD';
import { MyCertificates } from './pages/student/MyCertificates';
import { MyBadges } from './pages/student/MyBadges';
import { NotificationCenter } from './pages/notifications/NotificationCenter';
import { StudentAnalytics } from './pages/analytics/StudentAnalytics';

// Club Admin Pages
import { ClubEvents } from './pages/club_admin/ClubEvents';
import { CreateEvent } from './pages/club_admin/CreateEvent';
import { ClubEventDetails } from './pages/club_admin/ClubEventDetails';
import { EventRegistrations } from './pages/club_admin/EventRegistrations';

// Faculty Pages
import { FacultyDashboard } from './pages/faculty/FacultyDashboard';
import { EventApprovals } from './pages/faculty/EventApprovals';
import { ODApprovals } from './pages/faculty/ODApprovals';
import { FacultyAnalytics } from './pages/faculty/FacultyAnalytics';
import { FacultyMessages } from './pages/faculty/FacultyMessages';

// Super Admin Pages
import { SuperAdminDashboard } from './pages/super_admin/SuperAdminDashboard';
import { TimetableManagement } from './pages/super_admin/TimetableManagement';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading CampusFlow...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardShell />
              </ProtectedRoute>
            }
          />

          {/* Student Protected Routes */}
          <Route
            path="/student/events"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <DiscoverEvents />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/events/:id"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <EventDetails />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/registrations"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <MyEvents />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/my-events"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <MyEvents />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/od"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <MyOD />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/certificates"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <MyCertificates />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/badges"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <MyBadges />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/notifications"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT', 'CLUB_ADMIN', 'FACULTY', 'ADMIN', 'SUPER_ADMIN']}>
                  <NotificationCenter />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/analytics"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['STUDENT']}>
                  <StudentAnalytics />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Club Admin Protected Routes */}
          <Route
            path="/club-admin/events"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['CLUB_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                  <ClubEvents />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/club-admin/events/create"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['CLUB_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                  <CreateEvent />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/club-admin/events/:id"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['CLUB_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                  <ClubEventDetails />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/club-admin/registrations"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['CLUB_ADMIN', 'ADMIN', 'SUPER_ADMIN']}>
                  <EventRegistrations />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Faculty Protected Routes */}
          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['FACULTY', 'ADMIN', 'SUPER_ADMIN']}>
                  <FacultyDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/event-approvals"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['FACULTY', 'ADMIN', 'SUPER_ADMIN']}>
                  <EventApprovals />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/od-approvals"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['FACULTY', 'ADMIN', 'SUPER_ADMIN']}>
                  <ODApprovals />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/analytics"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['FACULTY', 'ADMIN', 'SUPER_ADMIN']}>
                  <FacultyAnalytics />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/messages"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['FACULTY', 'ADMIN', 'SUPER_ADMIN']}>
                  <FacultyMessages />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Super Admin Protected Routes */}
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <SuperAdminDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />
          <Route
            path="/super-admin/timetable"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={['SUPER_ADMIN']}>
                  <TimetableManagement />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Catch-all fallback */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <DashboardShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
