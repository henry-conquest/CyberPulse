import { evaluatePhishMethodsGrouped } from "server/helper";

export const scoringDataFetchers: Record<
  string,
  (args: { tenantId: string; userId?: string; accessToken: string }) => Promise<any>
> = {
  microsoft365Admins: async ({ accessToken }) => {
    const response = await fetch("https://graph.microsoft.com/v1.0/directoryRoles", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();

    const adminRoles = data.value.filter((role: any) =>
      role.displayName?.toLowerCase().includes("admin")
    );

    let totalAdmins = 0;
    for (const role of adminRoles) {
      const membersRes = await fetch(
        `https://graph.microsoft.com/v1.0/directoryRoles/${role.id}/members`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const members = await membersRes.json();
      totalAdmins += members.value.length;
    }

    return totalAdmins; // scored with "range"
  },

  compliancePolicies: async ({ accessToken }) => {
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/deviceManagement/deviceCompliancePolicies",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!response.ok) {
      console.error("Graph API error fetching compliance policies:", response.status);
      return false; // fallback to "no"
    }

    const data = await response.json();

    const hasPolicies = Array.isArray(data.value) && data.value.length > 0;

    return hasPolicies;
  },
  riskySignInPolicies: async ({ accessToken }) => {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/identity/conditionalAccess/policies",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    console.error("Graph API error fetching sign-in policies:", response.status);
    return false; // fallback to "no"
  }

  const data = await response.json();
  const policies = data.value || [];

  const allowedRiskLevels = ["high", "medium", "low"];

  const matchingPolicy = policies.find((policy: any) => {
    const state =
      policy.state === "enabled" ||
      policy.state === "enabledForReportingButNotEnforced";

    const signInRiskLevels = policy?.conditions?.signInRiskLevels || [];

    const hasRiskLevel = signInRiskLevels.some((risk: string) =>
      allowedRiskLevels.includes(risk.toLowerCase())
    );

    return state && hasRiskLevel;
  });

  return !Boolean(matchingPolicy); // scored with "yesno"
},


  microsoftSecureScore: async ({ accessToken }) => {
    const response = await fetch("https://graph.microsoft.com/v1.0/security/secureScores?$top=1", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    const latest = data.value?.[0];
    return latest ? (latest.currentScore / latest.maxScore) * 100 : 0; // scored with "percentage"
  },

  noEncryption: async ({ accessToken }) => {
    const response = await fetch("https://graph.microsoft.com/v1.0/deviceManagement/managedDevices", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await response.json();
    const total = data.value.length;
    // go through all managed devices and see if they are encrypted
    const unencrypted = data.value.filter((d: any) => d.isEncrypted === false).length;
    // gives a score based on the % of devices that are encrypted
    return total > 0 ? (unencrypted / total) * 100 : 0; // scored with "percentageInverse"
  },

phishResistantMFA: async ({ accessToken }) => {
  const response = await fetch(
    "https://graph.microsoft.com/v1.0/policies/authenticationMethodsPolicy",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data = await response.json();
  const grouped = evaluatePhishMethodsGrouped(data);

  const total = data?.authenticationMethodConfigurations?.length ?? 0;
  const correct = grouped.correct?.length ?? 0;

  if (total === 0) return 0;

  const percentage = Math.round((correct / total) * 100);
  // return % so "percentage" scoring type can scale it
  return percentage;
},

  trustedLocations: async ({ accessToken }) => {
  const response = await fetch("https://graph.microsoft.com/v1.0/identity/conditionalAccess/namedLocations", {
      headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();

  // Match frontend logic: check if at least one trusted IP location exists
  const trustedExists = data?.value?.some(
      (loc: any) =>
      loc["@odata.type"] === "#microsoft.graph.ipNamedLocation" &&
      loc.isTrusted === true
  );

  return trustedExists; // scored with "yesno"
  },
};
