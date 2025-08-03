import {
  identitiesAndPeopleWidgets,
  endUserDevicesWidgets,
  cloudAndInfrastructureWidgets,
  dataWidgets,
} from "@/config/widgetConfig";

export const getManualWidgets = (): WidgetModel[] => {
  const allWidgets = [
    ...identitiesAndPeopleWidgets,
    ...endUserDevicesWidgets,
    ...cloudAndInfrastructureWidgets,
    ...dataWidgets,
  ];

  return allWidgets.filter((widget: WidgetModel) => !widget.apiCall);
};
