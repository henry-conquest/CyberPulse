import { identitiesAndPeopleWidgets, endUserDevicesWidgets, dataWidgets } from '@/config/widgetConfig';

export const getManualWidgets = (): WidgetModel[] => {
  const allWidgets = [...identitiesAndPeopleWidgets, ...endUserDevicesWidgets, ...dataWidgets];

  return allWidgets.filter((widget: WidgetModel) => !widget.apiCall);
};
