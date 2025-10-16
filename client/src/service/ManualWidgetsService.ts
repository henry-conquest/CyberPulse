export const getManualWidgetStatuses = async (tenantId: string) => {
  try {
    const response = await fetch(`/api/tenants/${tenantId}/widgets`, { credentials: 'include' });
    if (response.ok) {
      return response.json();
    }
  } catch (err) {
    if (err) throw new Error('Error trying to get manual widget statuses ' + err);
  }
};

export const updateManualWidget = async (tenantId: string, widgetId: string, newValue: boolean) => {
  try {
    await fetch(`/api/tenants/${tenantId}/widgets/${widgetId}/toggle`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ isEnabled: newValue }),
    });
  } catch (error) {
    if (error) throw new Error('Failed to update manual widget: ', error);
  }
};

import axios from 'axios';

export const updateWidgetScore = async (widgetKey: string, customValue: number, tenantId: string) => {
  const response = await axios.patch(`/api/tenants/${tenantId}/widgets/${widgetKey}`, { customValue });
  return response.data;
};
export const getWidget = async (key: string, tenantId: string) => {
  const response = await axios.get(`/api/tenants/${tenantId}/widget/${key}`);
  return response.data;
};
