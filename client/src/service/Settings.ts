export const getIntegrations = async () => {
    try {
        const res = await fetch(`/api/connections/microsoft365`, {
        method: 'GET',
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get integrations')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
    }
}
export const deleteIntegration = async (connectionId: string) => {
    try {
        const res = await fetch(`/api/connections/microsoft365/${connectionId}`, {
        method: 'DELETE',
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to delete integration')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
    }
}