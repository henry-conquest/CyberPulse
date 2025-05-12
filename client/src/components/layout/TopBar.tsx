import { Bell, HelpCircle, Menu, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";

interface TopBarProps {
  toggleSidebar: () => void;
}

export default function TopBar({ toggleSidebar }: TopBarProps) {
  const { user } = useAuth();
  const now = new Date();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center md:hidden">
          <button 
            className="text-secondary-500 hover:text-secondary-600"
            onClick={toggleSidebar}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="ml-3 text-lg font-semibold">CyberPulse</h1>
        </div>

        <div className="hidden md:block">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold">Cyber Risk Dashboard</h2>
            <div className="ml-4 flex items-center bg-secondary-50 rounded-full px-3 py-1 text-sm">
              <span className="w-2 h-2 rounded-full bg-primary-500 mr-2"></span>
              <span className="text-secondary-600">
                Last updated: {format(now, "MMMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button className="text-secondary-400 hover:text-secondary-600 relative">
            <Bell className="h-6 w-6" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary-600"></span>
          </button>

          <button className="text-secondary-400 hover:text-secondary-600">
            <HelpCircle className="h-6 w-6" />
          </button>

          <div className="border-l border-secondary-200 h-6 mx-2"></div>

          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white md:hidden">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center text-sm text-secondary-700 hover:text-secondary-900 hidden md:flex">
                  <span className="mr-1">
                    {user?.firstName || user?.email?.split('@')[0] || "User"}
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="/api/logout" className="cursor-pointer">Log out</a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
