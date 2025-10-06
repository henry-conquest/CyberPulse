export const getTenants = async () => {
    try {
        const res = await fetch('/api/tenants')
        if(!res.ok) {
            throw new Error('Failed to get tenants')
        }
        const data = await res.json()
        return data
    } catch(err) {
        console.log(err)
    }
}

export const getTenantScoreHistory = async (tenantId: string) => {
    try {
        const res = await fetch(`/api/score-history/${tenantId}`)
        if(!res.ok) {
            throw new Error(`Failed to get score history for ${tenantId}`)
        }
        const data = await res.json()
        return data
    } catch(err) {
        console.log(err);
    }
}