"use client";
import { useRequireAuth } from '../../../auth/useRequireAuth';
import HistoryView from './HistoryView';

export default function HistoryPage() {
  const { loading } = useRequireAuth();

  if (loading) {
    return null; // El hook useRequireAuth maneja la redirección automáticamente
  }

  return <HistoryView />;
}

