import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { ViewType } from '../types';
import { CalendarDays, List } from 'lucide-react';

const ViewToggle = () => {
  const { t } = useTranslation();
  const { view, setView } = useAppContext();

  const handleViewChange = (selectedView: ViewType) => {
    setView(selectedView);
  };

  return (
    <div className="view-toggle flex bg-black/5 rounded-full p-0.5 overflow-hidden">
      <div
        className={`view-toggle-button px-3 py-1.5 rounded-full cursor-pointer text-[13px] flex items-center ${
          view === 'daily'
            ? 'bg-white text-accent'
            : 'text-text-secondary'
        }`}
        onClick={() => handleViewChange('daily')}
      >
        <List className="w-3.5 h-3.5 mr-1.5" />
        {t('daily')}
      </div>
      <div
        className={`view-toggle-button px-3 py-1.5 rounded-full cursor-pointer text-[13px] flex items-center ${
          view === 'monthly'
            ? 'bg-white text-accent'
            : 'text-text-secondary'
        }`}
        onClick={() => handleViewChange('monthly')}
      >
        <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
        {t('monthly')}
      </div>
    </div>
  );
};

export default ViewToggle;
