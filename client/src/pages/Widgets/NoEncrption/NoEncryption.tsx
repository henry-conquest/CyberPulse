import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEncryptedDeviceInfo } from "@/service/EndUserDevicesService";
import { getTenants } from "@/service/TenantService";
import { endUserDevicesActions, sessionInfoActions } from "@/store/store";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "wouter";

const NoEncryptionDetails = () => {
  const selectedClient = useSelector((state: any) => state?.sessionInfo?.selectedClient);
  const noEncryptionData = useSelector((state: any) => state.endUserDevices.noEncryption);
  const userId = useSelector((state: any) => state?.sessionInfo?.user?.id);
  const { tenantId } = useParams();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialiseData = async () => {
      try {
        setLoading(true);

        if (tenantId && !selectedClient) {
          const tenants = await getTenants();
          const selectedTenant = tenants.find((t: any) => t.id === +tenantId);
          dispatch(sessionInfoActions.setTenants(tenants));
          dispatch(sessionInfoActions.setSelectedClient(selectedTenant));
        }

        if (userId) {
          const data = await getEncryptedDeviceInfo(userId);
          dispatch(endUserDevicesActions.setNoEncryption(data));
        }
      } catch (err) {
        console.error("Failed to fetch device data", err);
      } finally {
        setLoading(false);
      }
    };

    initialiseData();
  }, [tenantId, userId]);

  const devices = noEncryptionData?.devices || [];

  return (
    <div>
      <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
        <Link
          to={`/tenants/${tenantId}/details`}
          className="inline-flex items-center text-sm text-brand-teal hover:underline"
        >
          ← Back
        </Link>
        <span className="text-secondary-600">
          Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}
        </span>
      </div>

      <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-10 ml-6">
        {selectedClient?.name} No Encryption
      </h1>

      <Card className="ml-auto mr-auto mb-12 flex-col w-[90%]">
        <CardHeader>
          <CardTitle>Devices Missing Encryption</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !noEncryptionData ? (
            <div className="text-center py-8 text-gray-600">Loading device data...</div>
          ) : devices.length === 0 ? (
            <div className="text-center py-8 text-red-600">No unencrypted device data available.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/6">Device Name</TableHead>
                  <TableHead className="w-1/6">Platform</TableHead>
                  <TableHead className="w-1/6">OS Version</TableHead>
                  <TableHead className="w-1/6">Compliant</TableHead>
                  <TableHead className="w-1/6">Last Sync</TableHead>
                  <TableHead className="w-1/6">Encryption Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {devices.map((device: any) => (
                  <TableRow key={device.lastSyncDateTime || device.deviceName}>
                    <TableCell>{device.deviceName || "Unknown"}</TableCell>
                    <TableCell>{device.os || "Unknown"}</TableCell>
                    <TableCell>{device.osVersion || "Unknown"}</TableCell>
                    <TableCell className={device.isCompliant ? "text-green-600" : "text-red-600"}>
                      {device.isCompliant ? "Yes" : "No"}
                    </TableCell>
                    <TableCell>
                      {device.lastSyncDateTime
                        ? format(new Date(device.lastSyncDateTime), "MMM d, yyyy h:mm a")
                        : "Unknown"}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {device.encryptionStatus || "Not Encrypted"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default NoEncryptionDetails;
