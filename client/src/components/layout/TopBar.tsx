import { Menu, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { createAuditLog } from '@/service/Audit';

interface TopBarProps {
  toggleSidebar: () => void;
}

export default function TopBar({ toggleSidebar }: TopBarProps) {
  const { user } = useAuth();
  const now = new Date();

  const onLogout = async () => {
    if (user && user.email) {
      createAuditLog({
        userId: user?.id,
        action: 'logout',
        details: `Logged out of the system`,
        email: user.email,
      });
    }
  };

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center md:hidden">
          <button className="text-secondary-500 hover:text-secondary-600" onClick={toggleSidebar}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="ml-3 text-lg font-semibold">CyberPulse</h1>
        </div>

        <div className="hidden md:block">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold">Cyber Risk Dashboard</h2>
            <div className="ml-4 flex items-center bg-secondary-50 rounded-full px-3 py-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-primary-500 mr-2"></span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary-500" />
            <span className="text-sm text-secondary-600 hidden sm:inline-block">{format(now, 'MMMM d, yyyy')}</span>
          </div>

          <div className="border-l border-secondary-200 h-6 mx-2"></div>

          <Button variant="ghost" size="sm" asChild>
            <a onClick={onLogout} href="/api/logout" className="text-secondary-600 hover:text-secondary-900">
              Log out
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}
