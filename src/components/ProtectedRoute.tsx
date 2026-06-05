import { Navigate, Outlet } from 'react-router-dom';
import { useUserStore } from '@/stores/useUserStore';

export function ProtectedRoute() {
  const { nickname } = useUserStore();

  if (!nickname || nickname.trim().length === 0) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
