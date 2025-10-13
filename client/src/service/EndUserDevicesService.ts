interface userAndTenantParamModel {
  tenantId: string;
  userId: string;
}
interface tenantParamModel {
  tenantId: string;
}

export const getEncryptedDeviceInfo = async (params: tenantParamModel) => {
  try {
    const res = await fetch(`/api/encrypted-devices/${params.tenantId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get encrypted device information');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    throw new Error('Failed to get encrypted device information');
  }
};

export const getCompliancePolicies = async (params: tenantParamModel) => {
  try {
    const res = await fetch(`/api/device-compliance-policies/${params.tenantId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get encrypted device information');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    throw new Error('Failed to get encrypted device information');
  }
};
