import { storage } from './storage';

export const getMicrosoft365ConnectionForTenant = async (tenantId: string) => {
  const connection = await storage.getMicrosoft365ConnectionByTenantId(tenantId);

  if (!connection) {
    throw new Error(`No Microsoft 365 connection found for the requested organisation`);
  }

  return connection;
};
