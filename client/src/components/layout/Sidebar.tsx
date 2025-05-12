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
  Building,
  CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";
import logoImg from "../../assets/logo.png";

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
        "flex items-center space-x-2 px-3 py-2 rounded hover:bg-white/10 text-white/80",
        isActive && "bg-white/15 text-white font-medium"
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
      "w-64 bg-[#146d87] text-white fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-center">
          <img 
            src={logoImg} 
            alt="ConquestWildman" 
            className="h-12 w-auto my-2 brightness-0 invert" 
          />
        </div>
      </div>
      
      <div className="p-4">
        {/* User Info */}
        <div className="mb-6">
          <div className="flex items-center mb-3">
            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-lg">
              {user?.firstName?.[0] || user?.email?.[0] || "U"}
            </div>
            <div className="ml-3">
              <p className="text-base font-medium">
                {user?.firstName || user?.email?.split('@')[0] || "User"}
              </p>
              <p className="text-xs text-white/70">
                Microsoft 365 SSO
              </p>
            </div>
          </div>
          
          {/* Tenant Selector */}
          {user?.tenants && user.tenants.length > 0 && (
            <div className="mt-3">
              <div className="text-white/80 text-xs uppercase font-semibold mb-2">
                Client Organization
              </div>
              <select 
                className="bg-white/10 border border-white/20 text-white rounded w-full p-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
                value={selectedTenant || ""}
                onChange={handleTenantChange}
              >
                {user.tenants.map(tenant => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-white/60 mt-1">
                Data: Q2 2025 (Apr-Jun)
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-6 space-y-1">
          <div className="text-white/80 text-xs uppercase font-semibold mb-2">
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
          
          {/* Report Periods moved to after client selection */}
          
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
            <div className="text-white/80 text-xs uppercase font-semibold mb-2">
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
      
      <div className="mt-auto p-4 border-t border-white/20">
        <a 
          href="/api/logout" 
          className="text-xs text-white/70 hover:text-white flex items-center"
        >
          <span className="mr-1">Log out</span>
        </a>
      </div>
    </div>
  );
}
