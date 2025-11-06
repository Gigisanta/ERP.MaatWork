"use client";
import React, { useState } from 'react';
import { Drawer, Sidebar } from '@cactus/ui';
import NavigationNew from './NavigationNew';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sections = [
    {
      title: 'General',
      items: [
        { label: 'Inicio', href: '/', icon: 'Home' as const },
        { label: 'Contactos', href: '/contacts', icon: 'Users' as const },
        { label: 'Métricas', href: '/contacts/metrics', icon: 'BarChart2' as const },
      ],
    },
  ];

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[240px_1fr]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <Sidebar sections={sections} defaultCollapsed={false} />
      </aside>

      {/* Main content */}
      <div className="min-h-screen flex flex-col">
        <NavigationNew
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          sidebarOpen={sidebarOpen}
        />

        {/* Mobile Drawer */}
        <Drawer open={sidebarOpen} onOpenChange={setSidebarOpen} side="left">
          <Sidebar
            sections={sections}
            isOpen={sidebarOpen}
            onOpenChange={setSidebarOpen}
          />
        </Drawer>

        <main className="flex-1 bg-background">{children}</main>
      </div>
    </div>
  );
}


