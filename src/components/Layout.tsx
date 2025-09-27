import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationToast from './NotificationToast';
import Breadcrumbs from './Breadcrumbs';
import KeyboardShortcuts from './KeyboardShortcuts';
import InteractionDiagnostic from './InteractionDiagnostic';
import { isProduction } from '../config/environment';
import { cn } from '../lib/utils';

interface LayoutProps {
  children?: React.ReactNode;
  pageTitle?: string;
  pageDescription?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, pageTitle, pageDescription }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 animate-fade-in">
      <Sidebar 
        expanded={sidebarExpanded} 
        onToggle={() => setSidebarExpanded(!sidebarExpanded)} 
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          onMenuClick={() => setSidebarExpanded(!sidebarExpanded)}
          pageTitle={pageTitle}
          pageDescription={pageDescription}
        />
        <main className="flex-1 overflow-auto container mx-auto px-6 py-8 space-y-6 bg-gradient-to-br from-cactus-50 to-cactus-100 dark:from-neutral-900 dark:to-neutral-800">
          <div className="max-w-7xl mx-auto w-full">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
              <Breadcrumbs />
            </div>
            <div className="space-y-4">
              {children || <Outlet />}
            </div>
          </div>
        </main>
        
        {/* Botón flotante para expandir sidebar cuando está colapsado */}
        {!sidebarExpanded && (
          <button
            onClick={() => setSidebarExpanded(true)}
            className="fixed left-4 bottom-6 z-50 bg-gradient-to-r from-cactus-400 to-cactus-500 hover:from-cactus-500 hover:to-cactus-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 animate-bounce-gentle group"
          >
            <Menu className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" />
          </button>
        )}
      </div>
      <NotificationToast />
      
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts />
      
      {/* Interaction Diagnostic (solo en desarrollo para evitar sobrecarga en prod) */}
      {!isProduction() && <InteractionDiagnostic />}
    </div>
  );
};

export default Layout;