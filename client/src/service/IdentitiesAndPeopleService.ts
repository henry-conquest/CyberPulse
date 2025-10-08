import { calculateRiskySignIn } from '@/helpers/widgetHelpers';

interface tenantIdParamModel {
  tenantId: string;
}

interface userAndTenantParamModel {
  tenantId: string;
  userId: string;
}

export const get365Admins = async (params: tenantIdParamModel) => {
  try {
    const res = await fetch(`/api/m365-admins/${params.tenantId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get admins');
    }
    const data = await res.json();

    return data;
  } catch (err) {
    console.log(err);
  }
};

export const getRiskySignInPolicies = async (params: userAndTenantParamModel) => {
  try {
    const res = await fetch(`/api/sign-in-policies/${params.userId}/${params.tenantId}`, {
      credentials: 'include',
    });

    if (!res.ok) {
      throw new Error('Failed to get sign-in policies');
    }

    const data = await res.json();
    const formattedData = calculateRiskySignIn(data);
    return formattedData;
  } catch (err) {
    console.error('Error fetching risky sign-in policies', err);
    throw err;
  }
};

export const getKnownLocations = async (params: userAndTenantParamModel) => {
  try {
    const res = await fetch(`/api/trusted-locations/${params.userId}/${params.tenantId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get trusted locations');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export const getPhishResistantMFA = async (params: userAndTenantParamModel) => {
  try {
    const res = await fetch(`/api/phish-resistant-mfa/${params.userId}/${params.tenantId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get phish resistant MFA data');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    throw new Error('Failed to get phish resistant MFA data');
  }
};
