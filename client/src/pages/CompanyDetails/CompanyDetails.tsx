import { useSelector } from 'react-redux';
import CompanySecureScore from './SecureScoreWidget/CompanySecureScore';
import { dataWidgets, endUserDevicesWidgets, identitiesAndPeopleWidgets } from '@/config/widgetConfig';
import Widget from '@/components/ui/Widget';
import { useCompanyDetails } from '@/hooks/useCompanyDetails';
import MicrosoftScores from './MicrosoftScores/MicrosoftScores';
import GuaranteesModal from '@/components/Guarantees/Guarantees';

interface CompanyDetailsProps {
  tenantId: string;
}

const CompanyDetails = (props: CompanyDetailsProps) => {
  const { tenantId } = props;
  const { manWidgets, manLoading, fetchManualWidgets } = useCompanyDetails(tenantId);
  const tenant = useSelector((state: any) => state.sessionInfo.selectedClient);
  const user = useSelector((state: any) => state.sessionInfo.user);
  const isAdmin = user?.role === 'admin';

  // Loading state
  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold font-montserrat text-brand-teal mb-20">{tenant?.name}</h1>
      {/* Guarantees */}
      <GuaranteesModal tenantId={tenantId} />
      {/* Secure Score */}
      <CompanySecureScore tenantId={tenantId} />
      {/* Microsoft secure score */}
      <MicrosoftScores tenantId={tenantId} />
      {/* Identities & People Widgets */}
      <p className="font-montserrat text-brand-teal m-auto flex justify-center mb-6 text-xl font-bold">
        Identities and People
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
        {identitiesAndPeopleWidgets.map((widget: WidgetModel, index) => {
          const manualWidget = manWidgets?.find((widg: any) => widg.widgetName === widget.id);
          let apiParams;
          let onClickParam;
          switch (widget.id) {
            case 'microsoft365Admins':
              apiParams = { tenantId };
              onClickParam = tenantId;
              break;
            case 'riskySignInPolicies':
              apiParams = {
                tenantId,
              };
              onClickParam = tenantId;
              break;
            case 'trustedLocations':
              apiParams = {
                userId: user.id,
                tenantId,
              };
              onClickParam = tenantId;
              break;
            case 'phishResistantMFA':
              apiParams = {
                tenantId,
              };
              onClickParam = tenantId;
              break;
            // future cases:
            // case 'someOtherWidget':
            //   apiParams = { tenantId, region: 'US' };
            //   break;
            default:
              apiParams = tenantId;
          }
          return (
            <Widget
              key={`${widget.id}-${index}`}
              id={widget.id}
              title={widget.title}
              hideButton={widget.hideButton}
              buttonText={widget.buttonText}
              apiCall={widget.apiCall}
              apiParams={apiParams}
              render={widget.render}
              onButtonClick={widget.onButtonClick}
              onClickParam={onClickParam}
              manualToggle={widget.manual}
              implemented={manualWidget ? manualWidget.isEnabled : false}
              isApplicable={manualWidget ? manualWidget.isApplicable : true}
              widgetId={manualWidget ? manualWidget.widgetId : ''}
              manualLoading={manLoading}
              tenantId={tenantId}
              fetchManualWidgets={fetchManualWidgets}
              isAdmin={isAdmin}
            >
              {widget.content}
            </Widget>
          );
        })}
      </div>
      {/* 🧩 Line Break */}
      <div className="w-full h-px bg-brand-teal my-20" />
      {/* End User Devices Widgets */}
      <p className="font-montserrat text-brand-teal m-auto flex justify-center mb-6 text-xl font-bold">
        Devices and Infrastructure
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
        {endUserDevicesWidgets.map((widget: WidgetModel, index) => {
          const manualWidget = manWidgets?.find((widg: any) => widg.widgetName === widget.id);
          let apiParams;
          let onClickParam;
          switch (widget.id) {
            case 'noEncryption':
              apiParams = {
                tenantId,
              };
              onClickParam = tenantId;
              break;
            case 'compliancePolicies':
              apiParams = {
                tenantId,
              };
              onClickParam = tenantId;
              break;
            default:
              apiParams = tenantId;
          }
          return (
            <Widget
              key={`${widget.id}-${index}`}
              id={widget.id}
              title={widget.title}
              hideButton={widget.hideButton}
              buttonText={widget.buttonText}
              apiCall={widget.apiCall}
              apiParams={apiParams}
              render={widget.render}
              onButtonClick={widget.onButtonClick}
              onClickParam={onClickParam}
              manualToggle={widget.manual}
              implemented={manualWidget ? manualWidget.isEnabled : false}
              isApplicable={manualWidget ? manualWidget.isApplicable : true}
              widgetId={manualWidget ? manualWidget.widgetId : ''}
              manualLoading={manLoading}
              tenantId={tenantId}
              fetchManualWidgets={fetchManualWidgets}
              isAdmin={isAdmin}
            >
              {widget.content}
            </Widget>
          );
        })}
      </div>
      {/* 🧩 Line Break */}
      <div className="w-full h-px bg-brand-teal my-20" />
      {/* Data Widgets */}
      <p className="font-montserrat text-brand-teal m-auto flex justify-center mb-6 text-xl font-bold">Data</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 place-items-center">
        {dataWidgets.map((widget: WidgetModel, index) => {
          const manualWidget = manWidgets?.find((widg: any) => widg.widgetName === widget.id);
          let apiParams;
          switch (widget.id) {
            case 'microsoft365Admins':
              apiParams = { tenantId };
              break;
            default:
              apiParams = tenantId;
          }
          return (
            <Widget
              key={`${widget.id}-${index}`}
              id={widget.id}
              title={widget.title}
              hideButton={widget.hideButton}
              buttonText={widget.buttonText}
              apiCall={widget.apiCall}
              apiParams={apiParams}
              render={widget.render}
              manualToggle={widget.manual}
              implemented={manualWidget ? manualWidget.isEnabled : false}
              isApplicable={manualWidget ? manualWidget.isApplicable : true}
              widgetId={manualWidget ? manualWidget.widgetId : ''}
              manualLoading={manLoading}
              tenantId={tenantId}
              fetchManualWidgets={fetchManualWidgets}
              isAdmin={isAdmin}
            >
              {widget.content}
            </Widget>
          );
        })}
      </div>
      {/* 🧩 Line Break */}
      <div className="w-full h-px bg-brand-teal my-20" />

      {/* Analyst Comments */}
      {/* <AnalystComments
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
            /> */}
    </div>
  );
};

export default CompanyDetails;
