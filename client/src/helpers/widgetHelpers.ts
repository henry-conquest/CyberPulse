export const calculateRiskySignIn = (data: any) => {
  const policies = data.value || [];
  const allowedRiskLevels = ['high', 'medium', 'low'];

  const matchingPolicy = policies.find((policy: any) => {
    const state = policy.state === 'enabled' || policy.state === 'enabledForReportingButNotEnforced';
    const signInRiskLevels = policy?.conditions?.signInRiskLevels || [];
    const hasRiskLevel = signInRiskLevels.some((risk: any) => allowedRiskLevels.includes(risk.toLowerCase()));
    return state && hasRiskLevel;
  });

  const exists = Boolean(matchingPolicy);
  return {
    exists,
    policies,
  };
};
