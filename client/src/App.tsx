import { Switch, Route } from 'wouter';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

import NotFound from '@/pages/not-found';
import Dashboard from '@/pages/dashboard';
import Companies from './pages/Companies/Companies';
import Reports from '@/pages/reports';
import ReportPeriods from '@/pages/report-periods';
import ReportView from '@/pages/report-view';
import EditReport from '@/pages/edit-report';
import RiskStats from '@/pages/risk-stats';
import Recommendations from '@/pages/recommendations';
import GlobalRecommendations from '@/pages/global-recommendations';
import GlobalAdmins from '@/pages/global-admins';
import Settings from '@/pages/Settings/Settings';
import UsersTab from './pages/Settings/tabs/Users/UsersTab';
import Tenants from '@/pages/tenants';
import Integrations from './pages/integrations';
import SecureScorePage from '@/pages/secure-score';

import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { UserRoles } from '@shared/schema';
import AcceptInvite from './pages/AcceptInvite/AcceptInvite';
import CompanyDetails from './pages/CompanyDetails/CompanyDetails';
import KnownLocations from './pages/Widgets/KnownLocations';
import PhishResistantMFA from './pages/Widgets/PhishResistantMFA';

function ProtectedRoute({
  component: Component,
  roles,
  ...rest
}: {
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
    window.location.href = '/api/login';
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
      {/* Main routes */}
      <Route path="/" component={() => <ProtectedRoute component={Companies} />} />
      <Route path="/companies" component={() => <ProtectedRoute component={Companies} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

      {/* Integration routes - expanded to handle query parameters */}
      <Route
        path="/integrations"
        component={() => {
          // Extract query parameters directly
          const searchParams = new URLSearchParams(window.location.search);
          const tab = searchParams.get('tab') || undefined;
          const action = searchParams.get('action') || undefined;
          return <ProtectedRoute component={Integrations} roles={[UserRoles.ADMIN]} tab={tab} action={action} />;
        }}
      />

      {/* Tenant-specific routes */}
      <Route
        path="/tenants/:tenantId/dashboard"
        component={({ params }) => <ProtectedRoute component={Dashboard} tenantId={params.tenantId} />}
      />
      <Route
        path="/tenants/:tenantId/secure-score"
        component={({ params }) => <ProtectedRoute component={SecureScorePage} tenantId={params.tenantId} />}
      />
      <Route
        path="/tenants/:tenantId/reports"
        component={({ params }) => <ProtectedRoute component={Reports} tenantId={params.tenantId} />}
      />
      <Route
        path="/tenants/:tenantId/report-periods"
        component={({ params }) => <ProtectedRoute component={ReportPeriods} tenantId={params.tenantId} />}
      />
      <Route
        path="/tenants/:tenantId/details"
        component={({ params }) => <ProtectedRoute component={CompanyDetails} tenantId={params.tenantId} />}
      />
      <Route
        path="/tenants/:tenantId/reports/:id"
        component={({ params }) => <ProtectedRoute component={ReportView} tenantId={params.tenantId} id={params.id} />}
      />
      <Route
        path="/tenants/:tenantId/reports/:id/risk-stats"
        component={({ params }) => <ProtectedRoute component={RiskStats} tenantId={params.tenantId} id={params.id} />}
      />
      <Route
        path="/tenants/:tenantId/reports/:reportId/edit"
        component={({ params }) => (
          <ProtectedRoute
            component={EditReport}
            tenantId={params.tenantId}
            reportId={params.reportId}
            roles={[UserRoles.ADMIN, UserRoles.ANALYST]}
          />
        )}
      />
      <Route
        path="/tenants/:tenantId/recommendations"
        component={({ params }) => <ProtectedRoute component={Recommendations} tenantId={params.tenantId} />}
      />

      {/* Admin routes */}
      <Route path="/users" component={() => <ProtectedRoute component={UsersTab} roles={[UserRoles.ADMIN]} />} />
      <Route path="/tenants" component={() => <ProtectedRoute component={Tenants} roles={[UserRoles.ADMIN]} />} />
      <Route
        path="/global-recommendations"
        component={() => (
          <ProtectedRoute component={GlobalRecommendations} roles={[UserRoles.ADMIN, UserRoles.ANALYST]} />
        )}
      />

      {/* Accept Invite */}
      <Route path="/accept-invite" component={() => <ProtectedRoute component={AcceptInvite} />} />

      {/* Widget Routes */}
      <Route path="/known-locations/:tenantId" component={() => <ProtectedRoute component={KnownLocations} />} />
      <Route path="/phish-resistant-mfa/:tenantId" component={() => <ProtectedRoute component={PhishResistantMFA} />} />

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
