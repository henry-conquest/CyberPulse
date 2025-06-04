export const get365Admins = async (tenantId: string) => {
    try {
        const res = await fetch(`/api/m365-admins/${tenantId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get admins')
        }
        const data = await res.json()

        return data
    } catch(err) {
        console.log(err)
    }
}