export const getManualWidgetStatuses = async (tenantId: string) => {
  console.log('tenant id 1', tenantId)
    try {
      const response = await fetch(`/api/tenants/${tenantId}/widgets`)
      if (response.ok) {
        return response.json()
      }
    } catch(err) {
        if(err)throw new Error('Error trying to get manual widget statuses ' + err)
    }
}

export const updateManualWidget = async (tenantId: string, widgetId: string, newValue: boolean) => {
  try {
    await fetch(`/api/tenants/${tenantId}/widgets/${widgetId}/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({isEnabled: newValue})
    })
  } catch (error) {
    if(error) throw new Error('Failed to update manual widget: ', error)
  }
}