import { useTranslation } from 'react-i18next';
import { ViewType } from '../types';
import { CalendarDays, List } from 'lucide-react';

interface ViewToggleProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const ViewToggle = ({ activeView, onViewChange }: ViewToggleProps) => {
  const { t } = useTranslation();

  const handleViewChange = (selectedView: ViewType) => {
    console.log(`ViewToggle: changing view from ${activeView} to ${selectedView}`);
    if (activeView !== selectedView) {
      onViewChange(selectedView);
    }
  };

  return (
    <div className="view-toggle flex bg-black/5 rounded-full p-0.5 overflow-hidden">
      <button
        className={`view-toggle-button px-3 py-1.5 rounded-full cursor-pointer text-[13px] flex items-center transition-all ${
          activeView === 'daily'
            ? 'bg-white text-accent shadow'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => handleViewChange('daily')}
        type="button"
        aria-pressed={activeView === 'daily'}
      >
        <List className="w-3.5 h-3.5 mr-1.5" />
        {t('daily')}
      </button>
      <button
        className={`view-toggle-button px-3 py-1.5 rounded-full cursor-pointer text-[13px] flex items-center transition-all ${
          activeView === 'monthly'
            ? 'bg-white text-accent shadow'
            : 'text-gray-500 hover:text-gray-700'
        }`}
        onClick={() => handleViewChange('monthly')}
        type="button"
        aria-pressed={activeView === 'monthly'}
      >
        <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
        {t('monthly')}
      </button>
    </div>
  );
};

export default ViewToggle;
