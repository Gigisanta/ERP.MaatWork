import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './store/authStore';
import { useEffect, Suspense, lazy } from 'react';
import { supabase } from './lib/supabase';
import Login from './pages/Login';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Register from './pages/Register';
import ApprovalPendingPage from './pages/ApprovalPendingPage';

// Lazy loading de componentes principales
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TeamManagement = lazy(() => import('./pages/TeamManagement'));
const CRMPage = lazy(() => import('./pages/CRMPage'));
const Team = lazy(() => import('./pages/Team'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));

// Importación directa para NotionCRM (evitar problemas de lazy loading)
import NotionCRM from './pages/NotionCRM';
import NotionCallback from './pages/NotionCallback';

// Team management pages con lazy loading
const Approvals = lazy(() => import('./pages/team/Approvals'));
const Invitations = lazy(() => import('./pages/team/Invitations'));
const Tasks = lazy(() => import('./pages/team/Tasks'));
const Metrics = lazy(() => import('./pages/team/Metrics'));
const Settings = lazy(() => import('./pages/team/Settings'));
const AdvisorProfile = lazy(() => import('./pages/team/AdvisorProfile'));

// Manager components
import ManagerDashboard from './components/manager/ManagerDashboard';
import TeamOverview from './components/team/TeamOverview';
import AdvisorMetrics from './components/team/AdvisorMetrics';
import PerformanceComparison from './components/team/PerformanceComparison';
import TeamContactView from './components/manager/TeamContactView';

export default function App() {
  const { inicializarListenerAutenticacion } = useAuthStore();

  // Inicializar listener de autenticación de Supabase
  useEffect(() => {
    console.log('🚀 APP: Inicializando listener de autenticación');
    inicializarListenerAutenticacion();
  }, [inicializarListenerAutenticacion]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
        {/* Rutas de autenticación */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        <Route 
          path="/register" 
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } 
        />
        <Route 
          path="/approval-pending" 
          element={
            <PublicRoute>
              <ApprovalPendingPage />
            </PublicRoute>
          }
        />
        
        {/* Ruta CRM con Layout personalizado */}
        <Route 
          path="/crm" 
          element={
            <ProtectedRoute>
              <Suspense fallback={<LoadingSpinner />}>
                <CRMPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta NotionCRM fullscreen sin Layout */}
        <Route 
          path="/notion-crm" 
          element={
            <ProtectedRoute>
              <NotionCRM />
            </ProtectedRoute>
          } 
        />
        
        {/* Ruta callback de Notion OAuth */}
        <Route 
          path="/notion/callback" 
          element={
            <ProtectedRoute>
              <NotionCallback />
            </ProtectedRoute>
          } 
        />
        
        {/* Rutas protegidas con Layout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Dashboard />
            </Suspense>
          } />

          <Route path="team" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Team />
            </Suspense>
          } />
          <Route path="team/approvals" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Approvals />
            </Suspense>
          } />
          <Route path="team/invitations" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Invitations />
            </Suspense>
          } />
          <Route path="team/tasks" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Tasks />
            </Suspense>
          } />
          <Route path="team/metrics" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Metrics />
            </Suspense>
          } />
          <Route path="team/settings" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Settings />
            </Suspense>
          } />
          <Route path="team/advisor/:id" element={
            <Suspense fallback={<LoadingSpinner />}>
              <AdvisorProfile />
            </Suspense>
          } />
          <Route path="manager/dashboard" element={<ManagerDashboard />} />
          <Route path="manager/team-overview" element={<TeamOverview />} />
          <Route path="manager/advisor-metrics" element={<AdvisorMetrics />} />
          <Route path="manager/performance-comparison" element={<PerformanceComparison />} />
          <Route path="manager/team-contacts" element={<TeamContactView />} />
          <Route path="profile" element={
            <Suspense fallback={<LoadingSpinner />}>
              <Profile />
            </Suspense>
          } />
          <Route path="admin" element={
            <Suspense fallback={<LoadingSpinner />}>
              <AdminPanel />
            </Suspense>
          } />
        </Route>
        

        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
