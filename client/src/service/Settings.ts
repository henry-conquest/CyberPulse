export const getIntegrations = async () => {
  try {
    const res = await fetch(`/api/connections/microsoft365`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get integrations');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};
export const deleteIntegration = async (connectionId: string) => {
  try {
    const res = await fetch(`/api/connections/microsoft365/${connectionId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to delete integration');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export const getInvites = async () => {
  try {
    const res = await fetch(`/api/invites`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get invites');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};
export const deleteInvites = async (email: string) => {
  try {
    const res = await fetch(`/api/invites`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
      }),
    });
    if (!res.ok) {
      throw new Error('Failed to get invites');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
  }
};

export const getUsers = async (setLoading?: any) => {
  try {
    setLoading(true);
    const res = await fetch(`/api/admin/users`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get users');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    setLoading(false);
    throw err;
  }
};
