interface ParamsModel {
    userId: string
    tenantId: string
}

export const getSecureScores = async (params: ParamsModel) => {
    try {
        const res = await fetch(`/api/secure-scores/${params.userId}/${params.tenantId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get secure scores')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
        throw new Error('Failed to get secure scores')
    }
}

const fetchScores = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(`Failed to fetch scores from ${url}`);
  const data = await res.json();
  return data;
};

export const getIdentityScores = async (params: ParamsModel) => {
  return fetchScores(`/api/secure-scores/identity/${params.userId}/${params.tenantId}`);
};

export const getDataScores = async (params: ParamsModel) => {
  return fetchScores(`/api/secure-scores/data/${params.userId}/${params.tenantId}`);
};

export const getAppScores = async (params: ParamsModel) => {
  return fetchScores(`/api/secure-scores/apps/${params.userId}/${params.tenantId}`);
};
