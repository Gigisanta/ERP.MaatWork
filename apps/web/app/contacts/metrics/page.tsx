'use client';
import { useRequireAuth } from '@/auth/useRequireAuth';
import MetricsView from './MetricsView';

export default function MetricsPage() {
  const { loading } = useRequireAuth();

  if (loading) {
    return null; // El hook useRequireAuth maneja la redirección automáticamente
  }

  return <MetricsView />;
}
