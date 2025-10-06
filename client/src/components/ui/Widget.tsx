import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { identitiesAndPeopleActions, endUserDevicesActions, devicesAndInfrastructureActions, manualWidgetsActions, scoresActions } from '@/store/store';
import { useDispatch } from 'react-redux';
import { Switch } from '@/components/ui/switch';
import { BadgeAlert, Check } from 'lucide-react';
import { updateManualWidget } from '@/service/ManualWidgetsService';

interface WidgetProps {
  id: string
  title: string;
  buttonText?: string;
  onButtonClick?: (param?: any) => void;
  onClickParam?: string;
  hideButton?: boolean;
  apiCall?: (param?: any) => Promise<any>;
  apiParams?: any
  render?: (data: any) => React.ReactNode;
  children?: any
  manualToggle?: boolean
  implemented?: boolean
  tenantId: string
  manualLoading?: boolean
  widgetId?: string
  fetchManualWidgets?: any
  isAdmin?: boolean
}

const Widget = (props: WidgetProps) => {
  const { title, buttonText = 'View Details', onButtonClick, hideButton = false, apiCall, render, children, apiParams, id, onClickParam, manualToggle = false, implemented = false, manualLoading, widgetId, tenantId, fetchManualWidgets, isAdmin} = props;

  const [data, setData] = useState<any>(null);
  const [toggleUpdating, setToggleUpdating] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(!!apiCall);
  const dispatch = useDispatch()

  const handleToggleChange = async (val: boolean) => {
    if(tenantId && widgetId) {
      setToggleUpdating(true)
      await updateManualWidget(tenantId, widgetId, val)
      await fetchManualWidgets()
      setToggleUpdating(false)
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!apiCall) return;
      try {
        const result = await apiCall(apiParams);
        setData(result);
        switch (id) {
          case 'microsoft365Admins' :
            dispatch(identitiesAndPeopleActions.setM365Admins(result))
            break
          case 'riskySignInPolicies' :
            dispatch(identitiesAndPeopleActions.setSignInPolicies(result.policies))
            break
          case 'trustedLocations' :
            dispatch(identitiesAndPeopleActions.setKnownLocations(result))
            break
          case 'phishResistantMFA' :
            dispatch(identitiesAndPeopleActions.setPhishResistantMFA(result))
            break
          case 'noEncryption' :
            dispatch(devicesAndInfrastructureActions.setEncryption(result))
            break
          case 'compliancePolicies' :
            dispatch(devicesAndInfrastructureActions.setCompliancePolicies(result))
            break
          case 'microsoftSecureScore' :
            dispatch(devicesAndInfrastructureActions.setSecureScores(result))
            break
          case 'identityScores' :
            dispatch(scoresActions.setIdentityScores(result))
            break
          case 'dataScores' :
            dispatch(scoresActions.setDataScores(result))
            break
          case 'appScores' :
            dispatch(scoresActions.setAppScores(result))
            break
          default:
            dispatch(manualWidgetsActions.setManualWidgets(result))
        }
      } catch (err) {
        console.error('Widget API call failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [apiCall]);

  const handleClick = async () => {
    if (onButtonClick && onClickParam) {
      onButtonClick(onClickParam)
    }
    if (onButtonClick && !onClickParam) {
      onButtonClick()
    }
  };

  const isScoreWidget = ['identityScores', 'dataScores', 'microsoftSecureScore'].includes(id);

  return (
    <div className={`border border-brand-teal rounded p-4 flex flex-col justify-between items-center w-72 h-64 max-h-[250px] ${isScoreWidget ? 'score-widget' : ''}`}>
      <h2 className="text-brand-green text-lg font-bold mb-2 text-center whitespace-nowrap">
        {title} {(manualToggle && isAdmin) && <p className="text-xs text-gray-500">(Manual)</p>}
      </h2>

      {/* Main Content */}
     <div className="flex-1 flex items-center justify-center w-full">
      {(loading) && (
        <div className="w-6 h-6 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      )}
      {(manualToggle && manualLoading) && (
        <div className="w-6 h-6 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
      )}

      {!loading && (render ? render(data) : children)}

      {(manualToggle && !manualLoading) && (
        implemented ? (
          <div className="bg-brand-green rounded-full p-4">
            <Check className="text-white" size={32} />
          </div>
        ) : (
          <div className="bg-red-500 rounded-full p-4">
            <BadgeAlert className="text-white" size={32} />
          </div>
        )
      )}
    </div>


    {/* Manual Toggle */}
    {manualToggle && !loading && isAdmin && (
      <div className="flex items-center justify-between w-full mt-2 text-sm">
        <span>Implemented</span>
        <Switch disabled={toggleUpdating} checked={implemented} onCheckedChange={handleToggleChange} />
      </div>
    )}

    {/* Optional Button */}
    {!hideButton && (
      <div className="mt-4 h-10 w-full">
        <Button className="bg-brand-teal w-full h-10 hover:bg-brand-teal/90" onClick={handleClick}>
          {buttonText}
        </Button>
      </div>
    )}
  </div>
  );
};

export default Widget;
