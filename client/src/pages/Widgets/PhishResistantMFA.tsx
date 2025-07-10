import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { GroupedMFAData } from "@/models/IdentitiesAndPeopleModel"
import { getPhishResistantMFA } from "@/service/IdentitiesAndPeopleService"
import { getTenants } from "@/service/TenantService"
import { identitiesAndPeopleActions, sessionInfoActions } from "@/store/store"
import { format } from "date-fns"
import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link, useParams } from "wouter"

const PhishResistantMFA = () => {
    const groupedData: GroupedMFAData = useSelector((state: any) => state?.identitiesAndPeople?.phishResistantMFA)
    const selectedClient = useSelector((state: any) => state?.sessionInfo?.selectedClient)
    const userId = useSelector((state: any) => state?.sessionInfo?.user?.id)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(false);
    const dispatch = useDispatch()
    const { tenantId } = useParams()

    const getStateClass = (state: string) => {
      switch (state) {
        case 'enabled':
          return 'text-green-600';
        case 'disabled':
          return 'text-gray-500';
        case 'partial':
          return 'text-orange-500';
        default:
          return '';
      }
    };
    const getPhishResistantStatus = (value: string | boolean) => {
      if (value === true || value === 'true') return { text: 'Yes', className: 'text-green-600' };
      if (value === false || value === 'false') return { text: 'No', className: 'text-red-600' };
      if (value === 'partial') return { text: 'Partially Resistant', className: 'text-orange-500' };
      return { text: 'Unknown', className: '' };
    };

    useEffect(() => {
      const isGroupedDataEmpty = groupedData && Object.values(groupedData).every((arr) => Array.isArray(arr) && arr.length === 0);
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

          if ((!groupedData || isGroupedDataEmpty) && userId) {
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
    // if (!Array.isArray(groupedData)) return (
    //   <>
    //     <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
    //       <Link to={`/tenants/${tenantId}/details`} className="inline-flex items-center text-sm text-brand-teal hover:underline">
    //           ← Back
    //         </Link>
    //         <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
    //     </div>
    //     <div className="text-center text-red-600 mt-8">Failed to load data. Please try again.</div>
    //   </>
    // )

    return (
      <>
        <div className="flex justify-between align-center ml-6 mr-6 mt-4 mb-12">
          <Link to={`/tenants/${tenantId}/details`} className="inline-flex items-center text-sm text-brand-teal hover:underline">
            ← Back
          </Link>
          <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
        </div>
      <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-10 ml-6">{selectedClient?.name} Phish Resistant MFA</h1>
      <Card className="ml-auto mr-auto mb-12 flex-col w-[80%]">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
               <TableRow>
                <TableHead className="w-1/4">Authentication Method</TableHead>
                <TableHead className="w-1/4">Status</TableHead>
                <TableHead className="w-1/4">Phish Resistant</TableHead>
                <TableHead className="w-1/4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...groupedData.toEnable, ...groupedData.toDisable, ...groupedData.enhance].map((method) => {
                const { text, className } = getPhishResistantStatus(method.isPhishResistant);
                return (
                <TableRow key={method.id}>
                <TableCell className="w-1/4">{method.displayName}</TableCell>
                <TableCell className={`w-1/4 ${getStateClass(method.state)}`}>{method.state}</TableCell>
                <TableCell className={`w-1/4 ${className}`}>{text}</TableCell>
                <TableCell className="w-1/4">{method.recommendation || '-'}</TableCell>
              </TableRow>

              )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="ml-auto mr-auto mb-6 flex-col w-[80%]">
        <CardHeader>
          <CardTitle>Correctly Configured</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
               <TableRow>
                <TableHead className="w-1/4">Authentication Method</TableHead>
                <TableHead className="w-1/4">Status</TableHead>
                <TableHead className="w-1/4">Phish Resistant</TableHead>
                <TableHead className="w-1/4">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedData.correct.map((method) => {
                const { text, className } = getPhishResistantStatus(method.isPhishResistant);
                return (
                  <TableRow key={method.id}>
                    <TableCell className="w-1/4">{method.displayName}</TableCell>
                    <TableCell className={`w-1/4 ${getStateClass(method.state)}`}>{method.state}</TableCell>
                    <TableCell className={`w-1/4 ${className}`}>{text}</TableCell>
                    <TableCell className="w-1/4"></TableCell>
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