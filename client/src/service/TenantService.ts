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