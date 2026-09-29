import React from 'react';
import { DashboardShell } from './DashboardShell';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return <DashboardShell>{children}</DashboardShell>;
};

export { DashboardShell };
export default Layout;
