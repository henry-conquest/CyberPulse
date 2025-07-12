export const getSecureScores = async (userId: string) => {
    try {
        const res = await fetch(`/api/secure-scores/${userId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get secure scores')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
    }
}