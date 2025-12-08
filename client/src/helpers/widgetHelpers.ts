export const calculateRiskySignIn = (data: any) => {
  const policies = data?.value || [];
  // Target policies that act on any sign-in risk level (low, medium, high)
  const allowedRiskLevels = ['high', 'medium', 'low'];

  const matchingPolicy = policies.find((policy: any) => {
    // Check if policy is active (enabled or in reporting)
    const state = policy.state === 'enabled' || policy.state === 'enabledForReportingButNotEnforced';

    // Check if the policy targets any of the sign-in risk levels
    const signInRiskLevels = policy?.conditions?.signInRiskLevels || [];
    const hasRiskLevel = signInRiskLevels.some((risk: any) => allowedRiskLevels.includes(risk.toLowerCase()));

    // A "good" policy is one that is active AND targets sign-in risk
    return state && hasRiskLevel;
  });

  // 'exists' is true if a protecting policy is found.
  const exists = Boolean(matchingPolicy);
  return {
    exists, // true = Protected (Tick), false = Unprotected (Cross/Alert)
    policies,
  };
};
