interface ParamsModel {
  userId: string;
  tenantId: string;
}

export const getSecureScores = async (params: ParamsModel) => {
  try {
    const res = await fetch(`/api/secure-scores/${params.tenantId}`, {
      credentials: 'include',
    });
    if (!res.ok) {
      throw new Error('Failed to get secure scores');
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.log(err);
    throw new Error('Failed to get secure scores');
  }
};
