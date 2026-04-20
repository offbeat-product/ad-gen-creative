import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ProjectContextBar from '@/components/ProjectContextBar';

const AppLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <ProjectContextBar />
        <main className="flex-1 min-w-0 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
