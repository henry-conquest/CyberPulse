import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorResponseMessage from "@/components/ui/ErrorResponseMessage";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEncryptedDeviceInfo } from "@/service/EndUserDevicesService";
import { getTenants } from "@/service/TenantService";
import { endUserDevicesActions, sessionInfoActions } from "@/store/store";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "wouter";

const NoEncryptionDetails = () => {
  const noEncryptionData = useSelector((state: any) => state.endUserDevices.noEncryption);
  const userId = useSelector((state: any) => state?.sessionInfo?.user?.id);
  const { tenantId } = useParams();
  const dispatch = useDispatch();
  const [error, setError] = useState(false); 

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialiseData = async () => {
      try {
        setLoading(true);
        setError(false)
        if (userId && tenantId) {
          const params = {
            userId, 
            tenantId
          }
          const data = await getEncryptedDeviceInfo(params);
          dispatch(endUserDevicesActions.setNoEncryption(data));
        }
      } catch (err) {
        console.error("Failed to fetch device data", err);
        setError(true)
      } finally {
        setLoading(false);
      }
    };

    initialiseData();
  }, [tenantId, userId]);

  const devices = noEncryptionData?.devices || [];

  if (error && tenantId) {
    return (
      <ErrorResponseMessage tenantId={tenantId} text="Microsoft 365 Missing Device Encryption"/>
    );
  }

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
        Microsoft 365 Missing Device Encryption
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
