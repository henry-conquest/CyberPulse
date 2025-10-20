import React, { Suspense, lazy } from 'react';
import { Switch, Route } from 'wouter';
import { TooltipProvider } from '@/components/ui/tooltip';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { UserRoles } from '@shared/schema';

// Lazy-loaded pages
const NotFound = lazy(() => import('@/pages/NotFound/NotFound'));
const Companies = lazy(() => import('@/pages/Companies/Companies'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const LoginRejected = lazy(() => import('@/pages/LoginRejected/LoginRejected'));
const AcceptInvite = lazy(() => import('@/pages/AcceptInvite/AcceptInvite'));
const CompanyDetails = lazy(() => import('@/pages/CompanyDetails/CompanyDetails'));

// Widgets
const KnownLocations = lazy(() => import('@/pages/Widgets/KnownLocations/KnownLocations'));
const PhishResistantMFA = lazy(() => import('@/pages/Widgets/PhishResistant/PhishResistantMFA'));
const NoEncryptionDetails = lazy(() => import('@/pages/Widgets/NoEncrption/NoEncryption'));
const CompliancePoliciesDetails = lazy(() => import('@/pages/Widgets/CompliancePolicies'));
const SecureScores = lazy(() => import('@/pages/Widgets/SecureScores'));
const M365Admins = lazy(() => import('@/pages/Widgets/M365Admins'));
const SignInPolicies = lazy(() => import('@/pages/Widgets/SignInPolicies'));
const ThreeMonthScoreChart = lazy(() => import('@/components/ThreeMonthScoreChart/ThreeMonthScoreChart'));

// Simple loading placeholder (you can replace with your LoadingSpinner)
function Loader() {
  return <div className="flex h-screen items-center justify-center text-gray-500">Loading...</div>;
}

// 🔒 ProtectedRoute wrapper
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

  if (isLoading) return <Loader />;

  if (!user) {
    window.location.href = '/api/login';
    return null;
  }

  if (roles && user.role && !roles.includes(user.role)) {
    return <NotFound />;
  }

  return <Component {...rest} />;
}

// 🧭 Router definition
function Router() {
  return (
    <Suspense fallback={<Loader />}>
      <Switch>
        {/* Main routes */}
        <Route path="/" component={() => <ProtectedRoute component={Companies} />} />
        <Route path="/companies" component={() => <ProtectedRoute component={Companies} />} />
        <Route path="/settings" component={() => <ProtectedRoute component={Settings} />} />

        <Route path="/login-rejected" component={() => <LoginRejected />} />

        {/* Accept Invite */}
        <Route path="/accept-invite" component={() => <ProtectedRoute component={AcceptInvite} />} />

        {/* Company Details */}
        <Route
          path="/tenants/:tenantId/details"
          component={({ params }) => <ProtectedRoute component={CompanyDetails} tenantId={params.tenantId} />}
        />

        {/* Widget Routes */}
        <Route path="/m365-admins/:tenantId" component={() => <ProtectedRoute component={M365Admins} />} />
        <Route path="/trusted-locations/:tenantId" component={() => <ProtectedRoute component={KnownLocations} />} />
        <Route path="/sign-in-policies/:tenantId" component={() => <ProtectedRoute component={SignInPolicies} />} />
        <Route
          path="/phish-resistant-mfa/:tenantId"
          component={() => <ProtectedRoute component={PhishResistantMFA} />}
        />
        <Route path="/no-encryption/:tenantId" component={() => <ProtectedRoute component={NoEncryptionDetails} />} />
        <Route
          path="/compliance-policies/:tenantId"
          component={() => <ProtectedRoute component={CompliancePoliciesDetails} />}
        />

        {/* Secure / Identity / App / Data Scores */}
        <Route
          path="/secure-scores/:tenantId"
          component={() => <ProtectedRoute component={SecureScores} id="secure" title="Microsoft 365 Secure Score" />}
        />
        <Route
          path="/identity-scores/:tenantId"
          component={() => (
            <ProtectedRoute component={SecureScores} id="identity" title="Microsoft 365 Identity Score" />
          )}
        />
        <Route
          path="/app-scores/:tenantId"
          component={() => <ProtectedRoute component={SecureScores} id="app" title="Microsoft 365 App Score" />}
        />
        <Route
          path="/data-scores/:tenantId"
          component={() => <ProtectedRoute component={SecureScores} id="data" title="Microsoft 365 Data Score" />}
        />
        <Route
          path="/maturity-scores/:tenantId"
          component={() => <ProtectedRoute component={SecureScores} id="maturity" title="Maturity Score" />}
        />

        {/* 3-Month Charts */}
        <Route
          path="/guarantees/maturity-scores/:tenantId"
          component={() => <ProtectedRoute component={ThreeMonthScoreChart} id="maturity" title="Maturity Score" />}
        />
        <Route
          path="/guarantees/secure-scores/:tenantId"
          component={() => <ProtectedRoute component={ThreeMonthScoreChart} id="secure" title="Secure Score" />}
        />

        {/* 404 fallback */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// 🧱 Main App
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
