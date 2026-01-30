import React from 'react';
import logoImg from '../../assets/logo.png';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAuth } from '@/hooks/useAuth';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Simple email validation
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail) return;

    setIsSubmitting(true);

    // Extract domain from email
    const domain = email.split('@')[1];

    // Redirect to backend login route
    window.location.href = `/api/login?domain=${encodeURIComponent(domain)}`;
  };

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
        <img src={logoImg} className="w-[30rem] h-auto" alt="Company Logo" />
        <h1 className="mb-5 mt-[-11px] text-3xl font-montserrat text-brand-green">Cyber Risk Management</h1>

        <form onSubmit={handleLogin} className="flex flex-col items-center space-y-4 w-[20rem]">
          <input
            name="email"
            autoComplete="email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-center focus:border-brand-teal focus:ring-2 focus:ring-brand-teal focus:outline-none"
          />

          <button
            type="submit"
            disabled={!isValidEmail || isSubmitting}
            className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-white font-montserrat transition-colors w-full ${
              isValidEmail && !isSubmitting ? 'bg-brand-teal hover:bg-brand-teal/90' : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? 'Redirecting...' : 'Login with Microsoft'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-secondary-50 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
