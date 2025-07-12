export const get365Admins = async (tenantId: string) => {
    try {
        const res = await fetch(`/api/m365-admins/${tenantId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get admins')
        }
        const data = await res.json()

        return data
    } catch(err) {
        console.log(err)
    }
}

export const getRiskySignInPolicies = async (userId: string) => {
    try {
        const res = await fetch(`/api/sign-in-policies/${userId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get admins')
        }
        const data = await res.json()
        const policies = data.value || [];

        // Define accepted risk levels
        const allowedRiskLevels = ['high', 'medium', 'low'];

        // Check if any policy meets the requirements
        const matchingPolicy = policies.find((policy: any) => {
            const state = policy.state === 'enabled';
            const signInRiskLevels = policy?.conditions?.signInRiskLevels || [];

            const hasRiskLevel = signInRiskLevels.some((risk: any) => allowedRiskLevels.includes(risk.toLowerCase()));
            
            return state && hasRiskLevel;
        });

        const exists = Boolean(matchingPolicy);
        return exists

    } catch(err) {
        console.log(err)
    }
}
export const getKnownLocations = async (userId: string) => {
    try {
        const res = await fetch(`/api/trusted-locations/${userId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get trusted locations')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
    }
}

export const getPhishResistantMFA = async (userId: string) => {
    try {
        const res = await fetch(`/api/phish-resistant-mfa/${userId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get phish resistant MFA data')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
    }
}