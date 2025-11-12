"use client";

import { useRequireAuth } from '../auth/useRequireAuth';
import { usePageTitle } from '../components/PageTitleContext';
import CapacitacionesList from './CapacitacionesList';

export default function CapacitacionesPage() {
  const { loading } = useRequireAuth();
  usePageTitle('Capacitaciones');

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <CapacitacionesList />
      </div>
    </div>
  );
}










