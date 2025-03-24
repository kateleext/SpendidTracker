import { useTranslation } from 'react-i18next';
import { useAppContext } from '../context/AppContext';
import { ViewType } from '../types';
import { CalendarDays, List } from 'lucide-react';

const ViewToggle = () => {
  const { t } = useTranslation();
  const { view, setView } = useAppContext();

  const handleViewChange = (selectedView: ViewType) => {
    console.log(`ViewToggle: changing view from ${view} to ${selectedView}`);
    if (view !== selectedView) {
      setView(selectedView);
    }
  };

  return (
    <div className="view-toggle flex bg-black/5 rounded-full p-0.5 overflow-hidden">
      <button
        className={`view-toggle-button px-3 py-1.5 rounded-full cursor-pointer text-[13px] flex items-center transition-all ${
          view === 'daily'
            ? 'bg-white text-accent shadow'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => handleViewChange('daily')}
        type="button"
        aria-pressed={view === 'daily'}
      >
        <List className="w-3.5 h-3.5 mr-1.5" />
        {t('daily')}
      </button>
      <button
        className={`view-toggle-button px-3 py-1.5 rounded-full cursor-pointer text-[13px] flex items-center transition-all ${
          view === 'monthly'
            ? 'bg-white text-accent shadow'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => handleViewChange('monthly')}
        type="button"
        aria-pressed={view === 'monthly'}
      >
        <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
        {t('monthly')}
      </button>
    </div>
  );
};

export default ViewToggle;
