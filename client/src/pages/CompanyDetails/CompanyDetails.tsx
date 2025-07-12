import { useDispatch, useSelector } from "react-redux"
import CompanySecureScore from "./SecureScoreWidget/CompanySecureScore"
import { useEffect } from "react"
import { getTenants } from "@/service/TenantService"
import { sessionInfoActions } from "@/store/store"
import { cloudAndInfrastructureWidgets, dataWidgets, endUserDevicesWidgets, identitiesAndPeopleWidgets } from "@/config/widgetConfig"
import Widget from "@/components/ui/Widget"
import AnalystComments from "./AnalystComments"

interface CompanyDetailsProps {
    tenantId: string
}

const CompanyDetails = (props: CompanyDetailsProps) => {
    const { tenantId } = props
    const tenant = useSelector((state: any) => state.sessionInfo.selectedClient)
    const user = useSelector((state: any) => state.sessionInfo.user)
    const dispatch = useDispatch()

    useEffect(() => {
        const getTenantData = async () => {
            const tenants = await getTenants()
            const selectedTenant = tenants.find((t: any) => t.id === +tenantId )
            dispatch(sessionInfoActions.setTenants(tenants))
            dispatch(sessionInfoActions.setSelectedClient(selectedTenant))
        }
        getTenantData()
    }, [])


    // Loading state

    if(!tenant) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-80px)]">
                <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
            );
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-20">{tenant?.name}</h1>
            {/* Secure Score */}
            <CompanySecureScore />
            {/* Identities & People Widgets */}
            <p className="font-montserrat text-brand-teal m-auto flex justify-center mb-6 text-xl font-bold">Identities and People</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
                {identitiesAndPeopleWidgets.map(((widget, index) => {
                let apiParam;
                let onClickParam;
                switch (widget.id) {
                    case 'microsoft365Admins':
                    apiParam = tenantId;
                    break;
                    case 'riskySignInPolicies':
                    apiParam = user.id
                    break
                    case 'trustedLocations':
                    apiParam = user.id
                    onClickParam = tenantId
                    break
                    case 'phishResistantMFA':
                    apiParam = user.id
                    onClickParam = tenantId
                    break
                    // future cases:
                    // case 'someOtherWidget':
                    //   apiParam = { tenantId, region: 'US' };
                    //   break;
                    default:
                    apiParam = undefined;
                }
                return (
                    <Widget
                    key={`${widget.id}-${index}`}
                    id={widget.id}
                    title={widget.title}
                    hideButton={widget.hideButton}
                    buttonText={widget.buttonText}
                    apiCall={widget.apiCall}
                    apiParam={apiParam}
                    render={widget.render}
                    onButtonClick={widget.onButtonClick}
                    onClickParam={onClickParam}
                    >
                    {widget.content}
                    </Widget>
                )
            }))}
            </div>
            {/* 🧩 Line Break */}
            <div className="w-full h-px bg-brand-teal my-20" />
            {/* End User Devices Widgets */}
            <p className="font-montserrat text-brand-teal m-auto flex justify-center mb-6 text-xl font-bold">End User Devices</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
                {endUserDevicesWidgets.map(((widget: WidgetModel, index) => {
                if(widget.id === 'compliancePolicies') console.log(user.id)
                let apiParam;
                let onClickParam;
                switch (widget.id) {
                    case 'noEncryption':
                    apiParam = user.id;
                    onClickParam = tenantId
                    break;
                    case 'compliancePolicies':
                    apiParam = user.id;
                    onClickParam = tenantId
                    break;
                    default:
                    apiParam = undefined;
                }
                return (
                    <Widget
                    key={`${widget.id}-${index}`}
                    id={widget.id}
                    title={widget.title}
                    hideButton={widget.hideButton}
                    buttonText={widget.buttonText}
                    apiCall={widget.apiCall}
                    apiParam={apiParam}
                    render={widget.render}
                    onButtonClick={widget.onButtonClick}
                    onClickParam={onClickParam}
                    >
                    {widget.content}
                    </Widget>
                )
            }))}
            </div>
            {/* 🧩 Line Break */}
            <div className="w-full h-px bg-brand-teal my-20" />
            {/* Cloud and Infrastructure Widgets */}
            <p className="font-montserrat text-brand-teal m-auto flex justify-center mb-6 text-xl font-bold">Cloud and Infrastructure</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
                {cloudAndInfrastructureWidgets.map(((widget: WidgetModel, index) => {
                let apiParam;
                let onClickParam;
                switch (widget.id) {
                    case 'microsoftSecureScore':
                    apiParam = user.id;
                    onClickParam = tenantId
                    break;
                    default:
                    apiParam = undefined;
                }
                return (
                    <Widget
                    key={`${widget.id}-${index}`}
                    id={widget.id}
                    title={widget.title}
                    hideButton={widget.hideButton}
                    buttonText={widget.buttonText}
                    apiCall={widget.apiCall}
                    apiParam={apiParam}
                    render={widget.render}
                    onButtonClick={widget.onButtonClick}
                    onClickParam={onClickParam}
                    >
                    {widget.content}
                    </Widget>
                )
            }))}
            </div>
            {/* 🧩 Line Break */}
            <div className="w-full h-px bg-brand-teal my-20" />
            {/* Data Widgets */}
            <p className="font-montserrat text-brand-teal m-auto flex justify-center mb-6 text-xl font-bold">Data</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
                {dataWidgets.map(((widget: WidgetModel, index) => {
                let apiParam;
                switch (widget.id) {
                    case 'microsoft365Admins':
                    apiParam = tenantId;
                    break;
                    default:
                    apiParam = undefined;
                }
                return (
                    <Widget
                    key={`${widget.id}-${index}`}
                    id={widget.id}
                    title={widget.title}
                    hideButton={widget.hideButton}
                    buttonText={widget.buttonText}
                    apiCall={widget.apiCall}
                    apiParam={apiParam}
                    render={widget.render}
                    >
                    {widget.content}
                    </Widget>
                )
            }))}
            </div>
            {/* 🧩 Line Break */}
            <div className="w-full h-px bg-brand-teal my-20" />

            {/* Analyst Comments */}
            <AnalystComments
            latest={{
                comment: "We believe the company is well-positioned for Q3...",
                author: "Richard King",
                date: "25th May 2025",
            }}
            previous={[
                {
                date: "24th May 2025",
                note: "Q1 showed moderate growth, with improved margins expected.",
                },
                {
                date: "22nd May 2025",
                note: "Market volatility observed, but fundamentals remain strong.",
                },
            ]}
            />


        </div>
    )
}

export default CompanyDetails