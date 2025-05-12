import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  FileText, 
  HelpCircle, 
  Settings, 
  Users, 
  Shield, 
  Mail,
  Building 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
}

function NavItem({ href, icon, children, isActive }: NavItemProps) {
  return (
    <Link href={href}>
      <a className={cn(
        "flex items-center space-x-2 px-3 py-2 rounded hover:bg-secondary-800 text-secondary-300",
        isActive && "bg-primary-700 text-white"
      )}>
        {icon}
        <span>{children}</span>
      </a>
    </Link>
  );
}

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<number | null>(
    user?.tenants?.[0]?.id || null
  );

  const isAdmin = user?.role === "admin";
  
  function handleTenantChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedTenant(parseInt(e.target.value));
  }

  return (
    <div className={cn(
      "w-64 bg-secondary-900 text-white fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-4 border-b border-secondary-700">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold">
            CP
          </div>
          <h1 className="text-xl font-bold">CyberPulse</h1>
        </div>
      </div>
      
      <div className="p-4">
        {user?.tenants && user.tenants.length > 0 && (
          <div className="mb-4">
            <div className="text-secondary-400 text-xs uppercase font-semibold mb-2">
              Organization
            </div>
            <select 
              className="bg-secondary-800 text-white rounded w-full p-2 text-sm"
              value={selectedTenant || ""}
              onChange={handleTenantChange}
            >
              {user.tenants.map(tenant => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="mt-6 space-y-1">
          <div className="text-secondary-400 text-xs uppercase font-semibold mb-2">
            Menu
          </div>
          
          <NavItem 
            href="/" 
            icon={<BarChart3 className="h-5 w-5" />}
            isActive={location === "/"}
          >
            Dashboard
          </NavItem>
          
          <NavItem 
            href="/reports" 
            icon={<FileText className="h-5 w-5" />}
            isActive={location.startsWith("/reports")}
          >
            Reports
          </NavItem>
          
          <NavItem 
            href="/recommendations" 
            icon={<HelpCircle className="h-5 w-5" />}
            isActive={location === "/recommendations"}
          >
            Recommendations
          </NavItem>
          
          <NavItem 
            href="/settings" 
            icon={<Settings className="h-5 w-5" />}
            isActive={location === "/settings"}
          >
            Settings
          </NavItem>
        </div>
        
        {isAdmin && (
          <div className="mt-8">
            <div className="text-secondary-400 text-xs uppercase font-semibold mb-2">
              Admin
            </div>
            
            <NavItem 
              href="/users" 
              icon={<Users className="h-5 w-5" />}
              isActive={location === "/users"}
            >
              Users
            </NavItem>
            
            <NavItem 
              href="/tenants" 
              icon={<Building className="h-5 w-5" />}
              isActive={location === "/tenants"}
            >
              Tenants
            </NavItem>
            
            <NavItem 
              href="/integrations" 
              icon={<Shield className="h-5 w-5" />}
              isActive={location === "/integrations"}
            >
              Integrations
            </NavItem>
          </div>
        )}
      </div>
      
      <div className="mt-auto p-4 border-t border-secondary-700">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
            {user?.firstName?.[0] || user?.email?.[0] || "U"}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              {user?.firstName || user?.email?.split('@')[0] || "User"}
            </p>
            <p className="text-xs text-secondary-400">
              {user?.role === "admin" ? "Administrator" : 
                user?.role === "analyst" ? "Security Analyst" : 
                user?.role === "account_manager" ? "Account Manager" : "User"}
            </p>
          </div>
        </div>
        <div className="mt-3">
          <a 
            href="/api/logout" 
            className="text-xs text-secondary-400 hover:text-secondary-300"
          >
            Log out
          </a>
        </div>
      </div>
    </div>
  );
}
