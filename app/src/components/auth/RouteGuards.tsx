import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRole } from '@/types';

const defaultPathByRole: Record<UserRole, string> = {
  admin: '/admin',
  technician: '/tech/available-jobs',
};

function loginPathForRole(role: UserRole) {
  return role === 'admin' ? '/admin/login' : '/tech/login';
}

export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { user, isAuthenticated, hasBackendTechnicianToken } = useAuth();
  const location = useLocation();

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={loginPathForRole(role)}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  if (user.role !== role) {
    return <Navigate to={defaultPathByRole[user.role]} replace />;
  }

  if (role === 'technician' && !hasBackendTechnicianToken) {
    return (
      <Navigate
        to={loginPathForRole(role)}
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}

export function PublicOnly({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, hasBackendTechnicianToken } = useAuth();

  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  if (user.role === 'technician' && !hasBackendTechnicianToken) {
    return <>{children}</>;
  }

  return <Navigate to={defaultPathByRole[user.role]} replace />;
}

export function HomeRoute() {
  const { user, isAuthenticated, hasBackendTechnicianToken } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (user.role === 'technician' && !hasBackendTechnicianToken) {
    return <Navigate to="/tech/login" replace />;
  }

  return <Navigate to={defaultPathByRole[user.role]} replace />;
}
