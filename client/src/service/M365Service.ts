export const connectToM365 = async (formData: any) => {
  const res = await fetch(`/api/tenants/${formData.tenantId}/microsoft365`, {
    method: 'POST',
    body: JSON.stringify(formData),
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message =
      errorData?.error || 'Failed to establish connection to Microsoft 365 tenant please check details are correct.';
    throw new Error(message);
  }
};

export const createTenant = async (data: any) => {
  try {
    const response = await fetch('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData?.error || 'Failed to establish connection to Microsoft 365 tenant please check details are correct.';
      throw new Error(message);
    }
  } catch (err: any) {
    console.log('ERR', err);
    throw new Error(err);
  }
};
