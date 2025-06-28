import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Policy } from "@/models/PolicyModel"
import { getPhishResistantMFA } from "@/service/IdentitiesAndPeopleService"
import { getTenants } from "@/service/TenantService"
import { identitiesAndPeopleActions, sessionInfoActions } from "@/store/store"
import { format } from "date-fns"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link, useParams } from "wouter"

const PhishResistantMFA = () => {
    const phishData = useSelector((state: any) => state?.identitiesAndPeople?.phishResistantMFA)
    const selectedClient = useSelector((state: any) => state?.sessionInfo?.selectedClient)
    const userId = useSelector((state: any) => state?.sessionInfo?.user?.id)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false);
    const dispatch = useDispatch()
    const { tenantId } = useParams()

    useEffect(() => {
      const initialiseData = async () => {
        try {
          setLoading(true);
          setError(false);
          if (tenantId) {
            const tenants = await getTenants();
            const selectedTenant = tenants.find((t: any) => t.id === +tenantId);
            dispatch(sessionInfoActions.setTenants(tenants));
            dispatch(sessionInfoActions.setSelectedClient(selectedTenant));
          }

          if (!phishData && userId) {
            const data = await getPhishResistantMFA(userId);
            dispatch(identitiesAndPeopleActions.setPhishResistantMFA(data));
          }
        } catch (error) {
          console.error("Failed to load data", error);
          setError(true)
          throw Error
        } finally {
          setLoading(false);
        }
      };

      initialiseData();
    }, [tenantId, userId]);

    if (loading) return <LoadingSpinner />;
    if (!Array.isArray(phishData)) return (
      <>
        <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
          <Link to={`/tenants/${tenantId}/details`} className="inline-flex items-center text-sm text-brand-teal hover:underline">
              ← Back
            </Link>
            <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
        </div>
        <div className="text-center text-red-600 mt-8">Failed to load data. Please try again.</div>
      </>
    )

    return (
      <>
        <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
          <Link to={`/tenants/${tenantId}/details`} className="inline-flex items-center text-sm text-brand-teal hover:underline">
            ← Back
          </Link>
          <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
        </div>
        <Card className="ml-6 mr-6">
          <CardHeader>
            <CardTitle>{selectedClient?.name} Phish Resistant MFA</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Authentication Method</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Phish Resistant</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phishData && [...phishData]?.sort((a, b) => (a.state === "enabled" ? -1 : 1))?.map((policy: Policy) => {
                  return (
                    <TableRow key={policy.id}>
                      <TableCell>{policy.displayName}</TableCell>
                      <TableCell>
                        <span className={policy.state === "enabled" ? "text-green-700 font-medium" : "text-gray-500"}>
                          {policy.state.charAt(0).toUpperCase() + policy.state.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {policy.isPhishResistant === true && (
                          <span className="text-green-600 font-medium">Yes</span>
                        )}
                        {policy.isPhishResistant === false && (
                          <span className="text-red-600 font-medium">No</span>
                        )}
                        {policy.isPhishResistant === "partial" && (
                          <span className="text-yellow-600 font-medium">Partially Resistant</span>
                        )}
                      </TableCell>
                      <TableCell>{policy.recommendation}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
          
        </Card>
      </>
    )
}

export default PhishResistantMFA