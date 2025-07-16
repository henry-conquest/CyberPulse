interface userAndTenantParamModel {
    tenantId: string
    userId: string
}

export const getEncryptedDeviceInfo = async (params: userAndTenantParamModel) => {
    try {
        const res = await fetch(`/api/encrypted-devices/${params.userId}/${params.tenantId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get encrypted device information')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
        throw new Error('Failed to get encrypted device information')
    }
}

export const getCompliancePolicies = async (params: userAndTenantParamModel) => {
    try {
        const res = await fetch(`/api/device-compliance-policies/${params.userId}/${params.tenantId}`, {
        credentials: 'include',
        });
        if(!res.ok) {
            throw new Error('Failed to get encrypted device information')
        }
        const data = await res.json()
        return data

    } catch(err) {
        console.log(err)
        throw new Error('Failed to get encrypted device information')
    }
}