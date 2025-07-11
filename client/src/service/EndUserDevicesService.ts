export const getEncryptedDeviceInfo = async (userId: string) => {
    try {
        const res = await fetch(`/api/encrypted-devices/${userId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get encrypted device information')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
    }
}

export const getCompliancePolicies = async (userId: string) => {
    try {
        const res = await fetch(`/api/device-compliance-policies/${userId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get encrypted device information')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
    }
}