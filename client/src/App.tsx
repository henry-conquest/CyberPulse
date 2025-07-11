import { Switch, Route } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';

import NotFound from '@/pages/NotFound/NotFound';
import Companies from './pages/Companies/Companies';
import Settings from '@/pages/Settings/Settings';

import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/layout/Layout';
import { UserRoles } from '@shared/schema';
import AcceptInvite from './pages/AcceptInvite/AcceptInvite';
import CompanyDetails from './pages/CompanyDetails/CompanyDetails';
import KnownLocations from './pages/Widgets/KnownLocations/KnownLocations';
import PhishResistantMFA from './pages/Widgets/PhishResistant/PhishResistantMFA';
import NoEncryptionDetails from './pages/Widgets/NoEncrption/NoEncryption';
import CompliancePoliciesDetails from './pages/Widgets/CompliancePolicies';

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

      <Route
        path="/tenants/:tenantId/details"
        component={({ params }) => <ProtectedRoute component={CompanyDetails} tenantId={params.tenantId} />}
      />

      {/* Accept Invite */}
      <Route path="/accept-invite" component={() => <ProtectedRoute component={AcceptInvite} />} />

      {/* Widget Routes */}
      <Route path="/known-locations/:tenantId" component={() => <ProtectedRoute component={KnownLocations} />} />
      <Route path="/phish-resistant-mfa/:tenantId" component={() => <ProtectedRoute component={PhishResistantMFA} />} />
      <Route path="/no-encryption/:tenantId" component={() => <ProtectedRoute component={NoEncryptionDetails} />} />
      <Route path="/compliance-policies/:tenantId" component={() => <ProtectedRoute component={CompliancePoliciesDetails} />} />

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
