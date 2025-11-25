"use client";
import { useSidebar } from './SidebarContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { collapsed } = useSidebar();

  return (
    <main 
      className={`min-h-screen bg-background transition-all duration-300 ease-in-out ${
        collapsed ? 'lg:ml-14' : 'lg:ml-64'
      } lg:pt-4`}
    >
      {children}
    </main>
  );
}

