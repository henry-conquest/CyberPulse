export const connectToM365 = async (formData: any) => {
    try {
        const res = await fetch(`/api/tenants/${formData.tenantId}/microsoft365`, {
        method: 'POST',
        body: JSON.stringify(formData),
        headers: {
        'Content-Type': 'application/json',
      },
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to create connection')
        }

    } catch(err) {
        console.log(err)
    }
}

export const createTenant = async (data: any) => {
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if(!response.ok) {
        throw new Error('Failed to create tenant')
      }
    } catch (err: any) {
      throw new Error('Failed to create tenant ', err);
    }
  };