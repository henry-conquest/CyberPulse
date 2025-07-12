import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCompliancePolicies } from "@/service/EndUserDevicesService";
import { endUserDevicesActions } from "@/store/store";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "wouter";

const CompliancePoliciesDetails = () => {
  const complianceData = useSelector((state: any) => state.endUserDevices.compliancePolicies);
  const userId = useSelector((state: any) => state?.sessionInfo?.user?.id);
  const { tenantId } = useParams();
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initialiseData = async () => {
      try {
        setLoading(true);
        if (userId) {
          const data = await getCompliancePolicies(userId);
          dispatch(endUserDevicesActions.setCompliancePolicies(data));
        }
      } catch (err) {
        console.error("Failed to fetch device data", err);
      } finally {
        setLoading(false);
      }
    };

    initialiseData();
  }, [tenantId, userId]);

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
        Compliance Policies
      </h1>

      <Card className="ml-auto mr-auto mb-12 flex-col w-[90%]">
        <CardHeader>
          <CardTitle>Device Compliance Policies</CardTitle>
        </CardHeader>
        <CardContent>
          {loading || !complianceData ? (
            <div className="text-center py-8 text-gray-600">Loading compliance policies...</div>
          ) : complianceData.value.length === 0 ? (
            <div className="text-center py-8 text-red-600">No compliance policies configured.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-2/3">Policy Name</TableHead>
                  <TableHead className="w-1/3 text-center">Platform</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {complianceData.value.map((policy: any) => (
                  <TableRow key={policy.id}>
                    <TableCell>{policy.displayName || "Unnamed Policy"}</TableCell>
                    <TableCell className="text-center">
                      {policy["@odata.type"]
                        ? policy["@odata.type"].split(".").pop().replace("CompliancePolicy", "")
                        : "Unknown"}
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

export default CompliancePoliciesDetails;
