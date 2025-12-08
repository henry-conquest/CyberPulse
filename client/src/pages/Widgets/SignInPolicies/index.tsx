import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ErrorResponseMessage from '@/components/ui/ErrorResponseMessage';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRiskySignInPolicies } from '@/service/IdentitiesAndPeopleService';
import { identitiesAndPeopleActions } from '@/store/store';
import { format } from 'date-fns';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'wouter';

const SignInPolicies = () => {
  const policiesData = useSelector((state: any) => state?.identitiesAndPeople?.signInPolicies);
  const userId = useSelector((state: any) => state?.sessionInfo?.user?.id);
  const { tenantId } = useParams();
  const dispatch = useDispatch();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchingPolicies, setMatchingPolicies] = useState([]);

  useEffect(() => {
    if (policiesData) {
      const allowedRiskLevels = ['low', 'medium', 'high'];
      // Filtered policies are those that satisfy the client's requirement for "protection"
      const matchingPolicies = policiesData?.filter((policy: any) => {
        // const stateMatch = policy.state === 'enabled' || policy.state === 'enabledForReportingButNotEnforced';
        // Check if the policy targets any of the sign-in risk levels
        const policyRiskLevels = policy?.conditions?.signInRiskLevels || [];
        const riskMatch = policyRiskLevels.some((level: string) => allowedRiskLevels.includes(level.toLowerCase()));
        return riskMatch;
      });
      setMatchingPolicies(matchingPolicies);
    }
  }, [policiesData]);

  useEffect(() => {
    const initialiseData = async () => {
      try {
        setLoading(true);
        setError(false);
        if (userId && tenantId) {
          const { policies } = await getRiskySignInPolicies({ userId, tenantId });
          dispatch(identitiesAndPeopleActions.setSignInPolicies(policies));
        }
      } catch (err) {
        console.error('Failed to fetch sign in policies data', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    initialiseData();
  }, [tenantId, userId]);

  if (error && tenantId) {
    return <ErrorResponseMessage tenantId={tenantId} text="Microsoft 365 Sign In Policies" />;
  }

  return (
    <div>
      <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
        <Link
          to={`/tenants/${tenantId}/details`}
          className="inline-flex items-center text-sm text-brand-teal hover:underline"
        >
          ← Back
        </Link>
        <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
      </div>

      <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-10 ml-6">Microsoft 365 Sign In Policies</h1>

      <Card className="ml-auto mr-auto mb-12 flex-col w-[90%]">
        <CardHeader>
          <CardTitle>Microsoft 365 Sign In Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-600">Loading Microsoft 365 Sign In Policies...</div>
          ) : policiesData.policies?.length === 0 ? (
            <div className="text-center py-8 text-red-600">No Microsoft 365 Sign In Policies found.</div>
          ) : (
            <>
              {/* Show status result */}
              {matchingPolicies.length > 0 ? (
                <div className="text-green-700 font-semibold text-center"></div>
              ) : (
                <div className="text-red-600 font-semibold mb-6 text-center">
                  ❌ No sign-in policy found with required risk level and state.
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-1/2">Policy Name</TableHead>
                    <TableHead className="w-1/4 text-center">State</TableHead>
                    <TableHead className="w-1/4 text-center">Sign-in Risk Levels</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matchingPolicies.map((policy: any) => (
                    <TableRow key={policy.id}>
                      <TableCell>{policy.displayName || 'Unnamed Policy'}</TableCell>
                      <TableCell className="text-center">{policy.state}</TableCell>
                      <TableCell className="text-center">
                        {(policy.conditions?.signInRiskLevels || []).join(', ') || 'None'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInPolicies;
