import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { identitiesAndPeopleActions, endUserDevicesActions, cloudAndInfrastructureActions } from '@/store/store';
import { useDispatch } from 'react-redux';

interface WidgetProps {
  id: string
  title: string;
  buttonText?: string;
  onButtonClick?: (param?: any) => void;
  onClickParam?: string;
  hideButton?: boolean;
  apiCall?: (param?: any) => Promise<any>;
  apiParam?: any
  render?: (data: any) => React.ReactNode;
  children?: any
}

const Widget = (props: WidgetProps) => {
  const { title, buttonText = 'View Details', onButtonClick, hideButton = false, apiCall, render, children, apiParam, id, onClickParam } = props;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(!!apiCall);
  const dispatch = useDispatch()

  useEffect(() => {
    const fetchData = async () => {
      if (!apiCall) return;
      try {
        const result = await apiCall(apiParam);
        setData(result);
        if(id === 'knownLocationLogins') dispatch(identitiesAndPeopleActions.setKnownLocations(result))
        if(id === 'phishResistantMFA') dispatch(identitiesAndPeopleActions.setPhishResistantMFA(result))
        if(id === 'noEncryption') dispatch(endUserDevicesActions.setNoEncryption(result))
        if(id === 'compliancePolicies') dispatch(endUserDevicesActions.setCompliancePolicies(result))
        if(id === 'microsoftSecureScore') dispatch(cloudAndInfrastructureActions.setSecureScores(result))
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

  return (
    <div className="border border-brand-teal rounded p-4 flex flex-col justify-between items-center w-72 h-64 max-h-[250px]">
      {/* Title */}
      <h2 className="text-brand-green text-lg font-bold mb-2 text-center whitespace-nowrap">
        {title}
      </h2>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center w-full">
        {loading ? (
          <div className="w-6 h-6 border-2 border-brand-teal border-t-transparent rounded-full animate-spin"></div>
        ) : (
          render ? render(data) : children
        )}
      </div>

      {/* Optional Button */}
      <div className="mt-4 h-10 w-full">
        {!hideButton && (
          <Button className="bg-brand-teal w-full h-10 hover:bg-brand-teal/90" onClick={handleClick}>
            {buttonText}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Widget;
