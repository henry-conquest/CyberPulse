import React from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useAuth } from "@/hooks/useAuth";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-2xl font-bold">Welcome to CyberPulse</h1>
        <p className="mb-6 max-w-md text-secondary-600">
          Please log in to access your cyber risk dashboard and reports.
        </p>
        <a
          href="/api/login"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          Log In
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        
        <main className="flex-1 overflow-y-auto bg-secondary-50 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
