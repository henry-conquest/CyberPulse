interface WidgetModel {
  id: string;
  title: string;
  hideButton: boolean;
  render?: any;
  apiCall?: any;
  apiParam?: any;
  buttonText?: string;
  content?: any;
  onButtonClick?: any;
  manual?: boolean;
}
