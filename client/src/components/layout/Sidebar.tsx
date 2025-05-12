import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  FileText, 
  HelpCircle, 
  Settings, 
  Users, 
  Shield, 
  Building,
  CalendarDays,
  Grid
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

  const isAdmin = user?.role === "ADMIN";
  
  // Check if we're in a tenant-specific route
  const tenantMatch = location.match(/\/tenants\/(\d+)/);
  const currentTenantId = tenantMatch ? tenantMatch[1] : null;
  
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
                Analyst
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 space-y-1">
          <div className="text-white/80 text-xs uppercase font-semibold mb-2">
            Menu
          </div>
          
          <NavItem 
            href="/companies" 
            icon={<Grid className="h-5 w-5" />}
            isActive={location === "/" || location === "/companies"}
          >
            Companies
          </NavItem>
          
          {currentTenantId ? (
            <>
              <div className="border-t border-white/10 my-3 pt-3">
                <div className="text-white/80 text-xs uppercase font-semibold mb-2">
                  Company Dashboard
                </div>
                
                <NavItem 
                  href={`/tenants/${currentTenantId}/dashboard`} 
                  icon={<BarChart3 className="h-5 w-5" />}
                  isActive={location.endsWith("/dashboard")}
                >
                  Dashboard
                </NavItem>
                
                <NavItem 
                  href={`/tenants/${currentTenantId}/report-periods`} 
                  icon={<CalendarDays className="h-5 w-5" />}
                  isActive={location.endsWith("/report-periods")}
                >
                  Report Periods
                </NavItem>
                
                <NavItem 
                  href={`/tenants/${currentTenantId}/reports`} 
                  icon={<FileText className="h-5 w-5" />}
                  isActive={location.includes("/reports") && !location.includes("/report-periods")}
                >
                  Reports
                </NavItem>
                
                <NavItem 
                  href={`/tenants/${currentTenantId}/recommendations`} 
                  icon={<HelpCircle className="h-5 w-5" />}
                  isActive={location.endsWith("/recommendations")}
                >
                  Recommendations
                </NavItem>
              </div>
            </>
          ) : null}
          
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
