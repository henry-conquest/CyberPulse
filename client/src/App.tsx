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
import SecureScores from './pages/Widgets/SecureScores';
import M365Admins from './pages/Widgets/M365Admins';
import SignInPolicies from './pages/Widgets/SignInPolicies';
import ScoreChart from './pages/Widgets/SecureScores';

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
      <Route path="/m365-admins/:tenantId" component={() => <ProtectedRoute component={M365Admins} />} />
      <Route path="/trusted-locations/:tenantId" component={() => <ProtectedRoute component={KnownLocations} />} />
      <Route path="/sign-in-policies/:tenantId" component={() => <ProtectedRoute component={SignInPolicies} />} />
      <Route path="/phish-resistant-mfa/:tenantId" component={() => <ProtectedRoute component={PhishResistantMFA} />} />
      <Route path="/no-encryption/:tenantId" component={() => <ProtectedRoute component={NoEncryptionDetails} />} />
      <Route path="/compliance-policies/:tenantId" component={() => <ProtectedRoute component={CompliancePoliciesDetails} />} />
      <Route 
        path="/secure-scores/:tenantId" 
        component={() => (
          <ProtectedRoute component={ScoreChart} id="secure" title="Microsoft 365 Secure Score" />
        )}
      />

      <Route 
        path="/identity-scores/:tenantId" 
        component={() => (
          <ProtectedRoute component={ScoreChart} id="identity" title="Microsoft 365 Identity Score" />
        )}
      />

      <Route 
        path="/app-scores/:tenantId" 
        component={() => (
          <ProtectedRoute component={ScoreChart} id="app" title="Microsoft 365 App Score" />
        )}
      />

      <Route 
        path="/data-scores/:tenantId" 
        component={() => (
          <ProtectedRoute component={ScoreChart} id="data" title="Microsoft 365 Data Score" />
        )}
      />


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
