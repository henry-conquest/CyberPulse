import LoadingSpinner from "@/components/ui/LoadingSpinner"
import { getKnownLocations } from "@/service/IdentitiesAndPeopleService"
import { getTenants } from "@/service/TenantService"
import { identitiesAndPeopleActions, sessionInfoActions } from "@/store/store"
import { format } from "date-fns"
import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import { Link, useParams } from "wouter"

const KnownLocations = () => {
    const knownLocationData = useSelector((state: any) => state?.identitiesAndPeople?.knownLocations)
    const selectedClient = useSelector((state: any) => state?.sessionInfo?.selectedClient)
    const userId = useSelector((state: any) => state?.sessionInfo?.user?.id)
    const { tenantId } = useParams()
    const dispatch = useDispatch()

    useEffect(() => {
    const initialiseData = async () => {
      if (tenantId) {
        const tenants = await getTenants();
        const selectedTenant = tenants.find((t: any) => t.id === +tenantId);
        dispatch(sessionInfoActions.setTenants(tenants));
        dispatch(sessionInfoActions.setSelectedClient(selectedTenant));
      }

      if (!knownLocationData && userId) {
        const data = await getKnownLocations(userId);
        dispatch(identitiesAndPeopleActions.setKnownLocations(data));
      }
    };

    initialiseData();
  }, [tenantId, knownLocationData, userId, dispatch]);


    if(!knownLocationData) {
      return (
        <LoadingSpinner />
      )
    }

    return (
        <>
        <h1 className="text-brand-teal text-2xl text-center font-bold mt-6">{selectedClient?.name} Known Location Logins</h1>
        <div className="flex justify-between align-center ml-6 mr-6 mt-4">
        <Link to={`/tenants/${tenantId}/details`} className="inline-flex items-center text-sm text-brand-teal hover:underline">
          ← Back
        </Link>
        <span className="text-secondary-600">Last updated: {format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {knownLocationData?.value?.map((location: any) => (
          <div
            key={location.id}
            className="bg-white border border-gray-200 rounded-2xl shadow-md p-5 flex flex-col space-y-3"
          >
            <h2 className="text-xl font-semibold text-brand-green">{location.displayName}</h2>

            <span className="inline-block text-xs uppercase bg-gray-100 text-gray-700 px-2 py-1 rounded-full w-max">
              {location["@odata.type"].includes("countryNamedLocation")
                ? "Country-Based"
                : "IP-Based"}
            </span>

            {location.countriesAndRegions && (
              <div>
                <p className="text-sm font-medium text-gray-600">Countries:</p>
                <ul className="list-disc list-inside text-sm text-gray-800">
                  {location.countriesAndRegions.map((country: string) => (
                    <li key={country}>{country}</li>
                  ))}
                </ul>
              </div>
            )}

            {location.ipRanges && (
              <div>
                <p className="text-sm font-medium text-gray-600">IP Ranges:</p>
                <ul className="list-disc list-inside text-sm text-gray-800">
                  {location.ipRanges.map((ip: any, index: number) => (
                    <li key={index}>{ip.cidrAddress}</li>
                  ))}
                </ul>
              </div>
            )}

            {"isTrusted" in location && (
              <div>
                <p className="text-sm font-medium text-gray-600">Trusted:</p>
                <span
                  className={`text-sm font-semibold ${
                    location.isTrusted ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {location.isTrusted ? "Yes" : "No"}
                </span>
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>Created: {new Date(location.createdDateTime).toLocaleString()}</p>
              <p>Modified: {new Date(location.modifiedDateTime).toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>

        </>
    )
}

export default KnownLocations