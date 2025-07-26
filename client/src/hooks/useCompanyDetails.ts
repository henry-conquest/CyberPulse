import { getManualWidgetStatuses } from "@/service/ManualWidgetsService"
import { getTenants } from "@/service/TenantService"
import { manualWidgetsActions, sessionInfoActions } from "@/store/store"
import { useEffect, useState } from "react"
import { useDispatch } from "react-redux"

export const useCompanyDetails = (tenantId: string) => {
  const [manWidgets, setManWidgets] = useState<any[]>([])
  const [manLoading, setManLoading] = useState<boolean>(true)
  const dispatch = useDispatch()
  useEffect(() => {
      const getTenantData = async () => {
          const tenants = await getTenants()
          const selectedTenant = tenants.find((t: any) => t.id === tenantId )
          dispatch(sessionInfoActions.setTenants(tenants))
          dispatch(sessionInfoActions.setSelectedClient(selectedTenant))
      }
      getTenantData()
  }, [])

  const fetchManualWidgets = async () => {
      try {
        setManLoading(true)
        const widgets = await getManualWidgetStatuses(tenantId)
        setManWidgets(widgets)
        dispatch(manualWidgetsActions.setManualWidgets(widgets))
      } catch (err) {
        throw new Error('error getting manual widget statuses')
      } finally {
        setManLoading(false)
      }
    }

    useEffect(() => {
      fetchManualWidgets()
    }, [])

    return {
      manWidgets,
      manLoading,
      fetchManualWidgets
    }
}