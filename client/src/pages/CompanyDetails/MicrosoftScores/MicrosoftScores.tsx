import Widget from '@/components/ui/Widget';
import { scoresWidgets } from '@/config/widgetConfig';
import { format } from 'date-fns';
import { useSelector } from 'react-redux';

interface MicrosoftScoresProps {
  tenantId: string;
}

const MicrosoftScores = (props: MicrosoftScoresProps) => {
  const { tenantId } = props;
  const user = useSelector((state: any) => state.sessionInfo.user);
  const apiParams = {
    userId: user.id,
    tenantId,
  };
  return (
    <div className="border border-brand-teal p-5 rounded flex flex-col items-center mb-20 pb-0">
      <h1 data-testid="secure-score-heading" className="text-brand-green text-3xl font-bold mr-6">
        Microsoft Secure Scores
      </h1>
      <div className="flex p-6">
        {scoresWidgets.map((widget: WidgetModel, index) => {
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
              onClickParam={tenantId}
              tenantId={tenantId}
            />
          );
        })}
      </div>
    </div>
  );
};

export default MicrosoftScores;
