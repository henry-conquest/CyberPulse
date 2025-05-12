import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Reports from "@/pages/reports";
import ReportView from "@/pages/report-view";
import Recommendations from "@/pages/recommendations";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Tenants from "@/pages/tenants";
import Integrations from "@/pages/integrations";

import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";

function ProtectedRoute({ component: Component, roles, ...rest }: { 
  component: React.ComponentType<any>;
  roles?: string[];
  [key: string]: any;
}) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }
  
  if (!user) {
    // Redirect to login
    window.location.href = "/api/login";
    return null;
  }
  
  // Check role-based access
  if (roles && user.role && !roles.includes(user.role)) {
    return <NotFound />;
  }
  
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={Reports} />} />
      <Route path="/reports/:id" component={({ params }) => (
        <ProtectedRoute component={ReportView} id={params.id} />
      )} />
      <Route path="/recommendations" component={() => <ProtectedRoute component={Recommendations} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/users" component={() => <ProtectedRoute component={Users} roles={["admin"]} />} />
      <Route path="/tenants" component={() => <ProtectedRoute component={Tenants} roles={["admin"]} />} />
      <Route path="/integrations" component={() => <ProtectedRoute component={Integrations} roles={["admin"]} />} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Layout>
        <Router />
      </Layout>
    </TooltipProvider>
  );
}

export default App;
