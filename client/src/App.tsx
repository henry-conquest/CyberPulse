import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Companies from "@/pages/companies";
import Reports from "@/pages/reports";
import ReportPeriods from "@/pages/report-periods";
import ReportView from "@/pages/report-view";
import EditReport from "@/pages/edit-report";
import RiskStats from "@/pages/risk-stats";
import Recommendations from "@/pages/recommendations";
import GlobalRecommendations from "@/pages/global-recommendations";
import GlobalAdmins from "@/pages/global-admins";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Tenants from "@/pages/tenants";
import Integrations from "./pages/integrations";
import SecureScorePage from "@/pages/secure-score";
import LoginPage from "@/pages/login";

import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/layout/Layout";
import { UserRoles } from "@shared/schema";

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
    // Use Redirect component instead of window.location for SPA navigation
    return <Redirect to="/login" />;
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
      {/* Login route - directly accessible */}
      <Route path="/login" component={LoginPage} />
      
      {/* Main routes */}
      <Route path="/" component={() => <ProtectedRoute component={Companies} />} />
      <Route path="/companies" component={() => <ProtectedRoute component={Companies} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />
      
      {/* Integration routes - expanded to handle query parameters */}
      <Route path="/integrations" component={() => {
        // Extract query parameters directly
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get('tab') || undefined;
        const action = searchParams.get('action') || undefined;
        return <ProtectedRoute component={Integrations} roles={[UserRoles.ADMIN]} tab={tab} action={action} />;
      }} />
      
      {/* Tenant-specific routes */}
      <Route path="/tenants/:tenantId/dashboard" component={({ params }) => (
        <ProtectedRoute component={Dashboard} tenantId={params.tenantId} />
      )} />
      <Route path="/tenants/:tenantId/secure-score" component={({ params }) => (
        <ProtectedRoute component={SecureScorePage} tenantId={params.tenantId} />
      )} />
      <Route path="/tenants/:tenantId/reports" component={({ params }) => (
        <ProtectedRoute component={Reports} tenantId={params.tenantId} />
      )} />
      <Route path="/tenants/:tenantId/report-periods" component={({ params }) => (
        <ProtectedRoute component={ReportPeriods} tenantId={params.tenantId} />
      )} />
      <Route path="/tenants/:tenantId/reports/:id" component={({ params }) => (
        <ProtectedRoute component={ReportView} tenantId={params.tenantId} id={params.id} />
      )} />
      <Route path="/tenants/:tenantId/reports/:id/risk-stats" component={({ params }) => (
        <ProtectedRoute component={RiskStats} tenantId={params.tenantId} id={params.id} />
      )} />
      <Route path="/tenants/:tenantId/reports/:reportId/edit" component={({ params }) => (
        <ProtectedRoute 
          component={EditReport} 
          tenantId={params.tenantId} 
          reportId={params.reportId} 
          roles={[UserRoles.ADMIN, UserRoles.ANALYST]}
        />
      )} />
      <Route path="/tenants/:tenantId/recommendations" component={({ params }) => (
        <ProtectedRoute component={Recommendations} tenantId={params.tenantId} />
      )} />
      
      {/* Admin routes */}
      <Route path="/users" component={() => <ProtectedRoute component={Users} roles={[UserRoles.ADMIN]} />} />
      <Route path="/tenants" component={() => <ProtectedRoute component={Tenants} roles={[UserRoles.ADMIN]} />} />
      <Route path="/global-recommendations" component={() => <ProtectedRoute component={GlobalRecommendations} roles={[UserRoles.ADMIN, UserRoles.ANALYST]} />} />
      
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
