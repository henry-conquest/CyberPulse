import axios from 'axios';

export const getTenants = async () => {
  try {
    const res = await fetch('/api/tenants');
    if (!res.ok) {
      throw new Error('Failed to get tenants');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export const getTenantScoreHistory = async (tenantId: string) => {
  try {
    const res = await fetch(`/api/score-history/${tenantId}`);
    if (!res.ok) {
      throw new Error(`Failed to get score history for ${tenantId}`);
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export interface UpdateGuaranteesPayload {
  guaranteesOption: 'immediate' | 'scheduled' | 'disabled';
  startDate?: string;
}

/**
 * Updates guarantees settings for a tenant.
 * @param tenantId Tenant ID to update
 * @param data Guarantees options
 * @returns Updated tenant object
 */
export async function updateTenantGuarantees(tenantId: string, data: UpdateGuaranteesPayload) {
  try {
    const response = await axios.patch(`/api/tenants/${tenantId}/guarantees`, data);
    return response.data;
  } catch (error: any) {
    console.error('Failed to update tenant guarantees:', error);
    throw new Error(error?.response?.data?.error || 'Failed to update tenant guarantees');
  }
}
